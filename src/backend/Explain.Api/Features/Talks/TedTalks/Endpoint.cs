using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.YouTube;
using Microsoft.Azure.Cosmos;

namespace Explain.Api.Features.Talks.TedTalks;

// Real TED-talk search (scoped to TED's own YouTube channel) plus a per-candidate "pinned"
// list — a small, bounded personal shelf (start seeded with TED's top 5 all-time by real view
// count, so nobody opens an empty list) that survives across sessions/devices, unlike a
// localStorage-only favourite would.
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // GET /talks/ted-talks/search?q=...&order=relevance|viewCount|date
        app.MapGet("/talks/ted-talks/search", async (string? q, string? order, YouTubeService yt, CancellationToken ct) =>
        {
            var validOrder = order is "viewCount" or "date" ? order : "relevance";
            var results = await yt.SearchAsync(q, validOrder, maxResults: 15, ct);
            return Results.Ok(results);
        }).RequireAuthorization();

        // GET /api/pinned-talks — the caller's saved list, seeded on first-ever fetch.
        app.MapGet("/api/pinned-talks", async (HttpContext ctx, CosmosService cosmos, YouTubeService yt, CancellationToken ct) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("pinnedTalks");
            try
            {
                var doc = await container.ReadItemAsync<PinnedTalksDoc>(userId, new PartitionKey(userId), cancellationToken: ct);
                return Results.Ok(doc.Resource.Talks);
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                // First-ever visit for this candidate — seed with TED's real top 5 by view count
                // (a live API call, not hand-typed video ids, so the seed is always accurate).
                var seed = await yt.SearchAsync(null, "viewCount", maxResults: 5, ct);
                var seeded = new PinnedTalksDoc(userId, seed);
                await container.UpsertItemAsync(seeded, new PartitionKey(userId), cancellationToken: ct);
                return Results.Ok(seeded.Talks);
            }
        }).RequireAuthorization();

        // POST /api/pinned-talks — add one talk (no-op if already pinned).
        app.MapPost("/api/pinned-talks", async (TedTalkDto body, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("pinnedTalks");
            List<TedTalkDto> talks;
            try
            {
                var doc = await container.ReadItemAsync<PinnedTalksDoc>(userId, new PartitionKey(userId), cancellationToken: ct);
                talks = doc.Resource.Talks;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                talks = [];
            }
            if (!talks.Any(t => t.Id == body.Id)) talks.Add(body);
            await container.UpsertItemAsync(new PinnedTalksDoc(userId, talks), new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(talks);
        }).RequireAuthorization();

        // DELETE /api/pinned-talks/{videoId}
        app.MapDelete("/api/pinned-talks/{videoId}", async (string videoId, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("pinnedTalks");
            try
            {
                var doc = await container.ReadItemAsync<PinnedTalksDoc>(userId, new PartitionKey(userId), cancellationToken: ct);
                var talks = doc.Resource.Talks.Where(t => t.Id != videoId).ToList();
                await container.UpsertItemAsync(new PinnedTalksDoc(userId, talks), new PartitionKey(userId), cancellationToken: ct);
                return Results.Ok(talks);
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return Results.Ok(new List<TedTalkDto>());
            }
        }).RequireAuthorization();
    }

    private record PinnedTalksDoc(string id, List<TedTalkDto> Talks);
}
