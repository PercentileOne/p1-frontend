using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.NameGreetings.Admin;

/// <summary>
/// Read-only visibility into every cached/attempted name-greeting doc — built as a debugging
/// tool the same day the kill switch shipped, once a real production generation succeeded on
/// D-ID's side but the resulting clip still didn't play, and there was no way to see the
/// doc's actual status without raw Cosmos access.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // GET /api/admin/name-greetings — every doc, newest first. Small table at this volume;
        // no pagination yet (see Explicitly out of scope in the shipped plan for the fuller
        // searchable/sortable/paged view).
        app.MapGet("/api/admin/name-greetings", async (CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("nameGreetings");
            var query = new QueryDefinition("SELECT * FROM c");
            var all = new List<NameGreeting>();
            using var feed = container.GetItemQueryIterator<NameGreeting>(query);
            while (feed.HasMoreResults)
                all.AddRange(await feed.ReadNextAsync());

            return Results.Ok(all.OrderByDescending(g => g.generatedAt));
        }).RequireAuthorization(Permissions.ViewSystemSettings);
    }
}
