using System.Text;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Domain.Profile;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Geo;

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
        app.MapGet("/api/candidates/search", async (
            CosmosService cosmos, AzureMapsGeocodingService geocoding,
            string? q, string? location, string? interest, string? role,
            string? employmentType, string? remote, string? country, int? minScore, int? radiusMiles,
            int page = 1, int size = 20, CancellationToken ct = default) =>
        {
            var container = cosmos.GetContainer("profiles");

            // If a radius was picked alongside a location, try geocoding it — a real
            // ST_DISTANCE clause replaces the plain-text location match below. A failed or
            // unconfigured geocode (or no radius picked at all) falls straight back to the
            // original CONTAINS(location) match, unaffected — every candidate stays findable
            // by plain text regardless of whether they (or this search) are geocoded.
            GeoPoint? searchPoint = null;
            if (!string.IsNullOrWhiteSpace(location) && radiusMiles is not null)
            {
                var geo = await geocoding.GeocodeAsync(location.Trim(), ct);
                if (geo is not null) searchPoint = new GeoPoint { Coordinates = [geo.Lon, geo.Lat] };
            }

            // searchableByRecruiters = true is always present — opted-out profiles never
            // leave Cosmos in bulk. Every other param is optional, appended conditionally
            // so unused parameters are never bound (Cosmos rejects a bound param not present
            // in the query text).
            var sql = new StringBuilder("SELECT * FROM c WHERE c.searchableByRecruiters = true");
            if (!string.IsNullOrWhiteSpace(q))
                sql.Append(" AND (CONTAINS(LOWER(c.name), @q) OR CONTAINS(LOWER(c.bio), @q) OR CONTAINS(LOWER(c.jobTitle), @q) OR CONTAINS(LOWER(c.jobRole), @q) OR CONTAINS(LOWER(c.company), @q) OR EXISTS(SELECT VALUE i FROM i IN c.interests WHERE CONTAINS(LOWER(i), @q)))");
            if (searchPoint is not null)
                sql.Append(" AND IS_DEFINED(c.locationGeo) AND ST_DISTANCE(c.locationGeo, @searchPoint) <= @radiusMeters");
            else if (!string.IsNullOrWhiteSpace(location))
                sql.Append(" AND CONTAINS(LOWER(c.location), @location)");
            if (!string.IsNullOrWhiteSpace(interest))
                sql.Append(" AND EXISTS(SELECT VALUE i FROM i IN c.interests WHERE CONTAINS(LOWER(i), @interest))");
            if (!string.IsNullOrWhiteSpace(role))
                sql.Append(" AND (CONTAINS(LOWER(c.jobRole), @role) OR CONTAINS(LOWER(c.jobTitle), @role))");
            if (!string.IsNullOrWhiteSpace(employmentType))
                sql.Append(" AND LOWER(c.employmentTypePreference) = @employmentType");
            if (!string.IsNullOrWhiteSpace(remote))
                sql.Append(" AND LOWER(c.remotePreference) = @remote");
            if (!string.IsNullOrWhiteSpace(country))
                sql.Append(" AND LOWER(c.country) = @country");
            if (minScore is not null)
                sql.Append(" AND IS_DEFINED(c.bestScore) AND c.bestScore >= @minScore");

            var definition = new QueryDefinition(sql.ToString());
            if (!string.IsNullOrWhiteSpace(q)) definition = definition.WithParameter("@q", q.Trim().ToLowerInvariant());
            if (searchPoint is not null)
            {
                definition = definition.WithParameter("@searchPoint", searchPoint);
                definition = definition.WithParameter("@radiusMeters", radiusMiles!.Value * 1609.34);
            }
            else if (!string.IsNullOrWhiteSpace(location))
            {
                definition = definition.WithParameter("@location", location.Trim().ToLowerInvariant());
            }
            if (!string.IsNullOrWhiteSpace(interest)) definition = definition.WithParameter("@interest", interest.Trim().ToLowerInvariant());
            if (!string.IsNullOrWhiteSpace(role)) definition = definition.WithParameter("@role", role.Trim().ToLowerInvariant());
            if (!string.IsNullOrWhiteSpace(employmentType)) definition = definition.WithParameter("@employmentType", employmentType.Trim().ToLowerInvariant());
            if (!string.IsNullOrWhiteSpace(remote)) definition = definition.WithParameter("@remote", remote.Trim().ToLowerInvariant());
            if (!string.IsNullOrWhiteSpace(country)) definition = definition.WithParameter("@country", country.Trim().ToLowerInvariant());
            if (minScore is not null) definition = definition.WithParameter("@minScore", minScore.Value);

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
