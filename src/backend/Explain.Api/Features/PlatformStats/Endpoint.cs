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

    public static void Map(WebApplication app)
    {
        // Public — read by the marketing site (vanilla JS) and every portal (React) alike.
        app.MapGet("/api/platform-stats", async (CosmosService cosmos) =>
        {
            var stats = await GetActiveStatsAsync(cosmos);
            var live = await TryGetLiveConfidenceStatAsync(cosmos);
            return Results.Ok(new { stats, liveConfidence = live });
        }).AllowAnonymous();

        // Admin — same permission bucket as the other small, infrequently-changed platform
        // toggles (Name Bank, LiveAvatar kill switch) in Features/PlatformSettings.
        app.MapGet("/api/admin/platform-stats", async (CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("platformStats");
            var query = new QueryDefinition("SELECT * FROM c ORDER BY c.order");
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
                updatedAt: DateTimeOffset.UtcNow);

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
        app.MapPost("/api/confidence-survey", async (SubmitConfidenceRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();
            if (req.Response is not ("confident" or "not-confident"))
                return Results.BadRequest(new { error = "response must be 'confident' or 'not-confident'" });

            var countryCode = string.IsNullOrWhiteSpace(req.CountryCode) ? "unknown" : req.CountryCode.Trim().ToUpperInvariant();
            var doc = new ConfidenceSurveyDoc(
                id: Guid.NewGuid().ToString(),
                pk: countryCode,
                candidateId: candidateId,
                response: req.Response,
                createdAt: DateTimeOffset.UtcNow);

            var container = cosmos.GetContainer("confidenceSurvey");
            await container.CreateItemAsync(doc, new PartitionKey(countryCode));
            return Results.Ok();
        }).RequireAuthorization(Permissions.StartInterview);
    }

    private static async Task<List<PlatformStatDoc>> GetActiveStatsAsync(CosmosService cosmos)
    {
        var container = cosmos.GetContainer("platformStats");
        var query = new QueryDefinition("SELECT * FROM c WHERE c.active = true ORDER BY c.order");
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
    bool Active);

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
    DateTimeOffset updatedAt);

public record PlatformStatBreakdownItem(string segment, string value);

public record SubmitConfidenceRequest(string Response, string? CountryCode);

public record ConfidenceSurveyDoc(
    string id,
    string pk,
    string candidateId,
    string response,
    DateTimeOffset createdAt);

/// <summary>Percentage of TheInterviewChair's own candidates who reported NOT feeling
/// confident, computed live once MinConfidenceSampleSize is cleared.</summary>
public record LiveConfidenceStat(int notConfidentPct, int sampleSize);
