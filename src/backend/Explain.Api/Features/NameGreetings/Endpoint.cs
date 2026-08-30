using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;
using PlatformSettingsEndpoint = Explain.Api.Features.PlatformSettings.Endpoint;

namespace Explain.Api.Features.NameGreetings;

/// <summary>
/// Name Bank — a personalised interviewer greeting clip ("Hi Francis, I'm James"), cached
/// per {speaker}:{normalizedName} and reused for every candidate who shares that first name.
/// Auto-generation via D-ID is gated behind a global kill switch (Features/PlatformSettings) —
/// when off, EVERY lookup 404s regardless of what's already cached, so an admin can revert
/// everyone to generic mode instantly. The candidate-facing contract never changes: a miss is
/// always silent, never an error, never a delay.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // GET /name-greetings/{speaker}/{name} — cache lookup, claim-and-generate on a fresh
        // miss while the kill switch is on. 404 on any non-hit outcome is expected and silent.
        app.MapGet("/name-greetings/{speaker}/{name}", async (
            string speaker, string name, HttpContext ctx,
            CosmosService cosmos, DidGenerationService did, IHostApplicationLifetime lifetime, ILogger<DidGenerationService> logger) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var setting = await PlatformSettingsEndpoint.GetOrDefaultAsync(cosmos);
            var container = cosmos.GetContainer("nameGreetings");
            var normalizedSpeaker = speaker.Trim().ToLowerInvariant();
            var normalizedName = name.Trim().ToLowerInvariant();
            var id = $"{normalizedSpeaker}:{normalizedName}";

            NameGreeting? existing = null;
            if (setting.autoGenerateEnabled)
            {
                // Only bother looking the doc up if the switch is on — off means "behave as if
                // none of this exists," so skip the read entirely rather than fetch-then-ignore.
                try
                {
                    var response = await container.ReadItemAsync<NameGreeting>(id, new PartitionKey(id));
                    existing = response.Resource;
                }
                catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* no doc yet */ }
            }

            var outcome = NameGreetingDecider.Decide(existing, setting.autoGenerateEnabled, DateTimeOffset.UtcNow);

            if (outcome == NameGreetingOutcome.Hit)
            {
                var bumped = existing! with { useCount = existing.useCount + 1, lastUsedAt = DateTimeOffset.UtcNow };
                _ = container.UpsertItemAsync(bumped, new PartitionKey(id));
                return Results.Ok(new { videoUrl = existing.videoUrl });
            }

            if (outcome != NameGreetingOutcome.MissClaim)
                return Results.NotFound();

            if (NameValidation.LooksImplausible(name))
                return Results.NotFound();

            var pending = new NameGreeting(
                id: id, pk: id, name: name.Trim(), speaker: normalizedSpeaker, videoUrl: "",
                useCount: 0, generatedAt: DateTimeOffset.UtcNow, lastUsedAt: null,
                status: "pending", failureReason: null, startedAt: DateTimeOffset.UtcNow,
                attemptCount: (existing?.attemptCount ?? 0) + 1);

            if (existing is null)
            {
                try
                {
                    await container.CreateItemAsync(pending, new PartitionKey(id));
                }
                catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.Conflict)
                {
                    // Another request claimed this name between our read and this write.
                    return Results.NotFound();
                }
            }
            else
            {
                // Stale-pending or failed — already decided reclaimable. A rare double-claim
                // race here just wastes one extra D-ID call, not a data problem; acceptable at
                // this scale (see plan's Task.Run-vs-IHostedService reasoning).
                await container.UpsertItemAsync(pending, new PartitionKey(id));
            }

            var script = $"Hi {name.Trim()}, I'm James — looking forward to hearing about your experience. Let's get started.";
            var shutdownToken = lifetime.ApplicationStopping;
            _ = Task.Run(async () =>
            {
                NameGreeting finalDoc;
                try
                {
                    var (success, videoUrl, error) = await did.GenerateAsync(script, shutdownToken);
                    finalDoc = success
                        ? pending with { status = "ready", videoUrl = videoUrl!, generatedAt = DateTimeOffset.UtcNow }
                        : pending with { status = "failed", failureReason = error };
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Name Bank generation failed for {Id}", id);
                    finalDoc = pending with { status = "failed", failureReason = ex.Message };
                }

                try
                {
                    await container.UpsertItemAsync(finalDoc, new PartitionKey(id), cancellationToken: CancellationToken.None);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to save Name Bank generation result for {Id}", id);
                }
            }, CancellationToken.None);

            return Results.NotFound();
        }).RequireAuthorization();

        // POST /api/admin/name-greetings — manual seed/update, unaffected by the kill switch
        // (used for the pilot's own hand-generated clips, and still useful once auto-gen exists
        // for correcting a bad clip without waiting on a full regeneration cycle).
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
                lastUsedAt: null,
                status: "ready");

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
    DateTimeOffset? lastUsedAt,
    string status = "ready",
    string? failureReason = null,
    DateTimeOffset? startedAt = null,
    int attemptCount = 0);
