using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Azure.Cosmos;
using QRCoder;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Storage;

namespace Explain.Api.Features.Talks;

/// <summary>
/// Completed "My Talks" sessions — same design as Features/Interviews/Endpoint.cs, deliberately
/// mirrored rather than shared: subject, transcript, scores, chapters etc. all live as one opaque
/// JSON string (sessionDataJson) rather than modelled field-by-field in C#, same reasoning as the
/// interviews envelope. Skips that endpoint's interview-specific side effects (talent-alert
/// matching, BestScore denormalization, qaLog writes) — those are job-role-matching concepts that
/// don't apply to a spoken-presentation practice session.
///
/// Recordings reuse the same BlobStorageService/container as interviews (candidateId/id.webm,
/// ids are fresh GUIDs per session so there's no collision risk between the two features).
/// </summary>
public static class Endpoint
{
    private const string ShareBaseUrl = "https://candidate.theinterviewchair.com/shared-talk";

    public static void Map(WebApplication app)
    {
        // POST /api/talks/upload — multipart/form-data: "metadata" (JSON string, required),
        // "video" (file, optional — omitted if the candidate never granted screen-recording permission).
        app.MapPost("/api/talks/upload", async (HttpRequest req, CosmosService cosmos, BlobStorageService blob) =>
        {
            var userId = req.HttpContext.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (!req.HasFormContentType) return Results.BadRequest(new { error = "Expected multipart/form-data" });

            var form = await req.ReadFormAsync();
            var metadataJson = form["metadata"].ToString();
            if (string.IsNullOrWhiteSpace(metadataJson)) return Results.BadRequest(new { error = "metadata is required" });

            string candidateId, talkId;
            try
            {
                using var metaDoc = JsonDocument.Parse(metadataJson);
                var root = metaDoc.RootElement;
                candidateId = root.GetProperty("candidateId").GetString()
                    ?? throw new JsonException("candidateId missing");
                talkId = root.TryGetProperty("talkId", out var idEl) && idEl.GetString() is { Length: > 0 } id
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
                await blob.UploadAsync(candidateId, talkId, stream, videoFile.ContentType ?? "video/webm");
                hasVideo = true;
            }

            var envelope = new TalkEnvelope(
                id: talkId,
                candidateId: candidateId,
                createdAt: DateTimeOffset.UtcNow.ToString("o"),
                hasVideo: hasVideo,
                shareToken: null,
                isShared: false,
                sessionDataJson: metadataJson);

            var container = cosmos.GetContainer("talks");
            using var body = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(envelope));
            using var upsertResponse = await container.UpsertItemStreamAsync(body, new PartitionKey(candidateId));
            if (!upsertResponse.IsSuccessStatusCode)
                return Results.Problem("Failed to save talk session", statusCode: (int)upsertResponse.StatusCode);

            return Results.Ok(new { id = talkId, videoSaved = hasVideo });
        }).RequireAuthorization().DisableAntiforgery();

        // GET /api/talks — every saved talk for the current candidate, newest first. Lightweight
        // summaries only (no transcript) — the My Talks list page.
        app.MapGet("/api/talks", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("talks");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.candidateId = @cid")
                .WithParameter("@cid", userId);
            var summaries = new List<TalkSummary>();
            using var feed = container.GetItemQueryIterator<TalkEnvelope>(query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });
            while (feed.HasMoreResults)
            {
                foreach (var env in await feed.ReadNextAsync())
                    summaries.Add(ToSummary(env));
            }
            return Results.Ok(summaries.OrderByDescending(s => s.createdAt));
        }).RequireAuthorization();

        // POST /api/talks/{candidateId}/{id}/share — publishes a shareable link + QR code.
        // Idempotent, same reasoning as the interviews equivalent: reusing an already-issued
        // token means revisiting the summary page never invalidates a link already handed out.
        app.MapPost("/api/talks/{candidateId}/{id}/share", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("talks");
            var envelope = await ReadEnvelopeAsync(container, id, candidateId);
            if (envelope is null) return Results.NotFound();

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

        // POST /api/talks/{candidateId}/{id}/unshare — makes a previously-shared talk private
        // again, keeping the existing shareToken so re-sharing later reactivates the same link.
        app.MapPost("/api/talks/{candidateId}/{id}/unshare", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("talks");
            var envelope = await ReadEnvelopeAsync(container, id, candidateId);
            if (envelope is null) return Results.NotFound();

            if (envelope.isShared)
            {
                var updated = envelope with { isShared = false };
                using var body = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(updated));
                using var upsertResponse = await container.UpsertItemStreamAsync(body, new PartitionKey(candidateId));
                if (!upsertResponse.IsSuccessStatusCode)
                    return Results.Problem("Failed to update visibility", statusCode: (int)upsertResponse.StatusCode);
            }
            return Results.Ok(new { isShared = false });
        }).RequireAuthorization();

        // POST /api/talks/visibility — { "isPublic": bool } — the My Talks page's bulk toggle.
        app.MapPost("/api/talks/visibility", async (VisibilityRequest body, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("talks");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.candidateId = @cid").WithParameter("@cid", userId);
            var updatedCount = 0;
            using var feed = container.GetItemQueryIterator<TalkEnvelope>(
                query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });
            while (feed.HasMoreResults)
            {
                foreach (var env in await feed.ReadNextAsync())
                {
                    if (env.isShared == body.IsPublic) continue;
                    var shareToken = body.IsPublic && string.IsNullOrEmpty(env.shareToken) ? GenerateShareToken() : env.shareToken;
                    var updated = env with { isShared = body.IsPublic, shareToken = shareToken };
                    using var upsertBody = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(updated));
                    using var upsertResponse = await container.UpsertItemStreamAsync(upsertBody, new PartitionKey(userId));
                    if (upsertResponse.IsSuccessStatusCode) updatedCount++;
                }
            }
            return Results.Ok(new { updatedCount, isShared = body.IsPublic });
        }).RequireAuthorization();

        // GET /api/talks/{candidateId}/{id} — owner-only fetch, hydrates the summary page on
        // reload/revisit/direct link.
        app.MapGet("/api/talks/{candidateId}/{id}", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos, BlobStorageService blob) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("talks");
            var envelope = await ReadEnvelopeAsync(container, id, candidateId);
            return envelope is null ? Results.NotFound() : Results.Text(BuildResponseJson(envelope, blob), "application/json");
        }).RequireAuthorization();

        // GET /api/talks/shared/{shareToken} — public view for a shared link/QR scan.
        app.MapGet("/api/talks/shared/{shareToken}", async (string shareToken, CosmosService cosmos, BlobStorageService blob) =>
        {
            var container = cosmos.GetContainer("talks");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.shareToken = @token AND c.isShared = true")
                .WithParameter("@token", shareToken);
            using var feed = container.GetItemQueryIterator<TalkEnvelope>(query);
            if (feed.HasMoreResults)
            {
                var page = await feed.ReadNextAsync();
                var envelope = page.FirstOrDefault();
                if (envelope is not null)
                    return Results.Text(BuildResponseJson(envelope, blob), "application/json");
            }
            return Results.NotFound();
        }).AllowAnonymous();

        // DELETE /api/talks/{candidateId}/{id} — "Discard, it was practice".
        app.MapDelete("/api/talks/{candidateId}/{id}", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos, BlobStorageService blob) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("talks");
            try
            {
                await container.DeleteItemStreamAsync(id, new PartitionKey(candidateId));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { /* already gone */ }
            await blob.DeleteAsync(candidateId, id);
            return Results.NoContent();
        }).RequireAuthorization();
    }

    private static async Task<TalkEnvelope?> ReadEnvelopeAsync(Container container, string id, string candidateId)
    {
        using var response = await container.ReadItemStreamAsync(id, new PartitionKey(candidateId));
        if (!response.IsSuccessStatusCode) return null;
        return await JsonSerializer.DeserializeAsync<TalkEnvelope>(response.Content);
    }

    // internal, not private — mirrors Features/Interviews/Endpoint.cs's ToSummary in case another
    // feature ever needs the same parse-from-opaque-JSON logic for talks.
    internal static TalkSummary ToSummary(TalkEnvelope env)
    {
        string? subject = null;
        double overallScore = 0;
        try
        {
            using var doc = JsonDocument.Parse(env.sessionDataJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("subject", out var s) && s.ValueKind == JsonValueKind.String) subject = s.GetString();
            if (root.TryGetProperty("overallScore", out var o) && o.ValueKind == JsonValueKind.Number) overallScore = o.GetDouble();
        }
        catch (JsonException) { /* malformed sessionDataJson — summary just shows defaults */ }

        return new TalkSummary(env.id, env.createdAt, subject, overallScore, env.isShared, env.hasVideo);
    }

    private static string BuildResponseJson(TalkEnvelope env, BlobStorageService blob)
    {
        var node = JsonNode.Parse(env.sessionDataJson)?.AsObject() ?? new JsonObject();
        node["id"] = env.id;
        node["candidateId"] = env.candidateId;
        node["createdAt"] = env.createdAt;
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

// id/candidateId/createdAt/hasVideo/shareToken/isShared are first-class fields we control;
// sessionDataJson is the client's opaque metadata blob (subject, transcript, scores, duration,
// notesFileUrls) — merged back in at read time by BuildResponseJson.
public record TalkEnvelope(
    string id,
    string candidateId,
    string createdAt,
    bool hasVideo,
    string? shareToken,
    bool isShared,
    string sessionDataJson);

// Lightweight row for the My Talks list — no transcript, just enough to render a card.
public record TalkSummary(
    string id,
    string createdAt,
    string? subject,
    double overallScore,
    bool isShared,
    bool hasVideo);

// Body for POST /api/talks/visibility — the My Talks page's bulk public/private toggle.
public record VisibilityRequest(bool IsPublic);
