using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.SavedCv;

/// <summary>
/// The CV a candidate used last time (Francis, 2026-10-04: "on Jobserve I can select the CV I used last time" — having to upload it for every interview is
/// annoying). One document per candidate, id = the candidate's own id (see the CLAUDE.md note on documents keyed by a user id: the id is set explicitly, never
/// left to a default). Saved automatically when they start an interview with a CV; they can remove it at any time, and deleting their account removes it too
/// (AccountDeletionService).
/// </summary>
public static class Endpoint
{
    private const int MaxChars = 30_000;

    public static void Map(WebApplication app)
    {
        app.MapGet("/api/me/cv", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();
            try
            {
                var resp = await cosmos.GetContainer("savedCvs").ReadItemAsync<SavedCvDoc>(candidateId, new PartitionKey(candidateId));
                return Results.Ok(new { hasCv = true, fileName = resp.Resource.fileName, text = resp.Resource.text, updatedAt = resp.Resource.updatedAt });
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return Results.Ok(new { hasCv = false }); }
        })
        .WithName("GetSavedCv").WithTags("SavedCv")
        .RequireAuthorization(Permissions.PracticeInterview);

        app.MapPut("/api/me/cv", async (SaveRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();
            var text = (req.Text ?? "").Trim();
            if (text.Length < 20) return Results.BadRequest(new { error = "There is no CV text to save." });
            var name = (req.FileName ?? "").Trim();
            var doc = new SavedCvDoc(
                id: candidateId, candidateId: candidateId,
                fileName: name.Length == 0 ? "My CV" : name[..Math.Min(name.Length, 120)],
                text: text[..Math.Min(text.Length, MaxChars)],
                updatedAt: DateTimeOffset.UtcNow.ToString("o"));
            await cosmos.GetContainer("savedCvs").UpsertItemAsync(doc, new PartitionKey(candidateId));
            return Results.Ok(new { saved = true, fileName = doc.fileName, updatedAt = doc.updatedAt });
        })
        .WithName("SaveSavedCv").WithTags("SavedCv")
        .RequireAuthorization(Permissions.PracticeInterview);

        app.MapDelete("/api/me/cv", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();
            try { await cosmos.GetContainer("savedCvs").DeleteItemAsync<SavedCvDoc>(candidateId, new PartitionKey(candidateId)); }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { /* already gone */ }
            return Results.Ok(new { removed = true });
        })
        .WithName("DeleteSavedCv").WithTags("SavedCv")
        .RequireAuthorization(Permissions.PracticeInterview);
    }

    public record SaveRequest(string? FileName, string? Text);
    public record SavedCvDoc(string id, string candidateId, string fileName, string text, string updatedAt);
}
