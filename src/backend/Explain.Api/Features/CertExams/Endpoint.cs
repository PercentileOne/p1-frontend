using System.Text.Json;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.CertExams;

/// <summary>
/// Completed Certifications &amp; Exams mock-exam sessions (v1: Microsoft AZ-104 only — see
/// certificationBank.ts). Same opaque-envelope storage shape as Features/Interviews/Endpoint.cs,
/// except certId/passed/scaledScore are pulled out as first-class fields (not buried in the
/// opaque blob) since a future "My Cert Exams" history list will want to sort/query by pass/fail
/// without parsing JSON — same reasoning as InterviewSummary's own overallScore field.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // POST /api/cert-exams — save a completed session.
        app.MapPost("/api/cert-exams", async (SaveRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            var envelope = new CertExamEnvelope(
                id: req.Id,
                candidateId: candidateId,
                createdAt: req.CreatedAt ?? DateTimeOffset.UtcNow.ToString("o"),
                certId: req.CertId,
                certName: req.CertName,
                passed: req.Passed,
                scaledScore: req.ScaledScore,
                maxScore: req.MaxScore,
                shareToken: null,
                isShared: false,
                sessionDataJson: JsonSerializer.Serialize(req.SessionData));

            var container = cosmos.GetContainer("certExamSessions");
            using var body = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(envelope));
            using var upsertResponse = await container.UpsertItemStreamAsync(body, new PartitionKey(candidateId));
            if (!upsertResponse.IsSuccessStatusCode)
                return Results.Problem("Failed to save cert exam session", statusCode: (int)upsertResponse.StatusCode);

            return Results.Ok(new { id = envelope.id });
        }).RequireAuthorization();

        // GET /api/cert-exams — the current candidate's own sessions, newest first.
        app.MapGet("/api/cert-exams", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("certExamSessions");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.candidateId = @cid").WithParameter("@cid", candidateId);
            var summaries = new List<CertExamSummary>();
            using var feed = container.GetItemQueryIterator<CertExamEnvelope>(
                query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(candidateId) });
            while (feed.HasMoreResults)
            {
                foreach (var env in await feed.ReadNextAsync())
                    summaries.Add(new CertExamSummary(env.id, env.createdAt, env.certId, env.certName, env.passed, env.scaledScore, env.maxScore, env.isShared));
            }
            return Results.Ok(summaries.OrderByDescending(s => s.createdAt));
        }).RequireAuthorization();

        // GET /api/cert-exams/{candidateId}/{id} — owner-only fetch, hydrates the summary page
        // when route state is empty (reload, revisit, direct link).
        app.MapGet("/api/cert-exams/{candidateId}/{id}", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("certExamSessions");
            var envelope = await ReadEnvelopeAsync(container, id, candidateId);
            if (envelope is null) return Results.NotFound();

            return Results.Ok(new
            {
                envelope.id,
                envelope.certId,
                envelope.certName,
                envelope.passed,
                envelope.scaledScore,
                envelope.maxScore,
                envelope.createdAt,
                envelope.shareToken,
                envelope.isShared,
                sessionData = JsonSerializer.Deserialize<JsonElement>(envelope.sessionDataJson),
            });
        }).RequireAuthorization();

        // POST /api/cert-exams/{candidateId}/{id}/share — publishes a shareable link. Idempotent,
        // same reasoning as Features/Interviews/Endpoint.cs's own share handler: reusing an
        // already-issued token means revisiting the summary page never invalidates a link a
        // candidate may have already posted.
        app.MapPost("/api/cert-exams/{candidateId}/{id}/share", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("certExamSessions");
            var envelope = await ReadEnvelopeAsync(container, id, candidateId);
            if (envelope is null) return Results.NotFound();

            string shareToken;
            if (envelope.isShared && !string.IsNullOrEmpty(envelope.shareToken))
            {
                shareToken = envelope.shareToken;
            }
            else
            {
                shareToken = Guid.NewGuid().ToString("N")[..10];
                var updated = envelope with { shareToken = shareToken, isShared = true };
                using var body = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(updated));
                using var upsertResponse = await container.UpsertItemStreamAsync(body, new PartitionKey(candidateId));
                if (!upsertResponse.IsSuccessStatusCode)
                    return Results.Problem("Failed to publish share link", statusCode: (int)upsertResponse.StatusCode);
            }

            var shareUrl = $"https://candidate.theinterviewchair.com/cert-exam-summary/{id}";
            return Results.Ok(new { shareToken, shareUrl });
        }).RequireAuthorization();

        // POST /api/cert-exams/{candidateId}/{id}/unshare — makes a previously-shared result
        // private again. Keeps the existing shareToken on the document rather than clearing it
        // (mirrors Features/Interviews/Endpoint.cs's own unshare exactly) — flipping back to
        // public later reactivates the exact same link instead of minting a new one.
        app.MapPost("/api/cert-exams/{candidateId}/{id}/unshare", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("certExamSessions");
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

        // DELETE /api/cert-exams/{candidateId}/{id}
        app.MapDelete("/api/cert-exams/{candidateId}/{id}", async (string candidateId, string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (candidateId != userId) return Results.Forbid();

            var container = cosmos.GetContainer("certExamSessions");
            try
            {
                await container.DeleteItemStreamAsync(id, new PartitionKey(candidateId));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { /* already gone */ }
            return Results.NoContent();
        }).RequireAuthorization();
    }

    private static async Task<CertExamEnvelope?> ReadEnvelopeAsync(Container container, string id, string candidateId)
    {
        using var response = await container.ReadItemStreamAsync(id, new PartitionKey(candidateId));
        if (!response.IsSuccessStatusCode) return null;
        return await JsonSerializer.DeserializeAsync<CertExamEnvelope>(response.Content);
    }

    public record SaveRequest(string Id, string? CreatedAt, string CertId, string CertName, bool Passed, int ScaledScore, int MaxScore, JsonElement SessionData);
}

// id/candidateId/createdAt/certId/passed/scaledScore/maxScore/shareToken/isShared are first-class
// fields; sessionDataJson holds the per-question answers + domain-accuracy breakdown, same
// opaque-blob-for-the-rest pattern as Features/Interviews/Endpoint.cs's InterviewEnvelope.
public record CertExamEnvelope(
    string id,
    string candidateId,
    string createdAt,
    string certId,
    string certName,
    bool passed,
    int scaledScore,
    int maxScore,
    string? shareToken,
    bool isShared,
    string sessionDataJson);

public record CertExamSummary(
    string id,
    string createdAt,
    string certId,
    string certName,
    bool passed,
    int scaledScore,
    int maxScore,
    bool isShared);
