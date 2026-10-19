using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.CvAnalysis;

/// <summary>
/// The CV Analysis tab on a profile (Francis, 2026-10-19). A person chooses to show one of their own saved analyses on their profile; it is OFF until they switch it on. What other people
/// see is the same positives-only view a shared link gives (skills, roles that fit, what is hot), built by Endpoint.ToPublicView, so weaknesses never reach another person.
/// Only analyses saved from the candidate portal can be shown (a recruiter's analysis of a candidate is never put on that candidate's profile).
/// The setting lives in the person's own partition of the "planning" container as "profile-cv"; the analyses themselves are in "cvAnalysisHistory". Both are cleared when the account is deleted.
/// </summary>
public static class ProfileEndpoint
{
    private const string SettingId = "profile-cv";

    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/cv-analysis/profile").RequireAuthorization().WithTags("CvAnalysisProfile");

        // Switch the profile tab on or off, and choose which saved analysis it shows (the newest if none is named). Switching it off keeps the choice.
        group.MapPut("", async (SettingRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var me = UserId(ctx); if (me is null) return Results.Unauthorized();
            var existing = await LoadSettingAsync(cosmos, me, ct);
            var recordId = existing.recordId;
            if (req.On)
            {
                var chosen = ChooseRecord(await CandidateRecordsAsync(cosmos, me, ct), req.RecordId ?? existing.recordId);
                if (chosen is null) return Results.BadRequest(new { error = "Analyse your CV and press Share first, then you can show it on your profile." });
                recordId = chosen.id;
            }
            else if (!string.IsNullOrWhiteSpace(req.RecordId)) recordId = req.RecordId;
            var saved = existing with { enabled = req.On, recordId = recordId, updatedAt = DateTimeOffset.UtcNow.ToString("o") };
            await cosmos.GetContainer("planning").UpsertItemAsync(saved, new PartitionKey(me), cancellationToken: ct);
            return Results.Ok(new SettingReply(saved.enabled, saved.recordId));
        });

        // Someone's CV analysis for their profile. Other people get it only if the owner switched it on; the owner always sees their own (with the switch state) so they can preview it.
        // Anyone who may not see it gets the same plain answer, so it never reveals whether that person has an analysis.
        group.MapGet("/{userId}", async (string userId, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var me = UserId(ctx); if (me is null) return Results.Unauthorized();
            var setting = await LoadSettingAsync(cosmos, userId, ct);
            if (!CanSee(me, userId, setting.enabled)) return Results.Ok(new ProfileCvReply(false, false, null, null));

            var chosen = ChooseRecord(await CandidateRecordsAsync(cosmos, userId, ct), setting.recordId);
            if (chosen is null) return Results.Ok(new ProfileCvReply(me == userId && setting.enabled, false, null, null));
            return Results.Ok(new ProfileCvReply(setting.enabled, true, Endpoint.ToPublicView(chosen), chosen.id));
        });
    }

    // ---- pure rules (tested) ----

    /// <summary>The owner always; anyone else only while the owner has switched it on.</summary>
    public static bool CanSee(string viewer, string owner, bool enabled) => viewer == owner || enabled;

    /// <summary>The record to show: the one named if it is among the person's own, otherwise their newest. Only candidate-portal analyses count.</summary>
    public static CvAnalysisHistoryRecord? ChooseRecord(IEnumerable<CvAnalysisHistoryRecord> records, string? preferredId)
    {
        var mine = records.Where(r => r.portal == "candidate").ToList();
        if (mine.Count == 0) return null;
        return mine.FirstOrDefault(r => r.id == preferredId) ?? mine.OrderByDescending(r => r.createdAt, StringComparer.Ordinal).First();
    }

    // ---- storage ----

    private static async Task<List<CvAnalysisHistoryRecord>> CandidateRecordsAsync(CosmosService cosmos, string ownerId, CancellationToken ct)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.ownerId = @o").WithParameter("@o", ownerId);
        var list = new List<CvAnalysisHistoryRecord>();
        using var feed = cosmos.GetContainer("cvAnalysisHistory").GetItemQueryIterator<CvAnalysisHistoryRecord>(query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(ownerId) });
        while (feed.HasMoreResults) list.AddRange(await feed.ReadNextAsync(ct));
        return list;
    }

    private static async Task<ProfileCvSetting> LoadSettingAsync(CosmosService cosmos, string userId, CancellationToken ct)
    {
        try { return (await cosmos.GetContainer("planning").ReadItemAsync<ProfileCvSetting>(SettingId, new PartitionKey(userId), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return new ProfileCvSetting(SettingId, userId, SettingId, false, null, DateTimeOffset.UtcNow.ToString("o")); }
    }

    private static string? UserId(HttpContext ctx) => ctx.User.FindFirst("sub")?.Value is { Length: > 0 } s ? s : null;

    public record SettingRequest(bool On, string? RecordId = null);
    public record SettingReply(bool enabled, string? recordId);
    public record ProfileCvSetting(string id, string userId, string type, bool enabled, string? recordId, string updatedAt);
    public record ProfileCvReply(bool enabled, bool visible, SharedCvView? view, string? recordId);
}
