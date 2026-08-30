using System.Text;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Domain.Profile;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.CandidateSearch;

/// <summary>
/// Recruiters/employers searching for candidates who've opted in (UserProfile.SearchableByRecruiters,
/// off by default). Only ever returns a strict subset of PublicProfile's own field set — see
/// CandidateSearchResult's own doc comment for why that boundary matters.
///
/// Cross-partition scan, capped at 1000 profiles — same accepted shortcut as
/// Features/Interviews/Admin/Endpoint.cs, for the same reason: fine at today's volume, would
/// need a composite index + continuation-token paging if this ever needs to page past that.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/candidates/search", async (CosmosService cosmos, string? q, string? location, string? interest, int page = 1, int size = 20) =>
        {
            var container = cosmos.GetContainer("profiles");

            // searchableByRecruiters = true is always present — opted-out profiles never
            // leave Cosmos in bulk. q/location/interest are optional, appended conditionally
            // so unused parameters are never bound (Cosmos rejects a bound param not present
            // in the query text).
            var sql = new StringBuilder("SELECT * FROM c WHERE c.searchableByRecruiters = true");
            if (!string.IsNullOrWhiteSpace(q))
                sql.Append(" AND (CONTAINS(LOWER(c.name), @q) OR CONTAINS(LOWER(c.bio), @q) OR CONTAINS(LOWER(c.jobTitle), @q) OR CONTAINS(LOWER(c.jobRole), @q) OR CONTAINS(LOWER(c.company), @q) OR EXISTS(SELECT VALUE i FROM i IN c.interests WHERE CONTAINS(LOWER(i), @q)))");
            if (!string.IsNullOrWhiteSpace(location))
                sql.Append(" AND CONTAINS(LOWER(c.location), @location)");
            if (!string.IsNullOrWhiteSpace(interest))
                sql.Append(" AND EXISTS(SELECT VALUE i FROM i IN c.interests WHERE CONTAINS(LOWER(i), @interest))");

            var definition = new QueryDefinition(sql.ToString());
            if (!string.IsNullOrWhiteSpace(q)) definition = definition.WithParameter("@q", q.Trim().ToLowerInvariant());
            if (!string.IsNullOrWhiteSpace(location)) definition = definition.WithParameter("@location", location.Trim().ToLowerInvariant());
            if (!string.IsNullOrWhiteSpace(interest)) definition = definition.WithParameter("@interest", interest.Trim().ToLowerInvariant());

            var profiles = new List<UserProfile>();
            using var feed = container.GetItemQueryIterator<UserProfile>(definition, requestOptions: new QueryRequestOptions { MaxItemCount = 200 });
            while (feed.HasMoreResults && profiles.Count < 1000)
            {
                profiles.AddRange(await feed.ReadNextAsync());
            }

            var total = profiles.Count;
            var pageRows = profiles.Skip((page - 1) * size).Take(size).Select(CandidateSearchResult.From).ToList();

            return Results.Ok(new { total, page, size, rows = pageRows });
        })
        .WithName("SearchCandidates").WithTags("CandidateSearch")
        .RequireAuthorization(Permissions.ViewCandidateProfile);
    }
}
