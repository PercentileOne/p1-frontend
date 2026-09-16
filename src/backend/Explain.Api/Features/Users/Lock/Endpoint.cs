using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Features.Events;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Features.Users.Lock;

/// <summary>
/// Admin-initiated account lockout (Francis, 2026-09-16 — spotted a suspicious account, test@
/// gmail.com from Lahore, Pakistan, live in the Activity Log and wanted a way to shut it out).
/// Permanent until an admin explicitly unlocks it — distinct from LoginCommandHandler's own
/// time-window brute-force lockout, which auto-expires after 15 minutes on its own. Same
/// Permissions.ManageUsers gate as Features/Users/Create — locking someone out is exactly as
/// sensitive an action as creating an account.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/admin/users/{id}/lock", async (
            string id, LockRequest req, HttpContext ctx, AppDbContext db, SecurityEventLogger securityEvents) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user is null) return Results.NotFound(new { error = "User not found." });

            user.IsLocked = true;
            user.LockedAt = DateTime.UtcNow;
            user.LockedReason = string.IsNullOrWhiteSpace(req.Reason) ? null : req.Reason.Trim();
            await db.SaveChangesAsync();

            var adminEmail = ctx.User.FindFirst("email")?.Value;
            var ip = ctx.Connection.RemoteIpAddress?.ToString();
            _ = securityEvents.LogAsync("ACCOUNT_LOCKED", user.Id, user.Email, ip,
                new() { ["lockedBy"] = adminEmail ?? "unknown", ["reason"] = user.LockedReason ?? "" });

            return Results.Ok(new { user.Id, user.Email, user.IsLocked, user.LockedAt, user.LockedReason });
        })
        .WithName("LockUser").WithTags("Users")
        .RequireAuthorization(Permissions.ManageUsers);

        app.MapPost("/api/admin/users/{id}/unlock", async (
            string id, HttpContext ctx, AppDbContext db, SecurityEventLogger securityEvents) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user is null) return Results.NotFound(new { error = "User not found." });

            user.IsLocked = false;
            user.LockedAt = null;
            user.LockedReason = null;
            await db.SaveChangesAsync();

            var adminEmail = ctx.User.FindFirst("email")?.Value;
            var ip = ctx.Connection.RemoteIpAddress?.ToString();
            _ = securityEvents.LogAsync("ACCOUNT_UNLOCKED", user.Id, user.Email, ip,
                new() { ["unlockedBy"] = adminEmail ?? "unknown" });

            return Results.Ok(new { user.Id, user.Email, user.IsLocked });
        })
        .WithName("UnlockUser").WithTags("Users")
        .RequireAuthorization(Permissions.ManageUsers);
    }

    public record LockRequest(string? Reason);
}
