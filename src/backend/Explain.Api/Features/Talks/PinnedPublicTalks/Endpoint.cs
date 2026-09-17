using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Features.Talks;

namespace Explain.Api.Features.Talks.PinnedPublicTalks;

/// <summary>
/// Pin a fellow candidate's Public Talk to your own shelf (Francis, 2026-09-17 — "do you think
/// people will want to Pin/Save Public Talks to their own library"). Reuses the same "pinnedTalks"
/// Cosmos container as Features/Talks/TedTalks/Endpoint.cs's curated-video pinning — same small,
/// bounded personal-shelf shape — but a DIFFERENT document (id "pub:{userId}" vs that feature's
/// bare userId), so this never touches or migrates the existing TED-talks document at all.
///
/// Stores only (talkId, candidateId) refs, not a snapshot — GET re-fetches each real talk from
/// the "talks" container and re-runs Features.Talks.Endpoint.ToPublicSummary, so a pinned talk
/// always reflects its current state, including respecting the owner's own visibility toggle: if
/// they ever flip it back to Private, it silently drops out of everyone else's pinned list too,
/// same reversible-privacy principle interviews already follow.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/pinned-public-talks", async (HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var refs = await LoadRefs(cosmos, userId, ct);
            var talksContainer = cosmos.GetContainer("talks");
            var results = new List<PublicTalkSummary>();
            foreach (var r in refs)
            {
                try
                {
                    var doc = await talksContainer.ReadItemAsync<TalkEnvelope>(r.TalkId, new PartitionKey(r.CandidateId), cancellationToken: ct);
                    if (doc.Resource.isShared) // respect a since-changed privacy setting — see class doc above
                        results.Add(Explain.Api.Features.Talks.Endpoint.ToPublicSummary(doc.Resource));
                }
                catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
                {
                    // The talk was deleted since being pinned — just omit it, nothing to clean up
                    // eagerly here (the next pin/unpin write naturally drops stale refs too, see below).
                }
            }
            return Results.Ok(results);
        }).RequireAuthorization();

        app.MapPost("/api/pinned-public-talks", async (PinRequest body, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(body.TalkId) || string.IsNullOrWhiteSpace(body.CandidateId))
                return Results.BadRequest(new { error = "talkId and candidateId are required." });

            var refs = await LoadRefs(cosmos, userId, ct);
            if (!refs.Any(r => r.TalkId == body.TalkId))
                refs.Add(new PinnedTalkRef(body.TalkId, body.CandidateId));
            await SaveRefs(cosmos, userId, refs, ct);
            return Results.Ok(new { pinned = true });
        }).RequireAuthorization();

        app.MapDelete("/api/pinned-public-talks/{talkId}", async (string talkId, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var refs = await LoadRefs(cosmos, userId, ct);
            refs = refs.Where(r => r.TalkId != talkId).ToList();
            await SaveRefs(cosmos, userId, refs, ct);
            return Results.Ok(new { pinned = false });
        }).RequireAuthorization();
    }

    private static string DocId(string userId) => $"pub:{userId}";

    private static async Task<List<PinnedTalkRef>> LoadRefs(CosmosService cosmos, string userId, CancellationToken ct)
    {
        var container = cosmos.GetContainer("pinnedTalks");
        try
        {
            var doc = await container.ReadItemAsync<PinnedPublicTalksDoc>(DocId(userId), new PartitionKey(DocId(userId)), cancellationToken: ct);
            return doc.Resource.TalkRefs;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return [];
        }
    }

    private static async Task SaveRefs(CosmosService cosmos, string userId, List<PinnedTalkRef> refs, CancellationToken ct)
    {
        var container = cosmos.GetContainer("pinnedTalks");
        await container.UpsertItemAsync(new PinnedPublicTalksDoc(DocId(userId), refs), new PartitionKey(DocId(userId)), cancellationToken: ct);
    }

    public record PinRequest(string TalkId, string CandidateId);
    private record PinnedTalkRef(string TalkId, string CandidateId);
    // "pinnedTalks" container's partition key path is /id (each document IS its own partition,
    // keyed by its own id) — the "pub:" prefix here is what actually keeps this document
    // separate from TedTalks/Endpoint.cs's own PinnedTalksDoc(id: userId, ...), not the
    // partition key itself.
    private record PinnedPublicTalksDoc(string id, List<PinnedTalkRef> TalkRefs);
}
