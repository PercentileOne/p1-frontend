using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Azure.Cosmos;
using QRCoder;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Storage;

namespace Explain.Api.Features.Interviews;

/// <summary>
/// Completed interview sessions — persisted so the summary page survives a reload/share,
/// Mike's feedback banner keeps working, and "Save this interview" produces a real link + QR.
///
/// Storage design: everything the client already has (answers, mcq*, chapters, cvCtx, jobCtx,
/// role, company, overallScore) is kept as one opaque JSON string (sessionDataJson) rather than
/// modelled field-by-field in C# — mirrors how Features/Courses/Endpoint.cs treats course content
/// as opaque, and sidesteps any ambiguity in how the Cosmos SDK's default serializer round-trips
/// loosely-typed objects. Reads/writes go through Cosmos's *Stream APIs with our own explicit
/// System.Text.Json (de)serialization, so nothing depends on Cosmos SDK's internal serializer.
/// </summary>
public static class Endpoint
{
    private const string ShareBaseUrl = "https://candidate.interviewme.global/shared";

    public static void Map(WebApplication app)
    {
        // POST /api/interviews/upload — multipart/form-data: "metadata" (JSON string, required),
        // "video" (file, optional — omitted if the candidate never granted screen-recording permission).
        app.MapPost("/api/interviews/upload", async (HttpRequest req, CosmosService cosmos, BlobStorageService blob, IConfiguration config, ILogger<Program> logger) =>
        {
            var userId = req.HttpContext.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (!req.HasFormContentType) return Results.BadRequest(new { error = "Expected multipart/form-data" });

            var form = await req.ReadFormAsync();
            var metadataJson = form["metadata"].ToString();
            if (string.IsNullOrWhiteSpace(metadataJson)) return Results.BadRequest(new { error = "metadata is required" });

            string candidateId, interviewId;
            try
            {
                using var metaDoc = JsonDocument.Parse(metadataJson);
                var root = metaDoc.RootElement;
                candidateId = root.GetProperty("candidateId").GetString()
                    ?? throw new JsonException("candidateId missing");
                interviewId = root.TryGetProperty("interviewId", out var idEl) && idEl.GetString() is { Length: > 0 } id
                    ? id : Guid.NewGuid().ToString();
            }
            catch (JsonException)
            {
                return Results.BadRequest(new { error = "metadata must be valid JSON with a candidateId" });
            }

            if (candidateId != userId) return Results.Forbid();

            var hasVideo = false;
            var videoFile = form.Files["video"];
            if (videoFile is not null && videoFile.Length > 0 && blob.IsConfigured)
            {
                await using var stream = videoFile.OpenReadStream();
                await blob.UploadAsync(candidateId, interviewId, stream, videoFile.ContentType ?? "video/webm");
                hasVideo = true;
            }

            var envelope = new InterviewEnvelope(
                id: interviewId,
                candidateId: candidateId,
                createdAt: DateTimeOffset.UtcNow.ToString("o"),
                hasVideo: hasVideo,
                shareToken: null,
                isShared: false,
                sessionDataJson: metadataJson);

            var container = cosmos.GetContainer("interviews");
            using var body = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(envelope));
            using var upsertResponse = await container.UpsertItemStreamAsync(body, new PartitionKey(candidateId));
            if (!upsertResponse.IsSuccessStatusCode)
                return Results.Problem("Failed to save interview session", statusCode: (int)upsertResponse.StatusCode);

            // Fire any matching talent alerts (recruiter/employer "notify me when a candidate
            // scores > X for role Y"). Best-effort — a failure here should never block the
            // candidate's own save from succeeding.
            try
            {
                var candidateName = req.HttpContext.User.FindFirst("name")?.Value ?? "A candidate";
                string? role = null;
                double overallScore = 0;
                using (var metaForAlerts = JsonDocument.Parse(metadataJson))
                {
                    var root = metaForAlerts.RootElement;
                    if (root.TryGetProperty("role", out var r) && r.ValueKind == JsonValueKind.String) role = r.GetString();
                    if (root.TryGetProperty("overallScore", out var s) && s.ValueKind == JsonValueKind.Number) overallScore = s.GetDouble();
                }
                await Explain.Api.Features.Alerts.Endpoint.MatchIncomingCandidateAsync(
                    candidateId, candidateName, role, overallScore, interviewId, cosmos, config, logger);

                // Denormalize this candidate's best-ever score onto their profile so Candidate
                // Search can filter by score without parsing every candidate's opaque
                // sessionDataJson on every request — see Features/CandidateSearch/Endpoint.cs.
                await UpdateBestScoreAsync(candidateId, overallScore, cosmos, logger);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Alert matching / best-score update failed for interview {Id}", interviewId);
            }

            return Results.Ok(new { id = interviewId, videoSaved = hasVideo });
        }).RequireAuthorization().DisableAntiforgery();

        // GET /api/interviews — every saved session for the current candidate, newest first.
        // Lightweight summaries only (no answers/transcript) — the My Interviews list page.
        app.MapGet("/api/interviews", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("interviews");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.candidateId = @cid")
                .WithParameter("@cid", userId);
            var summaries = new List<InterviewSummary>();
            using var feed = container.GetItemQueryIterator<InterviewEnvelope>(query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });
            while (feed.HasMoreResults)
            {
                foreach (var env in await feed.ReadNextAsync())
                    summaries.Add(ToSummary(env));
            }
            return Results.Ok(summaries.OrderByDescending(s => s.createdAt));
        }).RequireAuthorization();

        // POST /api/interviews/{candidateId}/{id}/share — publishes a shareable link + QR code.
        app.MapPost("/api/interviews/{candidateId}/{id}/share", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("interviews");
            var envelope = await ReadEnvelopeAsync(container, id, candidateId);
            if (envelope is null) return Results.NotFound();

            // Idempotent: reusing an already-issued token instead of always minting a fresh one
            // means calling this again (e.g. revisiting the summary page) never invalidates a
            // link or QR code the candidate may have already handed to a recruiter or put on a CV.
            string shareToken;
            if (envelope.isShared && !string.IsNullOrEmpty(envelope.shareToken))
            {
                shareToken = envelope.shareToken;
            }
            else
            {
                shareToken = GenerateShareToken();
                var updated = envelope with { shareToken = shareToken, isShared = true };
                using var body = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(updated));
                using var upsertResponse = await container.UpsertItemStreamAsync(body, new PartitionKey(candidateId));
                if (!upsertResponse.IsSuccessStatusCode)
                    return Results.Problem("Failed to publish share link", statusCode: (int)upsertResponse.StatusCode);
            }

            var shareUrl = $"{ShareBaseUrl}/{shareToken}";
            return Results.Ok(new { shareToken, shareUrl, qrDataUri = GenerateQrDataUri(shareUrl) });
        }).RequireAuthorization();

        // GET /api/interviews/{candidateId}/{id} — owner-only fetch, used by the summary page
        // to hydrate itself when React Router state is empty (reload, revisit, direct link).
        app.MapGet("/api/interviews/{candidateId}/{id}", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos, BlobStorageService blob) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("interviews");
            var envelope = await ReadEnvelopeAsync(container, id, candidateId);
            return envelope is null ? Results.NotFound() : Results.Text(BuildResponseJson(envelope, blob), "application/json");
        }).RequireAuthorization();

        // GET /api/interviews/shared/{shareToken} — public view for a shared link/QR scan.
        app.MapGet("/api/interviews/shared/{shareToken}", async (string shareToken, CosmosService cosmos, BlobStorageService blob) =>
        {
            var container = cosmos.GetContainer("interviews");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.shareToken = @token AND c.isShared = true")
                .WithParameter("@token", shareToken);
            using var feed = container.GetItemQueryIterator<InterviewEnvelope>(query);
            if (feed.HasMoreResults)
            {
                var page = await feed.ReadNextAsync();
                var envelope = page.FirstOrDefault();
                if (envelope is not null) return Results.Text(BuildResponseJson(envelope, blob), "application/json");
            }
            return Results.NotFound();
        }).AllowAnonymous();

        // DELETE /api/interviews/{candidateId}/{id} — "Discard, it was practice".
        app.MapDelete("/api/interviews/{candidateId}/{id}", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos, BlobStorageService blob) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("interviews");
            try
            {
                await container.DeleteItemStreamAsync(id, new PartitionKey(candidateId));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { /* already gone */ }
            await blob.DeleteAsync(candidateId, id);
            return Results.NoContent();
        }).RequireAuthorization();
    }

    private static async Task<InterviewEnvelope?> ReadEnvelopeAsync(Container container, string id, string candidateId)
    {
        using var response = await container.ReadItemStreamAsync(id, new PartitionKey(candidateId));
        if (!response.IsSuccessStatusCode) return null;
        return await JsonSerializer.DeserializeAsync<InterviewEnvelope>(response.Content);
    }

    // Single-partition read-then-conditional-write on the candidate's own profile doc — cheap,
    // and never blocks the interview save (caller wraps this in the same best-effort try/catch
    // as alert matching). Not atomic: two concurrent uploads from the same candidate could in
    // theory race, but one candidate doesn't run two interviews at once in practice.
    private static async Task UpdateBestScoreAsync(string candidateId, double overallScore, CosmosService cosmos, ILogger logger)
    {
        var container = cosmos.GetContainer("profiles");
        try
        {
            var response = await container.ReadItemAsync<Explain.Api.Domain.Profile.UserProfile>(
                candidateId, new PartitionKey(candidateId));
            var profile = response.Resource;
            var rounded = (int)Math.Round(overallScore);
            if (rounded > (profile.BestScore ?? -1))
            {
                profile.BestScore = rounded;
                await container.UpsertItemAsync(profile, new PartitionKey(candidateId));
            }
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            logger.LogWarning("No profile found for {CandidateId} — skipping BestScore update", candidateId);
        }
    }

    // internal, not private — Features/CandidateSearch/Endpoint.cs reuses this exact
    // parse-from-opaque-JSON logic for the candidate-interviews endpoint.
    internal static InterviewSummary ToSummary(InterviewEnvelope env)
    {
        string? role = null, company = null;
        double overallScore = 0;
        try
        {
            using var doc = JsonDocument.Parse(env.sessionDataJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("role", out var r) && r.ValueKind == JsonValueKind.String) role = r.GetString();
            if (root.TryGetProperty("company", out var c) && c.ValueKind == JsonValueKind.String) company = c.GetString();
            if (root.TryGetProperty("overallScore", out var s) && s.ValueKind == JsonValueKind.Number) overallScore = s.GetDouble();
        }
        catch (JsonException) { /* malformed sessionDataJson — summary just shows defaults */ }

        return new InterviewSummary(env.id, env.createdAt, role, company, overallScore, env.isShared, env.hasVideo);
    }

    private static string BuildResponseJson(InterviewEnvelope env, BlobStorageService blob)
    {
        var node = JsonNode.Parse(env.sessionDataJson)?.AsObject() ?? new JsonObject();
        node["id"] = env.id;
        node["candidateId"] = env.candidateId;
        node["createdAt"] = env.createdAt;
        // Signed, time-limited URL generated fresh per request — never stored, so it can't go stale
        // or leak a permanent link to what's meant to be a private recording.
        node["videoUrl"] = env.hasVideo ? blob.GetReadUrl(env.candidateId, env.id) : null;
        node["shareToken"] = env.shareToken;
        node["isShared"] = env.isShared;
        return node.ToJsonString();
    }

    private static string GenerateShareToken()
    {
        const string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var bytes = RandomNumberGenerator.GetBytes(10);
        return new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
    }

    private static string GenerateQrDataUri(string url)
    {
        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data);
        var bytes = png.GetGraphic(20);
        return $"data:image/png;base64,{Convert.ToBase64String(bytes)}";
    }
}

// candidateId/id/createdAt/hasVideo/shareToken/isShared are first-class fields we control;
// sessionDataJson is the client's opaque metadata blob (answers, mcq*, chapters, cvCtx, jobCtx,
// role, company, overallScore) — merged back in at read time by BuildResponseJson.
public record InterviewEnvelope(
    string id,
    string candidateId,
    string createdAt,
    bool hasVideo,
    string? shareToken,
    bool isShared,
    string sessionDataJson);

// Lightweight row for the My Interviews list — no answers/transcript, just enough to render a card.
public record InterviewSummary(
    string id,
    string createdAt,
    string? role,
    string? company,
    double overallScore,
    bool isShared,
    bool hasVideo);
