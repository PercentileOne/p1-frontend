using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Organisations.Team;

/// <summary>
/// Self-service "Team" page for recruiter/employer portal users (Francis, 2026-09-22) — a shared message feed for an organisation's
/// own people ("in my last role we used Teams for exactly that"), plus the seat roster so an org admin sees "8 of 10 seats used"
/// building before calling Francis for more, rather than finding out when an invite gets refused.
///
/// Every route resolves "which organisation am I in" from the caller's own JWT — never a route parameter — so nobody can read or
/// post into another organisation's team page this way. Admin org-management (add/remove members) stays in Features/Organisations/
/// Members/Endpoint.cs; this is deliberately a *smaller*, self-service surface any member (not just an org admin) can use.
/// </summary>
public static class Endpoint
{
    public record PostRequest(string? Text);
    public record TeamPostDoc(string id, string organisationId, string authorUserId, string authorName, string authorEmail, string authorRole, DateTimeOffset createdAt, string text);

    public static void Map(WebApplication app)
    {
        app.MapGet("/api/organisations/team", async (HttpContext ctx, AppDbContext db) =>
        {
            var org = await ResolveMyOrgAsync(ctx, db);
            if (org is null) return Results.NotFound(new { error = "You're not a member of an organisation." });

            var members = await db.OrganisationMembers.AsNoTracking()
                .Where(m => m.OrganisationId == org.Id)
                .Join(db.Users, m => m.UserId, u => u.Id, (m, u) => new { m.Id, m.UserId, m.Role, m.JoinedAt, u.FirstName, u.LastName, u.Email })
                .OrderBy(m => m.JoinedAt)
                .ToListAsync();

            return Results.Ok(new
            {
                organisationId = org.Id,
                organisationName = org.Name,
                seatCount = org.SeatCount,
                seatsUsed = members.Count,
                seatsRemaining = Math.Max(0, org.SeatCount - members.Count),
                members = members.Select(m => new { m.Id, m.UserId, Name = $"{m.FirstName} {m.LastName}".Trim(), m.Email, m.Role, m.JoinedAt }),
            });
        }).RequireAuthorization();

        app.MapGet("/api/organisations/team/posts", async (HttpContext ctx, AppDbContext db, CosmosService cosmos, int limit) =>
        {
            var org = await ResolveMyOrgAsync(ctx, db);
            if (org is null) return Results.NotFound(new { error = "You're not a member of an organisation." });

            var take = Math.Clamp(limit <= 0 ? 60 : limit, 1, 200);
            var container = cosmos.GetContainer("teamPosts");
            var pk = org.Id.ToString();
            var iterator = container.GetItemQueryIterator<TeamPostDoc>(
                new QueryDefinition("SELECT * FROM c WHERE c.organisationId = @oid ORDER BY c.createdAt DESC").WithParameter("@oid", pk),
                requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(pk), MaxItemCount = take });

            var posts = new List<TeamPostDoc>();
            while (iterator.HasMoreResults && posts.Count < take)
            {
                var page = await iterator.ReadNextAsync();
                posts.AddRange(page);
                if (posts.Count >= take) break;
            }
            return Results.Ok(posts.Take(take));
        }).RequireAuthorization();

        app.MapPost("/api/organisations/team/posts", async (PostRequest req, HttpContext ctx, AppDbContext db, CosmosService cosmos) =>
        {
            var org = await ResolveMyOrgAsync(ctx, db);
            if (org is null) return Results.NotFound(new { error = "You're not a member of an organisation." });

            var text = (req.Text ?? "").Trim();
            if (text.Length == 0) return Results.BadRequest(new { error = "Write something before posting." });
            if (text.Length > 2000) text = text[..2000];

            var userId = ctx.User.FindFirst("sub")?.Value ?? "";
            var user = await db.Users.FindAsync(userId);
            if (user is null) return Results.Unauthorized();
            var role = await db.OrganisationMembers.AsNoTracking().Where(m => m.OrganisationId == org.Id && m.UserId == userId).Select(m => m.Role).FirstOrDefaultAsync() ?? "member";

            var doc = new TeamPostDoc(
                id: Guid.NewGuid().ToString("N"),
                organisationId: org.Id.ToString(),
                authorUserId: userId,
                authorName: $"{user.FirstName} {user.LastName}".Trim() is { Length: > 0 } n ? n : user.Email,
                authorEmail: user.Email,
                authorRole: role,
                createdAt: DateTimeOffset.UtcNow,
                text: text);

            await cosmos.GetContainer("teamPosts").CreateItemAsync(doc, new PartitionKey(doc.organisationId));
            return Results.Created($"/api/organisations/team/posts/{doc.id}", doc);
        }).RequireAuthorization();

        app.MapDelete("/api/organisations/team/posts/{id}", async (string id, HttpContext ctx, AppDbContext db, CosmosService cosmos) =>
        {
            var org = await ResolveMyOrgAsync(ctx, db);
            if (org is null) return Results.NotFound(new { error = "You're not a member of an organisation." });

            var userId = ctx.User.FindFirst("sub")?.Value ?? "";
            var isOrgAdmin = await db.OrganisationMembers.AsNoTracking().AnyAsync(m => m.OrganisationId == org.Id && m.UserId == userId && m.Role == "admin");

            var container = cosmos.GetContainer("teamPosts");
            var pk = new PartitionKey(org.Id.ToString());
            TeamPostDoc existing;
            try { existing = await container.ReadItemAsync<TeamPostDoc>(id, pk); }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return Results.NotFound(new { error = "Post not found." }); }

            if (existing.authorUserId != userId && !isOrgAdmin)
                return Results.Json(new { error = "You can only delete your own posts." }, statusCode: 403);

            await container.DeleteItemAsync<TeamPostDoc>(id, pk);
            return Results.NoContent();
        }).RequireAuthorization();
    }

    // A user could theoretically belong to more than one organisation in the data model, but nothing in the product creates that
    // today — Org Member Invite always links one person to one org. Take the first membership found; if that assumption ever
    // breaks, this becomes the one place that needs to grow a "which org" selector, not every route above individually.
    private static async Task<Organisation?> ResolveMyOrgAsync(HttpContext ctx, AppDbContext db)
    {
        var userId = ctx.User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId)) return null;
        var orgId = await db.OrganisationMembers.AsNoTracking().Where(m => m.UserId == userId).Select(m => (int?)m.OrganisationId).FirstOrDefaultAsync();
        if (orgId is null) return null;
        return await db.Organisations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orgId);
    }
}
