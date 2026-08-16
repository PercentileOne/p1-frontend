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

        // POST /api/courses  — body: { title, level, course }
        app.MapPost("/api/courses", async (SaveCourseRequest req, CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("courses");
            var pk = Pk(req.Title, req.Level);
            var doc = new CourseDocument(pk, pk, req.Course, DateTimeOffset.UtcNow);
            await container.UpsertItemAsync(doc, new PartitionKey(pk));
            return Results.Ok();
        }).AllowAnonymous();
    }

    private record CourseDocument(string id, string pk, object Course, DateTimeOffset SavedAt);
    private record SaveCourseRequest(string Title, string Level, object Course);
}
