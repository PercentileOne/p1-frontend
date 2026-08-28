using System.Text.Json;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Features.Interviews;

namespace Explain.Api.Features.Interviews.Admin;

/// <summary>
/// Admin-wide interview oversight — every saved session across every candidate, newest
/// first. Read-only list, not a full viewer: "View" only works for interviews the
/// candidate already shared (opens the existing public /shared/{token} page candidate
/// portal already renders); a private admin video/transcript viewer for un-shared
/// sessions would be a separate, bigger piece of work.
///
/// candidateName/role/company/overallScore/questionCount are all read straight out of the
/// sessionDataJson blob each session already carries (see Features/Interviews/Endpoint.cs)
/// rather than joining SQL — candidateName has been embedded in every upload's payload
/// since that field was added, so no cross-database lookup is needed for the common case.
/// </summary>
public static class Endpoint
{
    private static readonly JsonSerializerOptions _json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public static void Map(WebApplication app)
    {
        app.MapGet("/api/admin/interviews", async (CosmosService cosmos, string? search, int page = 1, int size = 50) =>
        {
            var container = cosmos.GetContainer("interviews");

            // Cross-partition scan, capped at 1000 most-recent sessions — fine at today's
            // volume; if this ever needs to page past that, add a composite index on
            // (createdAt) and switch to continuation-token paging instead of an in-memory cap.
            var query = new QueryDefinition("SELECT * FROM c ORDER BY c.createdAt DESC");
            var envelopes = new List<InterviewEnvelope>();
            using var feed = container.GetItemQueryIterator<InterviewEnvelope>(query, requestOptions: new QueryRequestOptions { MaxItemCount = 200 });
            while (feed.HasMoreResults && envelopes.Count < 1000)
            {
                envelopes.AddRange(await feed.ReadNextAsync());
            }

            var rows = envelopes.Select(ToAdminRow).ToList();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLowerInvariant();
                rows = rows.Where(r =>
                    r.CandidateName.ToLowerInvariant().Contains(term) ||
                    (r.Role?.ToLowerInvariant().Contains(term) ?? false) ||
                    (r.Company?.ToLowerInvariant().Contains(term) ?? false)
                ).ToList();
            }

            var total = rows.Count;
            var pageRows = rows.Skip((page - 1) * size).Take(size).ToList();

            return Results.Ok(new { total, page, size, rows = pageRows });
        })
        .WithName("ListAllInterviews").WithTags("Interviews")
        .RequireAuthorization(Permissions.ViewAllInterviews);
    }

    private static AdminInterviewRow ToAdminRow(InterviewEnvelope env)
    {
        string candidateName = "Unknown candidate";
        string? role = null, company = null;
        double overallScore = 0;
        int questionCount = 0;

        try
        {
            using var doc = JsonDocument.Parse(env.sessionDataJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("candidateName", out var cn) && cn.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(cn.GetString()))
                candidateName = cn.GetString()!;
            if (root.TryGetProperty("role", out var r) && r.ValueKind == JsonValueKind.String) role = r.GetString();
            if (root.TryGetProperty("company", out var c) && c.ValueKind == JsonValueKind.String) company = c.GetString();
            if (root.TryGetProperty("overallScore", out var s) && s.ValueKind == JsonValueKind.Number) overallScore = s.GetDouble();
            if (root.TryGetProperty("answers", out var a) && a.ValueKind == JsonValueKind.Array) questionCount = a.GetArrayLength();
        }
        catch (JsonException) { /* malformed sessionDataJson — row just shows defaults */ }

        return new AdminInterviewRow(
            env.id, env.candidateId, candidateName, env.createdAt,
            role, company, overallScore, questionCount,
            env.isShared, env.hasVideo, env.isShared ? env.shareToken : null);
    }
}

public record AdminInterviewRow(
    string Id, string CandidateId, string CandidateName, string CreatedAt,
    string? Role, string? Company, double OverallScore, int QuestionCount,
    bool IsShared, bool HasVideo, string? ShareToken);
