using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.YouTube;
using Microsoft.Azure.Cosmos;

namespace Explain.Api.Features.Talks.ProductivityVideos;

// "Success & Productivity" video search + a per-candidate pinned list — same shape as
// Features/Talks/TedTalks/Endpoint.cs (search/pin/unpin), copied-then-trimmed rather than
// shared: this isn't scoped to one official channel the way TED talks are, so it calls
// YouTubeService.SearchProductivityAsync instead, and it keeps its own pinned list (Cosmos doc
// id "{userId}:productivity" in the SAME "pinnedTalks" container, partition key /id) so pinning
// a productivity video never mixes into — or gets mixed into by — the separate TED pinned list.
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // GET /talks/productivity-videos/search?q=...&order=relevance|viewCount|date
        app.MapGet("/talks/productivity-videos/search", async (string? q, string? order, YouTubeService yt, CancellationToken ct) =>
        {
            var validOrder = order is "viewCount" or "date" ? order : "relevance";
            var results = await yt.SearchProductivityAsync(q, validOrder, maxResults: 15, ct);
            return Results.Ok(results);
        }).RequireAuthorization();

        // GET /api/pinned-productivity-videos — the caller's saved list, seeded on first-ever fetch.
        app.MapGet("/api/pinned-productivity-videos", async (HttpContext ctx, CosmosService cosmos, YouTubeService yt, CancellationToken ct) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            var docId = PinnedDocId(userId);

            var container = cosmos.GetContainer("pinnedTalks");
            try
            {
                var doc = await container.ReadItemAsync<PinnedVideosDoc>(docId, new PartitionKey(docId), cancellationToken: ct);
                return Results.Ok(doc.Resource.Videos);
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                var seed = await yt.SearchProductivityAsync(null, "viewCount", maxResults: 5, ct);
                var seeded = new PinnedVideosDoc(docId, seed);
                await container.UpsertItemAsync(seeded, new PartitionKey(docId), cancellationToken: ct);
                return Results.Ok(seeded.Videos);
            }
        }).RequireAuthorization();

        // POST /api/pinned-productivity-videos — add one video (no-op if already pinned).
        app.MapPost("/api/pinned-productivity-videos", async (TedTalkDto body, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            var docId = PinnedDocId(userId);

            var container = cosmos.GetContainer("pinnedTalks");
            List<TedTalkDto> videos;
            try
            {
                var doc = await container.ReadItemAsync<PinnedVideosDoc>(docId, new PartitionKey(docId), cancellationToken: ct);
                videos = doc.Resource.Videos;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                videos = [];
            }
            if (!videos.Any(v => v.Id == body.Id)) videos.Add(body);
            await container.UpsertItemAsync(new PinnedVideosDoc(docId, videos), new PartitionKey(docId), cancellationToken: ct);
            return Results.Ok(videos);
        }).RequireAuthorization();

        // DELETE /api/pinned-productivity-videos/{videoId}
        app.MapDelete("/api/pinned-productivity-videos/{videoId}", async (string videoId, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            var docId = PinnedDocId(userId);

            var container = cosmos.GetContainer("pinnedTalks");
            try
            {
                var doc = await container.ReadItemAsync<PinnedVideosDoc>(docId, new PartitionKey(docId), cancellationToken: ct);
                var videos = doc.Resource.Videos.Where(v => v.Id != videoId).ToList();
                await container.UpsertItemAsync(new PinnedVideosDoc(docId, videos), new PartitionKey(docId), cancellationToken: ct);
                return Results.Ok(videos);
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return Results.Ok(new List<TedTalkDto>());
            }
        }).RequireAuthorization();
    }

    private static string PinnedDocId(string userId) => $"{userId}:productivity";

    private record PinnedVideosDoc(string id, List<TedTalkDto> Videos);
}
