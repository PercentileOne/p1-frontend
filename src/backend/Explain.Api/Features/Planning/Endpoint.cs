using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Planning;

/// <summary>
/// Goals and reviews for the candidate portal's Routines &amp; Systems page (Francis, 2026-10-18).
/// GOALS: a short list of personal goals, each a card with a description, dates and a way to track it (a checklist of milestones, or a number such as "12 of 24 books"), plus dated progress notes.
/// REVIEWS: one saved review per person per period, for a weekly, monthly or yearly cadence. Each holds a looking-back snapshot, a few reflection answers, a free-text note and up to five priorities for the next period.
/// Private to the signed-in person; no other feature reads this container. Container "planning", partition /userId; document ids are "goal:{id}" and "review:{cadence}:{periodStart}".
/// </summary>
public static class Endpoint
{
    public const int MaxGoals = 50;
    public const int MaxMilestones = 30;
    public const int MaxUpdates = 200;
    public const int MaxTitle = 120;
    public const int MaxDescription = 1000;
    public const int MaxText = 200;
    public const int MaxNote = 500;
    public const int MaxReviewText = 2000;
    public const int MaxReviewNotes = 4000;
    public const int MaxPriorities = 5;
    public const int MaxInterviews = 50;
    public const int MaxFavourites = 200;
    public const int MaxFavouriteNote = 100;
    public const int MaxInterviewText = 120;

    private static readonly string[] Statuses = ["active", "paused", "completed"];
    private static readonly string[] Cadences = ["weekly", "monthly", "yearly"];

    public static void Map(WebApplication app)
    {
        var goals = app.MapGroup("/api/goals").RequireAuthorization(Permissions.PracticeInterview).WithTags("Goals");

        goals.MapGet("", async (HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var docs = await LoadGoalsAsync(cosmos, userId, ct);
            return Results.Ok(docs.Select(ToReply).OrderBy(g => StatusRank(g.status)).ThenBy(g => string.IsNullOrEmpty(g.targetDate) ? "9999-99-99" : g.targetDate, StringComparer.Ordinal).ToList());
        });

        goals.MapPost("", async (GoalRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var existing = await LoadGoalsAsync(cosmos, userId, ct);
            if (existing.Count >= MaxGoals) return Results.BadRequest(new { error = "That's the most goals you can hold. Complete or delete one first." });
            var now = DateTimeOffset.UtcNow.ToString("o");
            var shortId = NewId();
            var blank = new GoalDoc("goal:" + shortId, userId, "goal", "", "", "", "", "", "active", "milestones", [], null, null, null, [], now, now, null);
            var (doc, error) = Apply(blank, req);
            if (error is not null) return Results.BadRequest(new { error });
            await cosmos.GetContainer("planning").UpsertItemAsync(doc, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(ToReply(doc));
        });

        goals.MapPut("/{id}", async (string id, GoalRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var current = await LoadGoalAsync(cosmos, userId, id, ct);
            if (current is null) return Results.NotFound(new { error = "That goal was not found." });
            var (doc, error) = Apply(current, req);
            if (error is not null) return Results.BadRequest(new { error });
            await cosmos.GetContainer("planning").UpsertItemAsync(doc, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(ToReply(doc));
        });

        // A dated progress note. For a number goal, a value also moves the tracker.
        goals.MapPost("/{id}/updates", async (string id, UpdateRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var current = await LoadGoalAsync(cosmos, userId, id, ct);
            if (current is null) return Results.NotFound(new { error = "That goal was not found." });
            var note = Cut((req.note ?? "").Trim(), MaxNote);
            if (note.Length == 0 && req.value is null) return Results.BadRequest(new { error = "Write a note or enter a value." });
            if (current.updates.Count >= MaxUpdates) return Results.BadRequest(new { error = "That goal has the most progress notes it can hold." });
            var date = req.date is not null && TryDate(req.date, out _) ? req.date : DateTime.UtcNow.ToString("yyyy-MM-dd");
            var value = req.value is { } v && double.IsFinite(v) && v >= 0 ? v : (double?)null;
            var updates = current.updates.Append(new UpdateDto(date, note, value)).ToList();
            var currentValue = current.track == "number" && value is not null ? value : current.currentValue;
            var saved = current with { updates = updates, currentValue = currentValue, updatedAt = DateTimeOffset.UtcNow.ToString("o") };
            await cosmos.GetContainer("planning").UpsertItemAsync(saved, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(ToReply(saved));
        });

        goals.MapDelete("/{id}", async (string id, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            try { await cosmos.GetContainer("planning").DeleteItemAsync<GoalDoc>("goal:" + id, new PartitionKey(userId), cancellationToken: ct); }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }
            return Results.Ok(new { ok = true });
        });

        var reviews = app.MapGroup("/api/reviews").RequireAuthorization(Permissions.PracticeInterview).WithTags("Reviews");

        // The period that contains a date, with the saved review for it if there is one.
        reviews.MapGet("/period", async (string cadence, string date, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!Cadences.Contains(cadence)) return Results.BadRequest(new { error = "Choose weekly, monthly or yearly." });
            if (!TryDate(date, out var d)) return Results.BadRequest(new { error = "Use a date like 2026-10-18." });
            var (start, end) = Period(cadence, d);
            var saved = await LoadReviewAsync(cosmos, userId, cadence, start, ct);
            return Results.Ok(new PeriodReply(cadence, start.ToString("yyyy-MM-dd"), end.ToString("yyyy-MM-dd"), saved is null ? null : ToReply(saved)));
        });

        // Past reviews of one cadence, newest first.
        reviews.MapGet("", async (string cadence, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!Cadences.Contains(cadence)) return Results.BadRequest(new { error = "Choose weekly, monthly or yearly." });
            var q = new QueryDefinition("SELECT * FROM c WHERE c.userId = @u AND c.type = 'review' AND c.cadence = @c")
                .WithParameter("@u", userId).WithParameter("@c", cadence);
            var docs = new List<ReviewDoc>();
            try
            {
                using var feed = cosmos.GetContainer("planning").GetItemQueryIterator<ReviewDoc>(q, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });
                while (feed.HasMoreResults) docs.AddRange(await feed.ReadNextAsync(ct));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }
            return Results.Ok(docs.OrderByDescending(r => r.periodStart, StringComparer.Ordinal).Take(60).Select(ToReply).ToList());
        });

        // Save (create or replace) the review for the period that contains the date.
        reviews.MapPut("/{cadence}/{date}", async (string cadence, string date, ReviewRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!Cadences.Contains(cadence)) return Results.BadRequest(new { error = "Choose weekly, monthly or yearly." });
            if (!TryDate(date, out var d) || d.Year < 2024 || d.Year > 2100) return Results.BadRequest(new { error = "Use a date like 2026-10-18." });
            var (start, end) = Period(cadence, d);
            var existing = await LoadReviewAsync(cosmos, userId, cadence, start, ct);
            var now = DateTimeOffset.UtcNow.ToString("o");
            var doc = new ReviewDoc(
                "review:" + cadence + ":" + start.ToString("yyyy-MM-dd"), userId, "review", cadence,
                start.ToString("yyyy-MM-dd"), end.ToString("yyyy-MM-dd"),
                Math.Clamp(req.rating ?? 0, 0, 5),
                Cut((req.wentWell ?? "").Trim(), MaxReviewText), Cut((req.didntGoWell ?? "").Trim(), MaxReviewText),
                Cut((req.learned ?? "").Trim(), MaxReviewText), Cut((req.notes ?? "").Trim(), MaxReviewNotes),
                (req.priorities ?? []).Select(p => Cut((p ?? "").Trim(), MaxText)).Where(p => p.Length > 0).Take(MaxPriorities).ToList(),
                CleanLookBack(req.lookBack), existing?.createdAt ?? now, now);
            await cosmos.GetContainer("planning").UpsertItemAsync(doc, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(ToReply(doc));
        });

        // Interviews the person says are coming up (the dashboard's "Next interview"). Recruiter-sent preps already carry a date, so the portal merges those in itself.
        var ivs = app.MapGroup("/api/next-interviews").RequireAuthorization(Permissions.PracticeInterview).WithTags("NextInterviews");

        ivs.MapGet("", async (HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var docs = await LoadInterviewsAsync(cosmos, userId, ct);
            return Results.Ok(docs.OrderBy(i => i.date, StringComparer.Ordinal).Select(ToReply).ToList());
        });

        ivs.MapPost("", async (InterviewRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (req.date is null || !TryDate(req.date, out var d) || d.Year < 2024 || d.Year > 2100) return Results.BadRequest(new { error = "Choose the date of the interview." });
            var role = Cut((req.role ?? "").Trim(), MaxInterviewText);
            var company = Cut((req.company ?? "").Trim(), MaxInterviewText);
            var existing = await LoadInterviewsAsync(cosmos, userId, ct);
            // Starting two practice interviews for the same real interview must not list it twice.
            var same = existing.FirstOrDefault(i => i.date == req.date && string.Equals(i.role, role, StringComparison.OrdinalIgnoreCase) && string.Equals(i.company, company, StringComparison.OrdinalIgnoreCase));
            if (same is not null) return Results.Ok(ToReply(same));
            if (existing.Count >= MaxInterviews) return Results.BadRequest(new { error = "That's the most interviews you can list. Remove an old one first." });
            var now = DateTimeOffset.UtcNow.ToString("o");
            var doc = new InterviewDoc("interview:" + NewId(), userId, "interview", req.date, role, company, now, now);
            await cosmos.GetContainer("planning").UpsertItemAsync(doc, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(ToReply(doc));
        });

        ivs.MapPut("/{id}", async (string id, InterviewRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            InterviewDoc cur;
            try { cur = (await cosmos.GetContainer("planning").ReadItemAsync<InterviewDoc>("interview:" + id, new PartitionKey(userId), cancellationToken: ct)).Resource; }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return Results.NotFound(new { error = "That interview was not found." }); }
            var date = req.date ?? cur.date;
            if (!TryDate(date, out var d) || d.Year < 2024 || d.Year > 2100) return Results.BadRequest(new { error = "Choose the date of the interview." });
            var saved = cur with
            {
                date = date,
                role = req.role is null ? cur.role : Cut(req.role.Trim(), MaxInterviewText),
                company = req.company is null ? cur.company : Cut(req.company.Trim(), MaxInterviewText),
                updatedAt = DateTimeOffset.UtcNow.ToString("o"),
            };
            await cosmos.GetContainer("planning").UpsertItemAsync(saved, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(ToReply(saved));
        });

        ivs.MapDelete("/{id}", async (string id, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            try { await cosmos.GetContainer("planning").DeleteItemAsync<InterviewDoc>("interview:" + id, new PartitionKey(userId), cancellationToken: ct); }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }
            return Results.Ok(new { ok = true });
        });

        // Favourite days (the star on a Routines day): a short list of dates the person wants to be able to get back to, each with an optional note.
        // One small document per person, so listing them is one read.
        var favs = app.MapGroup("/api/favourite-days").RequireAuthorization(Permissions.PracticeInterview).WithTags("FavouriteDays");

        favs.MapGet("", async (HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var doc = await LoadFavouritesAsync(cosmos, userId, ct);
            return Results.Ok(doc.days.OrderByDescending(f => f.date, StringComparer.Ordinal).Select(f => new FavouriteReply(f.date, f.note)).ToList());
        });

        favs.MapPut("/{date}", async (string date, FavouriteRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!TryDate(date, out var d) || d.Year < 2000 || d.Year > 2100) return Results.BadRequest(new { error = "Use a date like 2026-10-18." });
            var doc = await LoadFavouritesAsync(cosmos, userId, ct);
            var note = Cut((req.note ?? "").Trim(), MaxFavouriteNote);
            var existing = doc.days.FirstOrDefault(f => f.date == date);
            if (existing is null && doc.days.Count >= MaxFavourites) return Results.BadRequest(new { error = "That's the most favourite days you can keep. Remove one first." });
            var days = doc.days.Where(f => f.date != date).Append(new FavouriteDto(date, note, existing?.createdAt ?? DateTimeOffset.UtcNow.ToString("o"))).ToList();
            await cosmos.GetContainer("planning").UpsertItemAsync(doc with { days = days, updatedAt = DateTimeOffset.UtcNow.ToString("o") }, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(new FavouriteReply(date, note));
        });

        favs.MapDelete("/{date}", async (string date, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var doc = await LoadFavouritesAsync(cosmos, userId, ct);
            var days = doc.days.Where(f => f.date != date).ToList();
            if (days.Count != doc.days.Count)
                await cosmos.GetContainer("planning").UpsertItemAsync(doc with { days = days, updatedAt = DateTimeOffset.UtcNow.ToString("o") }, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(new { ok = true });
        });
    }

    // ---- shapes (lower-case names on purpose: they are also the stored JSON) ----
    public record MilestoneDto(string? id, string? text, bool done);
    public record UpdateDto(string date, string note, double? value);
    public record GoalDoc(string id, string userId, string type, string title, string description, string category,
        string startDate, string targetDate, string status, string track, List<MilestoneDto> milestones,
        double? targetValue, double? currentValue, string? unit, List<UpdateDto> updates,
        string createdAt, string updatedAt, string? completedAt);
    public record GoalReply(string id, string title, string description, string category, string startDate, string targetDate,
        string status, string track, List<MilestoneDto> milestones, double? targetValue, double? currentValue, string? unit,
        List<UpdateDto> updates, int progress, string createdAt, string? completedAt);
    public record GoalRequest(string? title, string? description, string? category, string? startDate, string? targetDate,
        string? status, string? track, List<MilestoneDto>? milestones, double? targetValue, double? currentValue, string? unit);
    public record UpdateRequest(string? note, double? value, string? date);

    public record FavouriteDto(string date, string note, string createdAt);
    public record FavouriteDaysDoc(string id, string userId, string type, List<FavouriteDto> days, string updatedAt);
    public record FavouriteReply(string date, string note);
    public record FavouriteRequest(string? note);
    public record InterviewDoc(string id, string userId, string type, string date, string role, string company, string createdAt, string updatedAt);
    public record InterviewReply(string id, string date, string role, string company);
    public record InterviewRequest(string? date, string? role, string? company);

    public record LookBackDto(int essentialsDone, int essentialsTotal, int daysOpened, int daysAllEssentials, int practiceInterviews);
    public record ReviewDoc(string id, string userId, string type, string cadence, string periodStart, string periodEnd, int rating,
        string wentWell, string didntGoWell, string learned, string notes, List<string> priorities, LookBackDto? lookBack,
        string createdAt, string updatedAt);
    public record ReviewReply(string cadence, string periodStart, string periodEnd, int rating, string wentWell, string didntGoWell,
        string learned, string notes, List<string> priorities, LookBackDto? lookBack, string updatedAt);
    public record PeriodReply(string cadence, string periodStart, string periodEnd, ReviewReply? review);
    public record ReviewRequest(int? rating, string? wentWell, string? didntGoWell, string? learned, string? notes, List<string>? priorities, LookBackDto? lookBack);

    // ---- goals ----
    private static (GoalDoc doc, string? error) Apply(GoalDoc cur, GoalRequest req)
    {
        var title = req.title is null ? cur.title : Cut(req.title.Trim(), MaxTitle);
        if (title.Length == 0) return (cur, "Give the goal a title.");
        var description = req.description is null ? cur.description : Cut(req.description.Trim(), MaxDescription);
        var category = req.category is null ? cur.category : Cut(req.category.Trim(), 40);
        var start = req.startDate is null ? cur.startDate : req.startDate;
        var target = req.targetDate is null ? cur.targetDate : req.targetDate;
        if (start.Length > 0 && !TryDate(start, out _)) return (cur, "Use a start date like 2026-10-18.");
        if (target.Length > 0 && !TryDate(target, out _)) return (cur, "Use a target date like 2026-12-31.");
        if (start.Length > 0 && target.Length > 0 && string.CompareOrdinal(target, start) < 0) return (cur, "The target date can't be before the start date.");
        var status = req.status is null ? cur.status : req.status;
        if (!Statuses.Contains(status)) return (cur, "Status must be active, paused or completed.");
        var track = req.track is null ? cur.track : req.track;
        if (track is not ("milestones" or "number")) return (cur, "Track with milestones or a number.");

        var milestones = cur.milestones;
        if (req.milestones is not null)
        {
            if (req.milestones.Count > MaxMilestones) return (cur, "That's the most milestones one goal can hold.");
            milestones = req.milestones
                .Select(m => new MilestoneDto(string.IsNullOrWhiteSpace(m.id) ? NewId() : m.id, Cut((m.text ?? "").Trim(), MaxText), m.done))
                .Where(m => !string.IsNullOrEmpty(m.text)).ToList();
        }
        var targetValue = req.targetValue is { } tv && double.IsFinite(tv) && tv > 0 ? tv : (req.targetValue is null ? cur.targetValue : null);
        var currentValue = req.currentValue is { } cv && double.IsFinite(cv) && cv >= 0 ? cv : (req.currentValue is null ? cur.currentValue : null);
        var unit = req.unit is null ? cur.unit : Cut(req.unit.Trim(), 20);

        var now = DateTimeOffset.UtcNow.ToString("o");
        var completedAt = status == "completed" ? (cur.completedAt ?? now) : null;
        return (cur with
        {
            title = title, description = description, category = category, startDate = start, targetDate = target,
            status = status, track = track, milestones = milestones, targetValue = targetValue, currentValue = currentValue,
            unit = unit, updatedAt = now, completedAt = completedAt,
        }, null);
    }

    public static int Progress(GoalDoc g)
    {
        if (g.status == "completed") return 100;
        if (g.track == "number")
            return g.targetValue is > 0 ? (int)Math.Round(Math.Clamp((g.currentValue ?? 0) / g.targetValue.Value * 100, 0, 100)) : 0;
        return g.milestones.Count == 0 ? 0 : (int)Math.Round(100.0 * g.milestones.Count(m => m.done) / g.milestones.Count);
    }

    private static GoalReply ToReply(GoalDoc g) => new(
        g.id.StartsWith("goal:") ? g.id[5..] : g.id, g.title, g.description, g.category, g.startDate, g.targetDate, g.status, g.track,
        g.milestones, g.targetValue, g.currentValue, g.unit, g.updates, Progress(g), g.createdAt, g.completedAt);

    private static int StatusRank(string s) => s switch { "active" => 0, "paused" => 1, _ => 2 };

    private static async Task<List<GoalDoc>> LoadGoalsAsync(CosmosService cosmos, string userId, CancellationToken ct)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.userId = @u AND c.type = 'goal'").WithParameter("@u", userId);
        var docs = new List<GoalDoc>();
        try
        {
            using var feed = cosmos.GetContainer("planning").GetItemQueryIterator<GoalDoc>(q, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });
            while (feed.HasMoreResults) docs.AddRange(await feed.ReadNextAsync(ct));
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }
        return docs;
    }

    private static async Task<GoalDoc?> LoadGoalAsync(CosmosService cosmos, string userId, string id, CancellationToken ct)
    {
        try { return (await cosmos.GetContainer("planning").ReadItemAsync<GoalDoc>("goal:" + id, new PartitionKey(userId), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return null; }
    }

    // ---- reviews ----
    /// <summary>The period containing a date: a week runs Monday to Sunday, a month is the calendar month, a year is the calendar year.</summary>
    public static (DateOnly start, DateOnly end) Period(string cadence, DateOnly d)
    {
        switch (cadence)
        {
            case "monthly":
                var ms = new DateOnly(d.Year, d.Month, 1);
                return (ms, ms.AddMonths(1).AddDays(-1));
            case "yearly":
                return (new DateOnly(d.Year, 1, 1), new DateOnly(d.Year, 12, 31));
            default:
                var back = ((int)d.DayOfWeek + 6) % 7;
                var ws = d.AddDays(-back);
                return (ws, ws.AddDays(6));
        }
    }

    private static ReviewReply ToReply(ReviewDoc r) => new(r.cadence, r.periodStart, r.periodEnd, r.rating, r.wentWell, r.didntGoWell, r.learned, r.notes, r.priorities, r.lookBack, r.updatedAt);

    private static LookBackDto? CleanLookBack(LookBackDto? l) => l is null ? null :
        new LookBackDto(Math.Clamp(l.essentialsDone, 0, 100000), Math.Clamp(l.essentialsTotal, 0, 100000), Math.Clamp(l.daysOpened, 0, 366), Math.Clamp(l.daysAllEssentials, 0, 366), Math.Clamp(l.practiceInterviews, 0, 100000));

    private static async Task<ReviewDoc?> LoadReviewAsync(CosmosService cosmos, string userId, string cadence, DateOnly start, CancellationToken ct)
    {
        try { return (await cosmos.GetContainer("planning").ReadItemAsync<ReviewDoc>("review:" + cadence + ":" + start.ToString("yyyy-MM-dd"), new PartitionKey(userId), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return null; }
    }

    // ---- favourite days ----
    private static async Task<FavouriteDaysDoc> LoadFavouritesAsync(CosmosService cosmos, string userId, CancellationToken ct)
    {
        try { return (await cosmos.GetContainer("planning").ReadItemAsync<FavouriteDaysDoc>("favourite-days", new PartitionKey(userId), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return new FavouriteDaysDoc("favourite-days", userId, "favourites", [], DateTimeOffset.UtcNow.ToString("o")); }
    }

    // ---- upcoming interviews ----
    private static InterviewReply ToReply(InterviewDoc i) => new(i.id.StartsWith("interview:") ? i.id[10..] : i.id, i.date, i.role, i.company);

    private static async Task<List<InterviewDoc>> LoadInterviewsAsync(CosmosService cosmos, string userId, CancellationToken ct)
    {
        var q = new QueryDefinition("SELECT * FROM c WHERE c.userId = @u AND c.type = 'interview'").WithParameter("@u", userId);
        var docs = new List<InterviewDoc>();
        try
        {
            using var feed = cosmos.GetContainer("planning").GetItemQueryIterator<InterviewDoc>(q, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });
            while (feed.HasMoreResults) docs.AddRange(await feed.ReadNextAsync(ct));
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { }
        return docs;
    }

    // ---- helpers ----
    private static string? UserId(HttpContext ctx) => ctx.User.FindFirst("sub")?.Value is { Length: > 0 } s ? s : null;
    private static string NewId() => Guid.NewGuid().ToString("N")[..10];
    private static string Cut(string s, int max) => s.Length > max ? s[..max] : s;
    private static bool TryDate(string s, out DateOnly d) =>
        DateOnly.TryParseExact(s, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out d);
}
