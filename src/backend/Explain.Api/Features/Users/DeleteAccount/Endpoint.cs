using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Features.Users.DeleteAccount;

/// <summary>
/// Self-service "Delete my account" (Francis, 2026-09-21). The signed-in person must type their own email to confirm. Staff/admin
/// accounts and recruiter/employer organisation members are not deleted from here — those are created and managed by us, so the answer
/// is "contact us" (which also keeps an organisation from losing a seat holder by accident).
/// </summary>
public static class Endpoint
{
    public record DeleteRequest(string? ConfirmEmail);

    public static void Map(WebApplication app) =>
        app.MapDelete("/api/users/me", async ([FromBody] DeleteRequest req, HttpContext ctx, AppDbContext db, AccountDeletionService deletion, CancellationToken ct) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (userId is null) return Results.Unauthorized();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
            if (user is null) return Results.NotFound(new { error = "This account has already been deleted." });

            if (!string.Equals(req.ConfirmEmail?.Trim(), user.Email, StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "Type your account email address exactly to confirm." });

            var isAdmin = string.Equals(user.Role, "admin", StringComparison.OrdinalIgnoreCase);
            var inOrganisation = await db.OrganisationMembers.AnyAsync(m => m.UserId == userId, ct);
            var isStaff = await db.AccessGrants.AnyAsync(g => g.UserId == userId && g.Kind == "staff" && g.RevokedAt == null, ct);
            if (isAdmin || inOrganisation || isStaff)
                return Results.Json(new { error = "This kind of account can't be deleted here — please email francis@percentile.one and we'll do it with you." }, statusCode: 403);

            var outcome = await deletion.DeleteAsync(user, ct);
            return outcome.Done ? Results.Ok(new { deleted = true }) : Results.Json(new { error = outcome.Error }, statusCode: 500);
        }).RequireAuthorization();
}
