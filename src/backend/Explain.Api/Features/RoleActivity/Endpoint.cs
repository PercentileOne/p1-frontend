using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.RoleActivity;

/// <summary>
/// Dashboard "What Candidates Are Doing" card — logs the real job title every time a candidate
/// actually confirms and starts a practice interview (InterviewPackStart.tsx, the same moment
/// logInDemandSubjects already fires for Special Focus subjects — see that endpoint's own
/// comment). One document per normalised role with a running count, same shape and same
/// single-partition top-N trick as LearnTopics.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/role-activity", async (LogRoleRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(req.JobTitle)) return Results.BadRequest(new { error = "jobTitle is required" });

            var container = cosmos.GetContainer("roleActivity");
            var id = NormaliseKey(req.JobTitle);

            try
            {
                var existing = await container.PatchItemAsync<RoleActivityDoc>(
                    id, new PartitionKey("role"), [PatchOperation.Increment("/count", 1)]);
                return Results.Ok(new { count = existing.Resource.count });
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                var doc = new RoleActivityDoc(id, "role", req.JobTitle.Trim(), 1, DateTimeOffset.UtcNow);
                try
                {
                    await container.CreateItemAsync(doc, new PartitionKey("role"));
                    return Results.Ok(new { count = 1 });
                }
                catch (CosmosException createEx) when (createEx.StatusCode == System.Net.HttpStatusCode.Conflict)
                {
                    var patched = await container.PatchItemAsync<RoleActivityDoc>(
                        id, new PartitionKey("role"), [PatchOperation.Increment("/count", 1)]);
                    return Results.Ok(new { count = patched.Resource.count });
                }
            }
        }).RequireAuthorization();

        // GET /api/role-activity — most-interviewed roles right now, most-active first.
        app.MapGet("/api/role-activity", async (CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("roleActivity");
            var query = new QueryDefinition("SELECT TOP 10 * FROM c ORDER BY c.count DESC");
            var results = new List<RoleActivityDoc>();
            using var feed = container.GetItemQueryIterator<RoleActivityDoc>(query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey("role") });
            while (feed.HasMoreResults) results.AddRange(await feed.ReadNextAsync());
            return Results.Ok(results);
        }).AllowAnonymous();
    }

    private static string NormaliseKey(string value) =>
        value.Trim().ToLowerInvariant().Replace(' ', '-');
}

public record LogRoleRequest(string JobTitle);

public record RoleActivityDoc(string id, string pk, string jobTitle, int count, DateTimeOffset lastUpdated);
