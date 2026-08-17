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
        app.MapPost("/api/interviews/upload", async (HttpRequest req, CosmosService cosmos, BlobStorageService blob) =>
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

            string? videoUrl = null;
            var videoFile = form.Files["video"];
            if (videoFile is not null && videoFile.Length > 0 && blob.IsConfigured)
            {
                await using var stream = videoFile.OpenReadStream();
                videoUrl = await blob.UploadAsync(candidateId, interviewId, stream, videoFile.ContentType ?? "video/webm");
            }

            var envelope = new InterviewEnvelope(
                id: interviewId,
                candidateId: candidateId,
                createdAt: DateTimeOffset.UtcNow.ToString("o"),
                videoUrl: videoUrl,
                shareToken: null,
                isShared: false,
                sessionDataJson: metadataJson);

            var container = cosmos.GetContainer("interviews");
            using var body = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(envelope));
            using var upsertResponse = await container.UpsertItemStreamAsync(body, new PartitionKey(candidateId));
            if (!upsertResponse.IsSuccessStatusCode)
                return Results.Problem("Failed to save interview session", statusCode: (int)upsertResponse.StatusCode);

            return Results.Ok(new { id = interviewId, videoSaved = videoUrl is not null });
        }).RequireAuthorization().DisableAntiforgery();

        // POST /api/interviews/{candidateId}/{id}/share — publishes a shareable link + QR code.
        app.MapPost("/api/interviews/{candidateId}/{id}/share", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("interviews");
            var envelope = await ReadEnvelopeAsync(container, id, candidateId);
            if (envelope is null) return Results.NotFound();

            var shareToken = GenerateShareToken();
            var updated = envelope with { shareToken = shareToken, isShared = true };
            using var body = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(updated));
            using var upsertResponse = await container.UpsertItemStreamAsync(body, new PartitionKey(candidateId));
            if (!upsertResponse.IsSuccessStatusCode)
                return Results.Problem("Failed to publish share link", statusCode: (int)upsertResponse.StatusCode);

            var shareUrl = $"{ShareBaseUrl}/{shareToken}";
            return Results.Ok(new { shareToken, shareUrl, qrDataUri = GenerateQrDataUri(shareUrl) });
        }).RequireAuthorization();

        // GET /api/interviews/{candidateId}/{id} — owner-only fetch, used by the summary page
        // to hydrate itself when React Router state is empty (reload, revisit, direct link).
        app.MapGet("/api/interviews/{candidateId}/{id}", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("interviews");
            var envelope = await ReadEnvelopeAsync(container, id, candidateId);
            return envelope is null ? Results.NotFound() : Results.Text(BuildResponseJson(envelope), "application/json");
        }).RequireAuthorization();

        // GET /api/interviews/shared/{shareToken} — public view for a shared link/QR scan.
        app.MapGet("/api/interviews/shared/{shareToken}", async (string shareToken, CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("interviews");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.shareToken = @token AND c.isShared = true")
                .WithParameter("@token", shareToken);
            using var feed = container.GetItemQueryIterator<InterviewEnvelope>(query);
            if (feed.HasMoreResults)
            {
                var page = await feed.ReadNextAsync();
                var envelope = page.FirstOrDefault();
                if (envelope is not null) return Results.Text(BuildResponseJson(envelope), "application/json");
            }
            return Results.NotFound();
        }).AllowAnonymous();

        // DELETE /api/interviews/{candidateId}/{id} — "Discard, it was practice".
        app.MapDelete("/api/interviews/{candidateId}/{id}", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos) =>
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
            return Results.NoContent();
        }).RequireAuthorization();
    }

    private static async Task<InterviewEnvelope?> ReadEnvelopeAsync(Container container, string id, string candidateId)
    {
        using var response = await container.ReadItemStreamAsync(id, new PartitionKey(candidateId));
        if (!response.IsSuccessStatusCode) return null;
        return await JsonSerializer.DeserializeAsync<InterviewEnvelope>(response.Content);
    }

    private static string BuildResponseJson(InterviewEnvelope env)
    {
        var node = JsonNode.Parse(env.sessionDataJson)?.AsObject() ?? new JsonObject();
        node["id"] = env.id;
        node["candidateId"] = env.candidateId;
        node["createdAt"] = env.createdAt;
        node["videoUrl"] = env.videoUrl;
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

// candidateId/id/createdAt/videoUrl/shareToken/isShared are first-class fields we control;
// sessionDataJson is the client's opaque metadata blob (answers, mcq*, chapters, cvCtx, jobCtx,
// role, company, overallScore) — merged back in at read time by BuildResponseJson.
public record InterviewEnvelope(
    string id,
    string candidateId,
    string createdAt,
    string? videoUrl,
    string? shareToken,
    bool isShared,
    string sessionDataJson);
