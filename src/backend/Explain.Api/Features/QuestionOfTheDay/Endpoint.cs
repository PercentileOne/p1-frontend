using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Anthropic;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.QuestionOfTheDay;

/// <summary>
/// Question of the Day, the first content type of the agent-driven feed (docs/specs/agent-driven-feed.md, 2026-10-18).
/// One multiple-choice question a day, about the person's own career, answered by tapping a card on the WORK tab. It reuses the Learn Alerts question generator,
/// so it needs no outside sources: the questions are ours and the card says so. The correct answer is never sent until the person has answered.
/// Stored in the "planning" container (partition /userId): "qotd:{date}" holds the day's question and answer, "qotd-topic" holds a topic the person chose themselves.
/// Private to the signed-in person.
/// </summary>
public static class Endpoint
{
    public const int MaxTopic = 80;
    private const int RecentToAvoid = 10;
    private const string TopicDocId = "qotd-topic";

    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/question-of-the-day").RequireAuthorization(Permissions.PracticeInterview).WithTags("QuestionOfTheDay");

        // Today's question. Made on the first ask of the day and kept, so reloading never changes it. `date` is the person's own local date.
        group.MapGet("", async (string? date, HttpContext ctx, CosmosService cosmos, AnthropicService anthropic, ILoggerFactory loggers, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var day = ResolveDay(date, DateTime.UtcNow);
            if (day is null) return Results.BadRequest(new { error = "That date is not close enough to today." });
            var key = day.Value.ToString("yyyy-MM-dd");

            var days = await LoadDaysAsync(cosmos, userId, ct);
            var today = days.FirstOrDefault(d => d.date == key);
            if (today is null)
            {
                var topic = await ResolveTopicForAsync(cosmos, userId, ct);
                if (topic is null) return Results.Ok(Reply(null, days, day.Value, needsTopic: true));

                var avoid = days.OrderByDescending(d => d.date).Take(RecentToAvoid).Select(d => d.questionText).ToList();
                var generated = await LearnAlerts.Endpoint.GenerateQuestionAsync(anthropic, topic, "Pro", [], loggers.CreateLogger("QuestionOfTheDay"), avoid);
                if (generated is null) return Results.Json(new { error = "Today's question could not be made just now. Try again in a minute." }, statusCode: 503);

                today = new QuestionDay("qotd:" + key, userId, "qotd", key, topic, generated.Value.Question, generated.Value.Options, generated.Value.CorrectIndex, null, null, null, DateTimeOffset.UtcNow.ToString("o"));
                await cosmos.GetContainer("planning").UpsertItemAsync(today, new PartitionKey(userId), cancellationToken: ct);
                days.Add(today);
            }
            return Results.Ok(Reply(today, days, day.Value, needsTopic: false));
        });

        // Record the answer. Answering twice keeps the first answer.
        group.MapPost("/answer", async (AnswerRequest req, string? date, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var day = ResolveDay(date, DateTime.UtcNow);
            if (day is null) return Results.BadRequest(new { error = "That date is not close enough to today." });
            if (req.Choice is not (>= 0 and <= 3)) return Results.BadRequest(new { error = "Choose one of the four answers." });
            var key = day.Value.ToString("yyyy-MM-dd");

            var days = await LoadDaysAsync(cosmos, userId, ct);
            var today = days.FirstOrDefault(d => d.date == key);
            if (today is null) return Results.NotFound();
            if (today.answeredAt is null)
            {
                var saved = today with { answeredAt = DateTimeOffset.UtcNow.ToString("o"), selectedIndex = req.Choice, isCorrect = req.Choice == today.correctIndex };
                await cosmos.GetContainer("planning").UpsertItemAsync(saved, new PartitionKey(userId), cancellationToken: ct);
                days[days.IndexOf(today)] = saved;
                today = saved;
            }
            return Results.Ok(Reply(today, days, day.Value, needsTopic: false));
        });

        // The topic the person chose. Blank clears it, so the topic goes back to following their practice and profile.
        group.MapPut("/topic", async (TopicRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var topic = CleanTopic(req.Topic);
            var container = cosmos.GetContainer("planning");
            if (topic is null)
            {
                try { await container.DeleteItemAsync<TopicDoc>(TopicDocId, new PartitionKey(userId), cancellationToken: ct); }
                catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* already clear */ }
                return Results.Ok(new { topic = (string?)null });
            }
            await container.UpsertItemAsync(new TopicDoc(TopicDocId, userId, "qotd-topic", topic, DateTimeOffset.UtcNow.ToString("o")), new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(new { topic });
        });

        // Changing the topic mid-day swaps today's question, as long as it has not been answered.
        group.MapDelete("/today", async (string? date, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var day = ResolveDay(date, DateTime.UtcNow);
            if (day is null) return Results.BadRequest(new { error = "That date is not close enough to today." });
            var key = day.Value.ToString("yyyy-MM-dd");
            var container = cosmos.GetContainer("planning");
            try
            {
                var doc = (await container.ReadItemAsync<QuestionDay>("qotd:" + key, new PartitionKey(userId), cancellationToken: ct)).Resource;
                if (doc.answeredAt is not null) return Results.Conflict(new { error = "Today's question has been answered." });
                await container.DeleteItemAsync<QuestionDay>(doc.id, new PartitionKey(userId), cancellationToken: ct);
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* nothing to swap */ }
            return Results.NoContent();
        });
    }

    // ---- pure rules (tested) ----

    /// <summary>The person's local date, accepted only within a day of the server's UTC date so a clock far off cannot invent days.</summary>
    public static DateOnly? ResolveDay(string? date, DateTime utcNow)
    {
        var serverToday = DateOnly.FromDateTime(utcNow);
        if (string.IsNullOrWhiteSpace(date)) return serverToday;
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var d)) return null;
        return Math.Abs(d.DayNumber - serverToday.DayNumber) <= 1 ? d : null;
    }

    public static string? CleanTopic(string? topic)
    {
        var t = (topic ?? "").Trim();
        if (t.Length == 0) return null;
        return t.Length > MaxTopic ? t[..MaxTopic].Trim() : t;
    }

    /// <summary>First usable topic, most deliberate first: their own choice, the role they set a Learn Alert for, their job title or role, the role they dream of.</summary>
    public static string? ResolveTopic(string? chosen, string? alertRole, string? jobTitle, string? jobRole, string? dreamRole)
    {
        foreach (var candidate in new[] { chosen, alertRole, jobTitle, jobRole, dreamRole })
            if (CleanTopic(candidate) is { } t) return t;
        return null;
    }

    /// <summary>Consecutive days answered, ending today, or ending yesterday while today is still waiting (so a streak is not lost until the day is over).</summary>
    public static int Streak(IEnumerable<string> answeredDates, DateOnly today)
    {
        var set = new HashSet<DateOnly>();
        foreach (var s in answeredDates) if (DateOnly.TryParseExact(s, "yyyy-MM-dd", out var d)) set.Add(d);
        var cursor = set.Contains(today) ? today : today.AddDays(-1);
        var count = 0;
        while (set.Contains(cursor)) { count++; cursor = cursor.AddDays(-1); }
        return count;
    }

    // ---- storage and shaping ----

    public static QuestionReply Reply(QuestionDay? q, List<QuestionDay> days, DateOnly today, bool needsTopic)
    {
        var answered = days.Where(d => d.answeredAt is not null).ToList();
        var streak = Streak(answered.Select(d => d.date), today);
        var done = q?.answeredAt is not null;
        return new QuestionReply(
            needsTopic,
            q?.date,
            q?.topic,
            q?.questionText,
            q?.options,
            done,
            done ? q!.selectedIndex : null,
            done ? q!.correctIndex : null,
            done ? q!.isCorrect : null,
            streak,
            answered.Count,
            answered.Count(d => d.isCorrect == true));
    }

    private static async Task<List<QuestionDay>> LoadDaysAsync(CosmosService cosmos, string userId, CancellationToken ct)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.type = 'qotd'");
        var list = new List<QuestionDay>();
        using var feed = cosmos.GetContainer("planning").GetItemQueryIterator<QuestionDay>(q, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });
        while (feed.HasMoreResults) list.AddRange(await feed.ReadNextAsync(ct));
        return list;
    }

    private static async Task<string?> ResolveTopicForAsync(CosmosService cosmos, string userId, CancellationToken ct)
    {
        var planning = cosmos.GetContainer("planning");
        string? chosen = null;
        try { chosen = (await planning.ReadItemAsync<TopicDoc>(TopicDocId, new PartitionKey(userId), cancellationToken: ct)).Resource.topic; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { }
        if (CleanTopic(chosen) is { } own) return own;

        string? alertRole = null;
        var aq = new QueryDefinition("SELECT TOP 1 VALUE c.jobTitle FROM c WHERE c.candidateId = @id AND c.status = 'active' ORDER BY c.createdAt DESC").WithParameter("@id", userId);
        using (var feed = cosmos.GetContainer("learnAlerts").GetItemQueryIterator<string>(aq, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) }))
            if (feed.HasMoreResults) alertRole = (await feed.ReadNextAsync(ct)).FirstOrDefault();

        string? jobTitle = null, jobRole = null, dream = null;
        try
        {
            var profile = (await cosmos.GetContainer("profiles").ReadItemAsync<Domain.Profile.UserProfile>(userId, new PartitionKey(userId), cancellationToken: ct)).Resource;
            jobTitle = profile.JobTitle; jobRole = profile.JobRole; dream = profile.DreamRoleTitle;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { }

        return ResolveTopic(null, alertRole, jobTitle, jobRole, dream);
    }

    private static string? UserId(HttpContext ctx) => ctx.User.FindFirst("sub")?.Value is { Length: > 0 } s ? s : null;

    public record QuestionDay(string id, string userId, string type, string date, string topic, string questionText, List<string> options, int correctIndex, string? answeredAt, int? selectedIndex, bool? isCorrect, string createdAt);
    public record TopicDoc(string id, string userId, string type, string topic, string updatedAt);
    public record AnswerRequest(int Choice);
    public record TopicRequest(string? Topic);
    // The reply never carries the correct answer until the question has been answered.
    public record QuestionReply(bool needsTopic, string? date, string? topic, string? question, List<string>? options, bool answered, int? selectedIndex, int? correctIndex, bool? isCorrect, int streak, int answeredTotal, int correctTotal);
}
