using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Reactions;

/// <summary>
/// Generic viewer "like" on a piece of content. Only targetType "profile" is allowed for
/// now (see AllowedTargetTypes) — the allowlist exists so this doesn't silently become an
/// open reaction system for arbitrary strings before other content (posts, stories) is
/// actually real. Doc id is deterministic {targetType}:{targetId}:{userId}, so a toggle
/// is one idempotent point read + upsert-or-delete — no query-then-write race.
/// </summary>
public static class Endpoint
{
    private static readonly HashSet<string> AllowedTargetTypes = new(StringComparer.OrdinalIgnoreCase) { "profile" };

    public static void Map(WebApplication app)
    {
        // POST /reactions/{targetType}/{targetId}/toggle
        app.MapPost("/reactions/{targetType}/{targetId}/toggle", async (string targetType, string targetId, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (!AllowedTargetTypes.Contains(targetType))
                return Results.BadRequest(new { error = "Unsupported target type." });
            if (targetType.Equals("profile", StringComparison.OrdinalIgnoreCase) && targetId == userId)
                return Results.BadRequest(new { error = "You can't like your own profile." });

            var container = cosmos.GetContainer("reactions");
            var id = $"{targetType}:{targetId}:{userId}";
            bool liked;
            try
            {
                await container.ReadItemAsync<Reaction>(id, new PartitionKey(targetId));
                await container.DeleteItemAsync<Reaction>(id, new PartitionKey(targetId));
                liked = false;
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                var reaction = new Reaction(id, targetType, targetId, userId, DateTimeOffset.UtcNow);
                await container.UpsertItemAsync(reaction, new PartitionKey(targetId));
                liked = true;
            }

            var count = await CountReactionsAsync(container, targetType, targetId);
            return Results.Ok(new { liked, count });
        }).RequireAuthorization();

        // GET /reactions/{targetType}/{targetId}
        app.MapGet("/reactions/{targetType}/{targetId}", async (string targetType, string targetId, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (!AllowedTargetTypes.Contains(targetType))
                return Results.BadRequest(new { error = "Unsupported target type." });

            var container = cosmos.GetContainer("reactions");
            var id = $"{targetType}:{targetId}:{userId}";
            bool liked;
            try
            {
                await container.ReadItemAsync<Reaction>(id, new PartitionKey(targetId));
                liked = true;
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                liked = false;
            }

            var count = await CountReactionsAsync(container, targetType, targetId);
            return Results.Ok(new { liked, count });
        }).RequireAuthorization();
    }

    private static async Task<int> CountReactionsAsync(Container container, string targetType, string targetId)
    {
        var query = new QueryDefinition("SELECT VALUE COUNT(1) FROM c WHERE c.targetId = @tid AND c.targetType = @tt")
            .WithParameter("@tid", targetId)
            .WithParameter("@tt", targetType);
        using var feed = container.GetItemQueryIterator<int>(
            query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(targetId) });
        var page = await feed.ReadNextAsync();
        return page.FirstOrDefault();
    }
}

public record Reaction(
    string id,
    string targetType,
    string targetId,
    string userId,
    DateTimeOffset createdAt);
