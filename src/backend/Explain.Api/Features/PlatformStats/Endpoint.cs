using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.PlatformStats;

/// <summary>
/// Admin-curated marketing stats ("80% of candidates feel unprepared for interviews —
/// LinkedIn, 2026") read live by the marketing site and every portal from one shared
/// endpoint, so updating a value once updates it everywhere instantly (Francis, 2026-09-10).
///
/// Seeded with well-sourced third-party research to launch immediately; the companion
/// ConfidenceSurvey endpoint below is the seed for eventually replacing/supplementing these
/// with TheInterviewChair's own live, growing candidate data — the same public endpoint will
/// blend that in once there's a meaningful sample size (see MinConfidenceSampleSize).
/// </summary>
public static class Endpoint
{
    // Below this many responses, showing a "confidence %" computed from our own candidates
    // would be more misleading than useful (a stat from 4 people isn't a stat) — the public
    // endpoint omits the live-data block entirely until this is cleared, rather than showing
    // a technically-real but statistically meaningless percentage.
    private const int MinConfidenceSampleSize = 100;
    private const int MinSurveySampleSize = 100;
    private static readonly System.Text.RegularExpressions.Regex SurveyKey =
        new("^[a-z0-9-]{1,60}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public static void Map(WebApplication app)
    {
        // Public — read by the marketing site (vanilla JS) and every portal (React) alike.
        // ?audience=candidate|recruiter|employer narrows to stats tagged for that portal (plus
        // untagged/"all" ones) — omitted, everything active is returned as before, so the
        // marketing site and older clients keep working unchanged.
        app.MapGet("/api/platform-stats", async (string? audience, CosmosService cosmos) =>
        {
            var stats = FilterByAudience(await GetActiveStatsAsync(cosmos), audience);
            var live = await TryGetLiveConfidenceStatAsync(cosmos);
            return Results.Ok(new { stats, liveConfidence = live });
        }).AllowAnonymous();

        // Admin — same permission bucket as the other small, infrequently-changed platform
        // toggles (Name Bank, LiveAvatar kill switch) in Features/PlatformSettings.
        app.MapGet("/api/admin/platform-stats", async (CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("platformStats");
            var query = new QueryDefinition("SELECT * FROM c ORDER BY c[\"order\"]");
            var results = new List<PlatformStatDoc>();
            using var feed = container.GetItemQueryIterator<PlatformStatDoc>(query);
            while (feed.HasMoreResults) results.AddRange(await feed.ReadNextAsync());
            return Results.Ok(results);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        app.MapPost("/api/admin/platform-stats", async (UpsertStatRequest req, CosmosService cosmos) =>
        {
            if (string.IsNullOrWhiteSpace(req.Id) || string.IsNullOrWhiteSpace(req.Label) || string.IsNullOrWhiteSpace(req.Value))
                return Results.BadRequest(new { error = "id, label and value are required" });

            var doc = new PlatformStatDoc(
                id: req.Id.Trim(),
                pk: "stat",
                label: req.Label.Trim(),
                value: req.Value.Trim(),
                sourceLabel: req.SourceLabel?.Trim(),
                sourceUrl: req.SourceUrl?.Trim(),
                breakdownLabel: req.BreakdownLabel?.Trim(),
                breakdown: req.Breakdown,
                order: req.Order,
                active: req.Active,
                updatedAt: DateTimeOffset.UtcNow,
                audience: string.IsNullOrWhiteSpace(req.Audience) ? null : req.Audience.Trim().ToLowerInvariant());

            var container = cosmos.GetContainer("platformStats");
            await container.UpsertItemAsync(doc, new PartitionKey("stat"));
            return Results.Ok(doc);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        app.MapDelete("/api/admin/platform-stats/{id}", async (string id, CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("platformStats");
            try
            {
                await container.DeleteItemAsync<PlatformStatDoc>(id, new PartitionKey("stat"));
                return Results.Ok();
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        // Candidate's own self-reported interview confidence — a single optional intake-screen
        // question (see InterviewPackStart.tsx). Not deduplicated per candidate: a genuine
        // re-answer (e.g. retaking the intake later) is rare enough, and low-stakes enough for
        // an aggregate trend stat, that the complexity of cross-partition dedup isn't worth it.
        // Rotating intake-screen survey (Francis, 2026-09-29): one question per intake, drawn
        // from a large bank kept in the frontend (surveyQuestions.ts) so wording can change
        // without a backend deploy — this endpoint just stores (questionId, answer). One row
        // per candidate per question (id = candidateId:questionId), so a re-answer overwrites
        // rather than double-counting.
        app.MapPost("/api/survey-response", async (SubmitSurveyRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();
            if (req.QuestionId is null || !SurveyKey.IsMatch(req.QuestionId))
                return Results.BadRequest(new { error = "invalid questionId" });
            if (req.AnswerId is null || !SurveyKey.IsMatch(req.AnswerId))
                return Results.BadRequest(new { error = "invalid answerId" });

            var doc = new SurveyResponseDoc(
                id: $"{candidateId}:{req.QuestionId}",
                questionId: req.QuestionId,
                answerId: req.AnswerId,
                candidateId: candidateId,
                countryCode: string.IsNullOrWhiteSpace(req.CountryCode) ? "unknown" : req.CountryCode.Trim().ToUpperInvariant(),
                createdAt: DateTimeOffset.UtcNow);

            await cosmos.GetContainer("surveyResponses").UpsertItemAsync(doc, new PartitionKey(req.QuestionId));
            return Results.Ok();
        }).RequireAuthorization(Permissions.StartInterview);

        // Public aggregate — a question only appears once it has MinSurveySampleSize responses
        // (same rule as the confidence stat: a percentage from 4 people isn't a stat).
        app.MapGet("/api/survey-results", async (CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("surveyResponses");
            var query = new QueryDefinition(
                "SELECT c.questionId, c.answerId, COUNT(1) AS n FROM c GROUP BY c.questionId, c.answerId");
            var rows = new List<SurveyCountRow>();
            using var feed = container.GetItemQueryIterator<SurveyCountRow>(query);
            while (feed.HasMoreResults) rows.AddRange(await feed.ReadNextAsync());

            var results = rows
                .GroupBy(r => r.questionId)
                .Select(g => new SurveyQuestionResult(
                    g.Key,
                    g.Sum(r => r.n),
                    g.Select(r => new SurveyAnswerCount(r.answerId, r.n)).OrderByDescending(a => a.count).ToList()))
                .Where(q => q.total >= MinSurveySampleSize)
                .ToList();
            return Results.Ok(new { questions = results });
        }).AllowAnonymous();

        app.MapPost("/api/confidence-survey", async (SubmitConfidenceRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();
            if (req.Response is not ("confident" or "not-confident"))
                return Results.BadRequest(new { error = "response must be 'confident' or 'not-confident'" });

            var countryCode = string.IsNullOrWhiteSpace(req.CountryCode) ? "unknown" : req.CountryCode.Trim().ToUpperInvariant();
            var doc = new ConfidenceSurveyDoc(
                id: Guid.NewGuid().ToString(),
                countryCode: countryCode,
                candidateId: candidateId,
                response: req.Response,
                createdAt: DateTimeOffset.UtcNow);

            var container = cosmos.GetContainer("confidenceSurvey");
            await container.CreateItemAsync(doc, new PartitionKey(countryCode));
            return Results.Ok();
        }).RequireAuthorization(Permissions.StartInterview);
    }

    // audience is a comma-separated list ("recruiter,employer"); null/empty/"all" = everyone.
    private static List<PlatformStatDoc> FilterByAudience(List<PlatformStatDoc> stats, string? audience)
    {
        if (string.IsNullOrWhiteSpace(audience)) return stats;
        var want = audience.Trim().ToLowerInvariant();
        return stats.Where(s =>
        {
            if (string.IsNullOrWhiteSpace(s.audience)) return true;
            var tags = s.audience.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            return tags.Contains("all") || tags.Contains(want);
        }).ToList();
    }

    private static async Task<List<PlatformStatDoc>> GetActiveStatsAsync(CosmosService cosmos)
    {
        var container = cosmos.GetContainer("platformStats");
        var query = new QueryDefinition("SELECT * FROM c WHERE c.active = true ORDER BY c[\"order\"]");
        var results = new List<PlatformStatDoc>();
        using var feed = container.GetItemQueryIterator<PlatformStatDoc>(query);
        while (feed.HasMoreResults) results.AddRange(await feed.ReadNextAsync());
        return results;
    }

    // Cross-partition by design (see confidenceSurvey's own partition-key comment) — this is
    // the one "every response, regardless of country" query that container exists to also
    // serve, alongside the cheaper per-country reads. Low volume for the foreseeable future,
    // so a full scan is fine; revisit with a pre-aggregated counter doc if this ever becomes
    // a real read-volume concern.
    private static async Task<LiveConfidenceStat?> TryGetLiveConfidenceStatAsync(CosmosService cosmos)
    {
        var container = cosmos.GetContainer("confidenceSurvey");
        var query = new QueryDefinition("SELECT c.response FROM c");
        var responses = new List<string>();
        using var feed = container.GetItemQueryIterator<ResponseOnly>(query);
        while (feed.HasMoreResults) responses.AddRange((await feed.ReadNextAsync()).Select(r => r.response));

        if (responses.Count < MinConfidenceSampleSize) return null;

        var notConfidentCount = responses.Count(r => r == "not-confident");
        var pct = (int)Math.Round(notConfidentCount * 100.0 / responses.Count);
        return new LiveConfidenceStat(pct, responses.Count);
    }

    private record ResponseOnly(string response);
}

public record UpsertStatRequest(
    string Id,
    string Label,
    string Value,
    string? SourceLabel,
    string? SourceUrl,
    string? BreakdownLabel,
    List<PlatformStatBreakdownItem>? Breakdown,
    int Order,
    bool Active,
    string? Audience = null);

public record PlatformStatDoc(
    string id,
    string pk,
    string label,
    string value,
    string? sourceLabel,
    string? sourceUrl,
    string? breakdownLabel,
    List<PlatformStatBreakdownItem>? breakdown,
    int order,
    bool active,
    DateTimeOffset updatedAt,
    string? audience = null);

public record PlatformStatBreakdownItem(string segment, string value);

public record SubmitSurveyRequest(string QuestionId, string AnswerId, string? CountryCode);

public record SurveyResponseDoc(
    string id,
    string questionId,
    string answerId,
    string candidateId,
    string countryCode,
    DateTimeOffset createdAt);

public record SurveyCountRow(string questionId, string answerId, int n);
public record SurveyAnswerCount(string answerId, int count);
public record SurveyQuestionResult(string questionId, int total, List<SurveyAnswerCount> answers);

public record SubmitConfidenceRequest(string Response, string? CountryCode);

// countryCode (not the old "pk") — must exactly match the container's real partition key path
// ("/countryCode", see CosmosService.cs's own registration) or every write throws Cosmos'
// "PartitionKey extracted from document doesn't match the one specified in the header" — found
// live 2026-09-18: this field really was misnamed "pk" since the endpoint was built, so every
// single confidence-survey submission has failed with a 500 (misread as a CORS error in the
// browser, since a 500 response drops the Access-Control-Allow-Origin header the preflight
// already promised) for as long as this endpoint has existed.
public record ConfidenceSurveyDoc(
    string id,
    string countryCode,
    string candidateId,
    string response,
    DateTimeOffset createdAt);

/// <summary>Percentage of TheInterviewChair's own candidates who reported NOT feeling
/// confident, computed live once MinConfidenceSampleSize is cleared.</summary>
public record LiveConfidenceStat(int notConfidentPct, int sampleSize);
