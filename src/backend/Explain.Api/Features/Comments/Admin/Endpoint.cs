using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Features.Comments;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Comments.Admin;

/// <summary>
/// Admin review queue for reported comments. Talks to Cosmos directly — unlike Careers,
/// comments live entirely in Explain.Api, no separate Function App to proxy.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // GET /api/admin/comments/reported — every visible, reported comment across all
        // profiles, worst-first. Deliberately cross-partition — same trade-off already
        // accepted for Alerts' matching scan, fine at this platform's current scale.
        app.MapGet("/api/admin/comments/reported", async (CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("profile-comments");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.reportCount > 0 AND c.status = 'visible'");
            var reported = new List<ProfileComment>();
            using var feed = container.GetItemQueryIterator<ProfileComment>(query);
            while (feed.HasMoreResults)
                reported.AddRange(await feed.ReadNextAsync());

            var ordered = reported.OrderByDescending(c => c.reportCount).ThenByDescending(c => c.lastReportedAt);

            // Repeat-offender visibility without a formal ban system — see the Phase 2
            // plan's "Moderation scope decision" for why this is the chosen backstop.
            var byAuthor = reported
                .GroupBy(c => c.authorUserId)
                .Select(g => new { authorUserId = g.Key, authorName = g.First().authorName, reportedCommentCount = g.Count() })
                .OrderByDescending(a => a.reportedCommentCount);

            return Results.Ok(new { comments = ordered, repeatOffenders = byAuthor });
        }).RequireAuthorization(Permissions.ModerateContent);

        // POST /api/admin/comments/{id}/resolve?profileUserId=... — { action: "delete" | "dismiss" }
        app.MapPost("/api/admin/comments/{id}/resolve", async (string id, string profileUserId, ResolveRequest req, CosmosService cosmos) =>
        {
            if (req.Action is not ("delete" or "dismiss"))
                return Results.BadRequest(new { error = "action must be 'delete' or 'dismiss'." });

            var container = cosmos.GetContainer("profile-comments");
            ProfileComment existing;
            try
            {
                existing = await container.ReadItemAsync<ProfileComment>(id, new PartitionKey(profileUserId));
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }

            var updated = req.Action == "delete"
                ? existing with { status = "deleted" }
                : existing with { reportCount = 0, reportedByUserIds = [], lastReportedAt = null };

            await container.UpsertItemAsync(updated, new PartitionKey(profileUserId));
            return Results.Ok(updated);
        }).RequireAuthorization(Permissions.ModerateContent);
    }
}

public record ResolveRequest(string Action);
