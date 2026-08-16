using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Courses;

/// <summary>
/// Platform-level course cache — shared across all users.
/// Partition key: normalised "{title}|{level}" so one Cosmos read answers the lookup.
/// TTL: 2 days (172800s), enforced by Cosmos DefaultTimeToLive on the container.
/// </summary>
public static class Endpoint
{
    private static string Pk(string title, string level) =>
        $"{title.Trim().ToLowerInvariant()}|{level.Trim().ToLowerInvariant()}";

    public static void Map(WebApplication app)
    {
        // GET /api/courses/cached?title=X&level=Y
        app.MapGet("/api/courses/cached", async (string title, string level, CosmosService cosmos) =>
        {
            try
            {
                var container = cosmos.GetContainer("courses");
                var pk = Pk(title, level);
                var response = await container.ReadItemAsync<CourseDocument>(pk, new PartitionKey(pk));
                return Results.Ok(response.Resource.Course);
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }
        }).AllowAnonymous();

        // GET /api/courses/suggest?q=X — returns up to 8 matching titles from the platform cache
        app.MapGet("/api/courses/suggest", async (string q, CosmosService cosmos) =>
        {
            if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
                return Results.Ok(Array.Empty<string>());

            var container = cosmos.GetContainer("courses");
            var term = q.Trim().ToLowerInvariant();
            var query = new QueryDefinition(
                "SELECT c.title, c.level FROM c WHERE CONTAINS(c.pk, @term) OFFSET 0 LIMIT 8")
                .WithParameter("@term", term);

            var suggestions = new List<object>();
            using var feed = container.GetItemQueryIterator<SuggestionRow>(query);
            while (feed.HasMoreResults && suggestions.Count < 8)
            {
                var page = await feed.ReadNextAsync();
                foreach (var row in page)
                    suggestions.Add(new { row.title, row.level });
            }
            return Results.Ok(suggestions);
        }).AllowAnonymous();

        // POST /api/courses  — body: { title, level, course }
        app.MapPost("/api/courses", async (SaveCourseRequest req, CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("courses");
            var pk = Pk(req.Title, req.Level);
            var doc = new CourseDocument(pk, pk, req.Title, req.Level, req.Course, DateTimeOffset.UtcNow);
            await container.UpsertItemAsync(doc, new PartitionKey(pk));
            return Results.Ok();
        }).AllowAnonymous();
    }

    private record CourseDocument(string id, string pk, string title, string level, object Course, DateTimeOffset SavedAt);
    private record SaveCourseRequest(string Title, string Level, object Course);
    private record SuggestionRow(string title, string level);
}
