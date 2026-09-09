using System.Text.Json;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.InDemandSubjects;

/// <summary>
/// "In Demand Subjects" — logs the topics a candidate actually kept in the intake screen's
/// Special Focus field at the moment they start a real interview. Deliberately NOT logged for
/// "What's Hot" suggestions themselves (that's a pure frontend AI-proxy call, no backend
/// awareness of it at all) — only what survives the candidate's own keep/discard curation and
/// is genuinely used to shape that session's questions counts as real signal here.
///
/// One document per (job title, subject) pair with running counters, not one document per
/// event — this container exists to answer "what subjects get kept most for role X" cheaply,
/// which needs pre-aggregated counters, not a raw event log that has to be summed on every read.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/in-demand-subjects", async (LogSubjectsRequest req, HttpContext ctx, CosmosService cosmos, ILogger<Program> logger) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(req.JobTitle) || req.Subjects is not { Length: > 0 })
                return Results.BadRequest(new { error = "jobTitle and at least one subject are required" });

            var jobTitleKey = NormaliseKey(req.JobTitle);
            var container = cosmos.GetContainer("inDemandSubjects");
            var loggedCount = 0;

            foreach (var subject in req.Subjects.Distinct())
            {
                if (string.IsNullOrWhiteSpace(subject)) continue;
                var subjectKey = NormaliseKey(subject);
                var id = $"{jobTitleKey}:{subjectKey}";

                InDemandSubjectDoc doc;
                try
                {
                    var existing = await container.ReadItemAsync<InDemandSubjectDoc>(id, new PartitionKey(jobTitleKey));
                    doc = existing.Resource with { keptCount = existing.Resource.keptCount + 1, lastUpdated = DateTimeOffset.UtcNow.ToString("o") };
                }
                catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    doc = new InDemandSubjectDoc(id, jobTitleKey, req.JobTitle.Trim(), subject.Trim(), 1, DateTimeOffset.UtcNow.ToString("o"));
                }

                await container.UpsertItemAsync(doc, new PartitionKey(jobTitleKey));
                loggedCount++;
            }

            return Results.Ok(new { loggedCount });
        }).RequireAuthorization();

        // GET /api/in-demand-subjects/{jobTitle} — top kept subjects for a role, most-kept
        // first. Single-partition read (see partition key choice above) — cheap regardless of
        // total data volume. Used for future reporting/portal display, not yet wired into any
        // UI as of this endpoint's creation.
        app.MapGet("/api/in-demand-subjects/{jobTitle}", async (string jobTitle, CosmosService cosmos) =>
        {
            var jobTitleKey = NormaliseKey(jobTitle);
            var container = cosmos.GetContainer("inDemandSubjects");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.jobTitleKey = @key ORDER BY c.keptCount DESC")
                .WithParameter("@key", jobTitleKey);
            var results = new List<InDemandSubjectDoc>();
            using var feed = container.GetItemQueryIterator<InDemandSubjectDoc>(query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(jobTitleKey) });
            while (feed.HasMoreResults)
                results.AddRange(await feed.ReadNextAsync());
            return Results.Ok(results);
        }).AllowAnonymous();
    }

    private static string NormaliseKey(string value) =>
        value.Trim().ToLowerInvariant().Replace(' ', '-');
}

public record LogSubjectsRequest(string JobTitle, string[] Subjects);

public record InDemandSubjectDoc(
    string id,
    string jobTitleKey,
    string jobTitle,
    string subject,
    int keptCount,
    string lastUpdated);
