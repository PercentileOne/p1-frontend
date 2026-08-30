using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Storage;
using PlatformSettingsEndpoint = Explain.Api.Features.PlatformSettings.Endpoint;

namespace Explain.Api.Features.NameGreetings;

/// <summary>
/// Name Bank — a personalised interviewer greeting clip ("Hi Francis, I'm James — you've
/// chosen a Pro-level session..."), cached per {speaker}:{name}:{difficulty} and reused for
/// every candidate who shares that combination. Auto-generation via D-ID is gated behind a
/// global kill switch (Features/PlatformSettings) — when off, EVERY lookup 404s regardless
/// of what's already cached, so an admin can revert everyone to generic mode instantly. The
/// candidate-facing contract never changes: a miss is always silent, never an error, never a
/// delay.
/// </summary>
public static class Endpoint
{
    private static readonly HashSet<string> AllowedDifficulties = new(StringComparer.OrdinalIgnoreCase) { "standard", "pro", "expert" };

    public static void Map(WebApplication app)
    {
        // GET /name-greetings/{speaker}/{name}/{difficulty} — cache lookup, claim-and-generate
        // on a fresh miss while the kill switch is on. 404 on any non-hit outcome is expected
        // and silent.
        app.MapGet("/name-greetings/{speaker}/{name}/{difficulty}", async (
            string speaker, string name, string difficulty, HttpContext ctx,
            CosmosService cosmos, DidGenerationService did, NameGreetingVideoStorageService videoStorage,
            IHttpClientFactory httpClientFactory, IHostApplicationLifetime lifetime, ILogger<DidGenerationService> logger) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var normalizedDifficulty = AllowedDifficulties.Contains(difficulty) ? difficulty.Trim().ToLowerInvariant() : "standard";

            var setting = await PlatformSettingsEndpoint.GetOrDefaultAsync(cosmos);
            var container = cosmos.GetContainer("nameGreetings");
            var normalizedSpeaker = speaker.Trim().ToLowerInvariant();
            var normalizedName = name.Trim().ToLowerInvariant();
            var id = $"{normalizedSpeaker}:{normalizedName}:{normalizedDifficulty}";

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
                id: id, pk: id, name: name.Trim(), speaker: normalizedSpeaker, difficulty: normalizedDifficulty, videoUrl: "",
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
                    // Another request claimed this name+difficulty between our read and this write.
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

            var script = ScriptFor(name.Trim(), normalizedDifficulty);
            var shutdownToken = lifetime.ApplicationStopping;
            _ = Task.Run(async () =>
            {
                NameGreeting finalDoc;
                try
                {
                    var (success, didVideoUrl, error) = await did.GenerateAsync(script, shutdownToken);
                    if (success && didVideoUrl is not null)
                    {
                        // D-ID's own result_url expires within 24h (confirmed live) — re-host
                        // immediately so the cached URL is actually permanent.
                        var downloadClient = httpClientFactory.CreateClient();
                        var permanentUrl = await videoStorage.DownloadAndStoreAsync(didVideoUrl, id.Replace(':', '_'), downloadClient, shutdownToken);
                        finalDoc = pending with { status = "ready", videoUrl = permanentUrl, generatedAt = DateTimeOffset.UtcNow };
                    }
                    else
                    {
                        finalDoc = pending with { status = "failed", failureReason = error };
                    }
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
        // (useful for correcting a bad clip without waiting on a full regeneration cycle).
        app.MapPost("/api/admin/name-greetings", async (SeedRequest req, CosmosService cosmos) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name)) return Results.BadRequest(new { error = "name is required." });
            if (string.IsNullOrWhiteSpace(req.Speaker)) return Results.BadRequest(new { error = "speaker is required." });
            if (string.IsNullOrWhiteSpace(req.VideoUrl)) return Results.BadRequest(new { error = "videoUrl is required." });

            var speaker = req.Speaker.Trim().ToLowerInvariant();
            var normalizedName = req.Name.Trim().ToLowerInvariant();
            var difficulty = !string.IsNullOrWhiteSpace(req.Difficulty) && AllowedDifficulties.Contains(req.Difficulty)
                ? req.Difficulty.Trim().ToLowerInvariant() : "standard";
            var id = $"{speaker}:{normalizedName}:{difficulty}";

            var greeting = new NameGreeting(
                id: id,
                pk: id,
                name: req.Name.Trim(),
                speaker: speaker,
                difficulty: difficulty,
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

    // Mirrors the tone/wording of James's own live AI-generated difficulty framing
    // (src/frontend/src/api/aiScoring.ts's difficultyFrame) so a pre-generated clip reads
    // consistently with what James would otherwise have said live.
    private static string ScriptFor(string name, string difficulty) => difficulty switch
    {
        "expert" => $"Hi {name}, I'm James. You've chosen an Expert-level session, so I'll treat you as the leading authority in your field — be ready to go deep. Let's get started.",
        "pro" => $"Hi {name}, I'm James. You've chosen a Pro-level session, so expect sharper, more probing questions that go beyond the basics. Let's get started.",
        _ => $"Hi {name}, I'm James. You've chosen a Standard session — I've put together a solid set of questions to help you perform at your best. Let's get started.",
    };
}

public record SeedRequest(string Name, string Speaker, string VideoUrl, string? Difficulty = null);

public record NameGreeting(
    string id,
    string pk,
    string name,
    string speaker,
    string difficulty,
    string videoUrl,
    int useCount,
    DateTimeOffset generatedAt,
    DateTimeOffset? lastUsedAt,
    string status = "ready",
    string? failureReason = null,
    DateTimeOffset? startedAt = null,
    int attemptCount = 0);
