using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Events.Admin;

/// <summary>
/// Admin-facing search/list over the hot (10-day) system event window — see Features/Events for
/// ingestion and Features/Events/EventsArchiveService.cs for what happens to older data. Deep
/// historical search over the permanent Blob archive is a deliberate v2 problem, not solved here.
///
/// Response shape matches Features/Users/List/Endpoint.cs's existing convention
/// ({ total, page, size, rows }) for consistency with the rest of the admin portal.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/admin/events", async (
            CosmosService cosmos,
            string? userId, string? email, string? eventType, string? portal,
            DateTimeOffset? from, DateTimeOffset? to,
            int page = 1, int size = 50) =>
        {
            page = Math.Max(1, page);
            size = Math.Clamp(size, 1, 200);

            var container = cosmos.GetContainer("systemEvents");
            var (whereClause, parameters) = BuildFilter(userId, email, eventType, portal, from, to);

            var countQuery = new QueryDefinition($"SELECT VALUE COUNT(1) FROM c{whereClause}");
            foreach (var p in parameters) countQuery = countQuery.WithParameter(p.Name, p.Value);
            var total = 0;
            using (var countFeed = container.GetItemQueryIterator<int>(countQuery))
                if (countFeed.HasMoreResults) total = (await countFeed.ReadNextAsync()).FirstOrDefault();

            var rowsQuery = new QueryDefinition(
                $"SELECT * FROM c{whereClause} ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit")
                .WithParameter("@offset", (page - 1) * size)
                .WithParameter("@limit", size);
            foreach (var p in parameters) rowsQuery = rowsQuery.WithParameter(p.Name, p.Value);

            var rows = new List<SystemEventDoc>();
            using (var feed = container.GetItemQueryIterator<SystemEventDoc>(rowsQuery))
                while (feed.HasMoreResults)
                    rows.AddRange(await feed.ReadNextAsync());

            return Results.Ok(new { total, page, size, rows });
        })
        .WithName("ListSystemEvents").WithTags("Events")
        // Matches Users/List/Endpoint.cs's own gate — CAN_VIEW_ADMIN_PORTAL, not the stricter
        // CAN_VIEW_SYSTEM_SETTINGS the original plan sketch assumed. Confirmed via the real DB
        // migration seed (20260731170031_AddRbacRolesAndPermissions.cs) that CAN_VIEW_SYSTEM_SETTINGS
        // is SuperAdmin-only, not granted to the plain Admin role — using it here would have
        // silently locked a regular Admin account (Francis's own, day to day) out of a page they
        // explicitly asked for. CAN_VIEW_ADMIN_PORTAL is confirmed granted to Admin and is the
        // baseline "can see admin-portal pages at all" gate every other read-only list here uses.
        .RequireAuthorization(Permissions.ViewAdminPortal);
    }

    private static (string WhereClause, List<(string Name, object Value)> Parameters) BuildFilter(
        string? userId, string? email, string? eventType, string? portal, DateTimeOffset? from, DateTimeOffset? to)
    {
        var clauses = new List<string>();
        var parameters = new List<(string, object)>();

        if (!string.IsNullOrWhiteSpace(userId))
        {
            clauses.Add("c.userId = @userId");
            parameters.Add(("@userId", userId.Trim()));
        }
        if (!string.IsNullOrWhiteSpace(email))
        {
            clauses.Add("CONTAINS(LOWER(c.email), @email)");
            parameters.Add(("@email", email.Trim().ToLowerInvariant()));
        }
        if (!string.IsNullOrWhiteSpace(eventType))
        {
            clauses.Add("c.eventType = @eventType");
            parameters.Add(("@eventType", eventType.Trim()));
        }
        if (!string.IsNullOrWhiteSpace(portal))
        {
            clauses.Add("c.portal = @portal");
            parameters.Add(("@portal", portal.Trim()));
        }
        if (from is not null)
        {
            clauses.Add("c.createdAt >= @from");
            parameters.Add(("@from", from.Value.ToString("o")));
        }
        if (to is not null)
        {
            clauses.Add("c.createdAt <= @to");
            parameters.Add(("@to", to.Value.ToString("o")));
        }

        var whereClause = clauses.Count == 0 ? "" : " WHERE " + string.Join(" AND ", clauses);
        return (whereClause, parameters);
    }
}
