using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.NameGreetings;

/// <summary>
/// Name Bank — a personalised interviewer greeting clip ("Hi Francis, I'm James"), cached
/// per {speaker}:{normalizedName} and reused for every candidate who shares that first name.
/// Pilot scope: one entry (james/francis), seeded via the admin endpoint below — there's no
/// automated generation, DeeVid is a manual website step, so a miss just means "no clip yet,
/// use today's generic behaviour," never an error.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // GET /name-greetings/{speaker}/{name} — cache lookup. 404 on miss is expected and silent.
        app.MapGet("/name-greetings/{speaker}/{name}", async (string speaker, string name, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("nameGreetings");
            var id = $"{speaker.Trim().ToLowerInvariant()}:{name.Trim().ToLowerInvariant()}";

            try
            {
                var existing = await container.ReadItemAsync<NameGreeting>(id, new PartitionKey(id));
                var bumped = existing.Resource with { useCount = existing.Resource.useCount + 1, lastUsedAt = DateTimeOffset.UtcNow };
                _ = container.UpsertItemAsync(bumped, new PartitionKey(id));
                return Results.Ok(new { videoUrl = existing.Resource.videoUrl });
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }
        }).RequireAuthorization();

        // POST /api/admin/name-greetings — seed/update a cached greeting. Only route that writes
        // one of these; no automated generation exists yet.
        app.MapPost("/api/admin/name-greetings", async (SeedRequest req, CosmosService cosmos) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name)) return Results.BadRequest(new { error = "name is required." });
            if (string.IsNullOrWhiteSpace(req.Speaker)) return Results.BadRequest(new { error = "speaker is required." });
            if (string.IsNullOrWhiteSpace(req.VideoUrl)) return Results.BadRequest(new { error = "videoUrl is required." });

            var speaker = req.Speaker.Trim().ToLowerInvariant();
            var normalizedName = req.Name.Trim().ToLowerInvariant();
            var id = $"{speaker}:{normalizedName}";

            var greeting = new NameGreeting(
                id: id,
                pk: id,
                name: req.Name.Trim(),
                speaker: speaker,
                videoUrl: req.VideoUrl.Trim(),
                useCount: 0,
                generatedAt: DateTimeOffset.UtcNow,
                lastUsedAt: null);

            var container = cosmos.GetContainer("nameGreetings");
            await container.UpsertItemAsync(greeting, new PartitionKey(id));
            return Results.Ok(greeting);
        }).RequireAuthorization(Permissions.ViewAdminPortal);
    }
}

public record SeedRequest(string Name, string Speaker, string VideoUrl);

public record NameGreeting(
    string id,
    string pk,
    string name,
    string speaker,
    string videoUrl,
    int useCount,
    DateTimeOffset generatedAt,
    DateTimeOffset? lastUsedAt);
