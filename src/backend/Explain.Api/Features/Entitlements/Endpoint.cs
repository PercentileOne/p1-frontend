using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Entitlements;

/// <summary>
/// Who may start an interview, and how many (Francis, 2026-09-21). See EntitlementRules for the rules and EntitlementService for
/// how the facts are gathered. Everything here is per-signed-in-user (sub/email from the JWT) except the admin endpoints, which
/// manage the free-access list (staff / complimentary / comps), the numbers, and the enforcement switch.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // ── Candidate-facing ───────────────────────────────────────────────────────────────
        app.MapGet("/api/entitlements/me", async (HttpContext ctx, EntitlementService svc) =>
        {
            var (userId, email) = Who(ctx);
            if (userId is null || email is null) return Results.Unauthorized();
            return Results.Ok(await svc.GetStatusAsync(userId, email, IsAdmin(ctx)));
        }).RequireAuthorization();

        // Called by the intake screen the moment "Start Interview" is pressed. With enforcement OFF it always says yes (and still
        // records the start); with it ON, a "no" carries the reason the paywall should show.
        app.MapPost("/api/entitlements/interview/start", async (HttpContext ctx, EntitlementService svc) =>
        {
            var (userId, email) = Who(ctx);
            if (userId is null || email is null) return Results.Unauthorized();
            return Results.Ok(await svc.StartInterviewAsync(userId, email, IsAdmin(ctx)));
        }).RequireAuthorization();

        // The interview never actually began (e.g. the room failed to load) — give the slot / taster back.
        app.MapPost("/api/entitlements/interview/{usageId}/void", async (string usageId, HttpContext ctx, EntitlementService svc) =>
        {
            var (userId, _) = Who(ctx);
            if (userId is null) return Results.Unauthorized();
            await svc.VoidAsync(userId, usageId);
            return Results.Ok();
        }).RequireAuthorization();

        // ── Admin ──────────────────────────────────────────────────────────────────────────
        app.MapGet("/api/admin/access", async (AppDbContext db, EntitlementService svc) =>
        {
            var settings = await svc.GetSettingsAsync();
            var grants = await db.AccessGrants.AsNoTracking().OrderByDescending(g => g.GrantedAt).Take(1000).ToListAsync();
            var since = DateTime.UtcNow.AddDays(-7);
            var recent = await db.InterviewUsages.AsNoTracking().Where(u => u.StartedAt >= since && u.VoidedAt == null).ToListAsync();
            return Results.Ok(new
            {
                settings,
                grants = grants.Select(g => new { g.Id, g.Email, g.Kind, g.Reason, g.GrantedBy, g.GrantedAt, g.ExpiresAt, g.RevokedAt }),
                counts = new
                {
                    staff = grants.Count(g => g.Kind == "staff" && g.RevokedAt == null),
                    complimentary = grants.Count(g => g.Kind == "complimentary" && g.RevokedAt == null),
                    comps = grants.Count(g => g.Kind == "comp" && g.RevokedAt == null),
                    totalAccounts = await db.Users.CountAsync(),
                },
                last7Days = new
                {
                    started = recent.Count,
                    wouldHaveBeenBlocked = recent.Count(u => u.WouldBlock),
                    bySource = recent.GroupBy(u => u.Source).ToDictionary(g => g.Key, g => g.Count()),
                },
            });
        }).RequireAuthorization(Permissions.ManageUsers);

        app.MapPut("/api/admin/access/settings", async (SettingsRequest req, HttpContext ctx, EntitlementService svc) =>
        {
            if (req.DailyCap is < 0 or > 100 || req.MonthlyCap is < 0 or > 1000)
                return Results.BadRequest(new { error = "Daily cap must be 0-100 and monthly cap 0-1000." });
            var by = ctx.User.FindFirst("email")?.Value ?? ctx.User.FindFirst("sub")?.Value ?? "unknown";
            await svc.SaveSettingsAsync(new EntitlementSettings(req.Enforce, req.DailyCap, req.MonthlyCap, req.TasterEnabled), by);
            return Results.Ok(await svc.GetSettingsAsync());
        }).RequireAuthorization(Permissions.ManageUsers);

        app.MapPost("/api/admin/access/grants", async (GrantRequest req, HttpContext ctx, AppDbContext db) =>
        {
            if (!EmailNormaliser.LooksLikeEmail(req.Email)) return Results.BadRequest(new { error = "Enter a valid email address." });
            if (req.Kind is not ("staff" or "comp")) return Results.BadRequest(new { error = "Kind must be staff or comp." });
            var email = req.Email.Trim().ToLowerInvariant();
            var existing = await db.AccessGrants.FirstOrDefaultAsync(g => g.Email == email && g.Kind == req.Kind && g.RevokedAt == null);
            if (existing is not null) return Results.Conflict(new { error = $"{email} already has {req.Kind} access." });

            var by = ctx.User.FindFirst("email")?.Value ?? "admin";
            var userId = await db.Users.AsNoTracking().Where(u => u.Email == email).Select(u => u.Id).FirstOrDefaultAsync();
            var grant = new AccessGrant
            {
                Email = email, UserId = userId, Kind = req.Kind, Reason = (req.Reason ?? "").Trim(), GrantedBy = by,
                ExpiresAt = req.ExpiresAt?.UtcDateTime,
            };
            db.AccessGrants.Add(grant);
            await db.SaveChangesAsync();
            return Results.Ok(new { grant.Id });
        }).RequireAuthorization(Permissions.ManageUsers);

        // Revoke, never delete — the record of who had access and when stays.
        app.MapDelete("/api/admin/access/grants/{id:int}", async (int id, AppDbContext db) =>
        {
            var g = await db.AccessGrants.FirstOrDefaultAsync(x => x.Id == id);
            if (g is null) return Results.NotFound();
            if (g.RevokedAt is null) { g.RevokedAt = DateTime.UtcNow; await db.SaveChangesAsync(); }
            return Results.Ok();
        }).RequireAuthorization(Permissions.ManageUsers);

        // "Every account that exists RIGHT NOW gets complimentary access." Idempotent, so it can be re-run at the moment
        // enforcement is switched on to catch accounts created since the original rollout.
        app.MapPost("/api/admin/access/grant-all-existing", async (HttpContext ctx, AppDbContext db) =>
        {
            var by = ctx.User.FindFirst("email")?.Value ?? "admin";
            var have = (await db.AccessGrants.AsNoTracking().Where(g => g.Kind == "complimentary" && g.RevokedAt == null).Select(g => g.Email).ToListAsync()).ToHashSet();
            var users = await db.Users.AsNoTracking().Select(u => new { u.Id, u.Email }).ToListAsync();
            var added = 0;
            foreach (var u in users)
            {
                var email = u.Email.Trim().ToLowerInvariant();
                if (have.Contains(email)) continue;
                db.AccessGrants.Add(new AccessGrant { Email = email, UserId = u.Id, Kind = "complimentary", Reason = "Existing account at paywall launch", GrantedBy = by });
                added++;
            }
            await db.SaveChangesAsync();
            return Results.Ok(new { granted = added });
        }).RequireAuthorization(Permissions.ManageUsers);

        // The off switch for the goodwill: everyone with complimentary access (not staff, not individual comps) loses it at once.
        app.MapPost("/api/admin/access/revoke-complimentary", async (AppDbContext db) =>
        {
            var now = DateTime.UtcNow;
            var rows = await db.AccessGrants.Where(g => g.Kind == "complimentary" && g.RevokedAt == null).ToListAsync();
            foreach (var g in rows) g.RevokedAt = now;
            await db.SaveChangesAsync();
            return Results.Ok(new { revoked = rows.Count });
        }).RequireAuthorization(Permissions.ManageUsers);

        // Recent starts, newest first — so an admin can see exactly who would be turned away before enforcement is on.
        app.MapGet("/api/admin/access/usage", async (AppDbContext db, int? take) =>
        {
            var n = Math.Clamp(take ?? 100, 1, 500);
            var rows = await db.InterviewUsages.AsNoTracking().OrderByDescending(u => u.StartedAt).Take(n)
                .Join(db.Users.AsNoTracking(), u => u.UserId, us => us.Id, (u, us) => new { u.Id, us.Email, u.Source, u.Enforced, u.WouldBlock, u.StartedAt, u.VoidedAt })
                .ToListAsync();
            return Results.Ok(rows);
        }).RequireAuthorization(Permissions.ManageUsers);
    }

    // An admin-portal user (anyone holding CAN_VIEW_ADMIN_PORTAL) is staff, whether or not they were ever added to the staff list.
    private static bool IsAdmin(HttpContext ctx) => ctx.User.HasClaim("perm", Permissions.ViewAdminPortal);

    private static (string? userId, string? email) Who(HttpContext ctx) =>
        (ctx.User.FindFirst("sub")?.Value, ctx.User.FindFirst("email")?.Value);

    public record SettingsRequest(bool Enforce, int DailyCap, int MonthlyCap, bool TasterEnabled);
    public record GrantRequest(string Email, string Kind, string? Reason, DateTimeOffset? ExpiresAt);
}
