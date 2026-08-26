using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Organisations.Members;

/// <summary>
/// Adding an org member links an EXISTING user account (by email) — orgs don't self-register
/// members, and this doesn't create accounts. The person must already have registered on the
/// platform (as any role) before an admin can attach them to an organisation.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/admin/organisations/{id:int}/members", async (int id, AddRequest req, AppDbContext db) =>
        {
            var org = await db.Organisations.FindAsync(id);
            if (org is null) return Results.NotFound(new { error = "Organisation not found." });

            if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
                return Results.BadRequest(new { error = "A valid email is required." });

            var email = req.Email.Trim().ToLower();
            var user  = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user is null)
                return Results.BadRequest(new { error = "No account exists with that email yet — the person must register on the platform first." });

            var already = await db.OrganisationMembers.AnyAsync(m => m.OrganisationId == id && m.UserId == user.Id);
            if (already)
                return Results.Conflict(new { error = "That person is already a member of this organisation." });

            var member = new OrganisationMember
            {
                OrganisationId = id,
                UserId         = user.Id,
                Role           = req.Role is "admin" ? "admin" : "member",
            };

            db.OrganisationMembers.Add(member);
            await db.SaveChangesAsync();

            return Results.Created($"/api/admin/organisations/{id}/members/{member.Id}", new
            {
                member.Id, member.UserId, Name = $"{user.FirstName} {user.LastName}".Trim(), user.Email, member.Role, member.JoinedAt,
            });
        })
        .WithName("AddOrganisationMember").WithTags("Organisations")
        .RequireAuthorization(Permissions.ManageOrganisations);

        app.MapDelete("/api/admin/organisations/{id:int}/members/{memberId:int}", async (int id, int memberId, AppDbContext db) =>
        {
            var member = await db.OrganisationMembers.FirstOrDefaultAsync(m => m.Id == memberId && m.OrganisationId == id);
            if (member is null) return Results.NotFound(new { error = "Member not found." });

            db.OrganisationMembers.Remove(member);
            await db.SaveChangesAsync();
            return Results.NoContent();
        })
        .WithName("RemoveOrganisationMember").WithTags("Organisations")
        .RequireAuthorization(Permissions.ManageOrganisations);
    }

    public record AddRequest(string Email, string? Role);
}
