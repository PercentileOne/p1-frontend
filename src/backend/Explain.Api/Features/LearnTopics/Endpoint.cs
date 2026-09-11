using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.LearnTopics;

/// <summary>
/// Dashboard "What People Are Studying" card — logs the real course topic every time a
/// candidate opens a Learn course (LearnPanel.tsx's handleGenerate, all three paths: local
/// cache, platform cache, and a fresh AI generation all funnel through there). One document
/// per normalised topic with a running count — same "pre-aggregated counter, not a raw event
/// log" shape as InDemandSubjects, and the same single-partition "cheap top-N read" trick,
/// using a single fixed partition value since global top-N (not per-role) is what this card
/// needs.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/learn-topics", async (LogTopicRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(req.Topic)) return Results.BadRequest(new { error = "topic is required" });

            var container = cosmos.GetContainer("learnTopics");
            var key = NormaliseKey(req.Topic);
            var id = key;

            try
            {
                var existing = await container.PatchItemAsync<LearnTopicDoc>(
                    id, new PartitionKey("topic"), [PatchOperation.Increment("/count", 1)]);
                return Results.Ok(new { count = existing.Resource.count });
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                var doc = new LearnTopicDoc(id, "topic", req.Topic.Trim(), 1, DateTimeOffset.UtcNow);
                try
                {
                    await container.CreateItemAsync(doc, new PartitionKey("topic"));
                    return Results.Ok(new { count = 1 });
                }
                catch (CosmosException createEx) when (createEx.StatusCode == System.Net.HttpStatusCode.Conflict)
                {
                    var patched = await container.PatchItemAsync<LearnTopicDoc>(
                        id, new PartitionKey("topic"), [PatchOperation.Increment("/count", 1)]);
                    return Results.Ok(new { count = patched.Resource.count });
                }
            }
        }).RequireAuthorization();

        // GET /api/learn-topics — top studied topics, most-popular first. Single-partition read.
        app.MapGet("/api/learn-topics", async (CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("learnTopics");
            var query = new QueryDefinition("SELECT TOP 10 * FROM c ORDER BY c.count DESC");
            var results = new List<LearnTopicDoc>();
            using var feed = container.GetItemQueryIterator<LearnTopicDoc>(query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey("topic") });
            while (feed.HasMoreResults) results.AddRange(await feed.ReadNextAsync());
            return Results.Ok(results);
        }).AllowAnonymous();
    }

    private static string NormaliseKey(string value) =>
        value.Trim().ToLowerInvariant().Replace(' ', '-');
}

public record LogTopicRequest(string Topic);

public record LearnTopicDoc(string id, string pk, string topic, int count, DateTimeOffset lastUpdated);
