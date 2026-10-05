using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Features.Events;
using Explain.Api.Features.Users.DeleteAccount;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Features.Users.AdminDelete;

/// <summary>
/// Admin "delete this user completely" (Francis, 2026-10-05): so a tester can register again from scratch — as a candidate, then (after another delete) as a
/// recruiter or employer — without needing a new email address each time. It runs exactly the same erasure as a person deleting their own account
/// (AccountDeletionService: profile, interviews, saved CV, recordings, free-interview record, sign-in history, organisation membership, and cancelling any live Stripe
/// subscription), so afterwards the email behaves like a brand-new one, free first interview included.
/// Guard rails: the admin must type the account's email, and admin accounts, staff accounts and your own account can never be deleted from here.
/// </summary>
public static class Endpoint
{
    public record AdminDeleteRequest(string? ConfirmEmail);

    public static void Map(WebApplication app) =>
        app.MapDelete("/api/admin/users/{id}", async (string id, [FromBody] AdminDeleteRequest req, HttpContext ctx, AppDbContext db,
            AccountDeletionService deletion, SecurityEventLogger securityEvents, CancellationToken ct) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
            if (user is null) return Results.NotFound(new { error = "User not found. They may already have been deleted." });

            var adminId = ctx.User.FindFirst("sub")?.Value;
            if (user.Id == adminId) return Results.BadRequest(new { error = "You can't delete your own account from here." });
            if (string.Equals(user.Role, "admin", StringComparison.OrdinalIgnoreCase))
                return Results.Json(new { error = "Admin accounts can't be deleted from here." }, statusCode: 403);
            if (await db.AccessGrants.AnyAsync(g => g.UserId == user.Id && g.Kind == "staff" && g.RevokedAt == null, ct))
                return Results.Json(new { error = "Staff accounts can't be deleted from here." }, statusCode: 403);

            if (!string.Equals(req.ConfirmEmail?.Trim(), user.Email, StringComparison.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "Type the account's email address exactly to confirm. Nothing was deleted." });

            var outcome = await deletion.DeleteAsync(user, ct);
            if (!outcome.Done) return Results.Json(new { error = outcome.Error }, statusCode: 500);

            // The audit entry names the admin and the removed account's opaque id only: the person's own details are gone, as they should be.
            var adminEmail = ctx.User.FindFirst("email")?.Value;
            var ip = ctx.Connection.RemoteIpAddress?.ToString();
            _ = securityEvents.LogAsync("ACCOUNT_DELETED_BY_ADMIN", null, null, ip,
                new() { ["deletedBy"] = adminEmail ?? "unknown", ["deletedUserId"] = id });

            return Results.Ok(new { deleted = true, removed = outcome.Removed });
        })
        .WithName("AdminDeleteUser").WithTags("Users")
        .RequireAuthorization(Permissions.ManageUsers);
}
