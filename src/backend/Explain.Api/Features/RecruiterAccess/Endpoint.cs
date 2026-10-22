using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Features.Entitlements;
using Explain.Api.Infrastructure.Email;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.RecruiterAccess;

/// <summary>
/// The two recruiter tiers (Francis, 2026-10-22). A recruiter can sign up by themselves and is given the "recruiter-lite" role: free for the
/// first months, can send interview-prep links (capped a month), and cannot see any candidate data, send client gifts or introductions.
/// An admin approves them from the admin portal, which adds the full Recruiter role on top. Recruiters and employers get candidate data,
/// so that second step stays a decision a person makes.
/// </summary>
public static class Endpoint
{
    private const int LiteRoleId = 6;
    private const int RecruiterRoleId = 2;

    public static void Map(WebApplication app)
    {
        // What the recruiter portal needs to know about its own signed-in person: which tier, the free months, the monthly prep-link count.
        app.MapGet("/api/recruiter/access", async (HttpContext ctx, AppDbContext db, EntitlementService entitlements) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            var email = ctx.User.FindFirst("email")?.Value ?? string.Empty;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var approved = ctx.User.HasClaim("perm", Permissions.ViewCandidateProfile) || ctx.User.HasClaim("perm", Permissions.ViewAdminPortal);
            var settings = await entitlements.GetSettingsAsync();
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            var freeUntil = user is null ? null : EntitlementService.FreeUntilFor(user.CreatedAt, settings.FreePeriodMonths);
            var used = await entitlements.CountPrepsThisMonthAsync(userId, DateTime.UtcNow);
            return Results.Ok(new
            {
                approved,
                tier = approved ? "approved" : "self-service",
                freeUntil = freeUntil is { } fu && fu > DateTime.UtcNow ? freeUntil : null,
                prepCap = settings.RecruiterPrepCap,
                prepsThisMonth = used,
                enforced = settings.Enforce,
            });
        }).RequireAuthorization(Permissions.ViewRecruiterPortal);

        // Self-service recruiters waiting for approval, newest first.
        app.MapGet("/api/admin/recruiter-approvals", async (AppDbContext db, EntitlementService entitlements) =>
        {
            var approvedIds = db.UserRoles.Where(ur => ur.RoleId == RecruiterRoleId).Select(ur => ur.UserId);
            var pending = await db.UserRoles.AsNoTracking()
                .Where(ur => ur.RoleId == LiteRoleId && !approvedIds.Contains(ur.UserId))
                .Join(db.Users.AsNoTracking(), ur => ur.UserId, u => u.Id, (ur, u) => new { u.Id, u.Email, u.FirstName, u.LastName, u.EmailVerified, u.CreatedAt })
                .OrderByDescending(x => x.CreatedAt)
                .Take(200)
                .ToListAsync();
            var result = new List<object>();
            foreach (var p in pending)
                result.Add(new
                {
                    p.Id, p.Email, name = $"{p.FirstName} {p.LastName}".Trim(), p.EmailVerified, signedUp = p.CreatedAt,
                    prepsThisMonth = await entitlements.CountPrepsThisMonthAsync(p.Id, DateTime.UtcNow),
                });
            return Results.Ok(result);
        }).RequireAuthorization(Permissions.ManageUsers);

        // Approve: add the full Recruiter role (candidate profiles, marketplace, client gifts, introductions). Idempotent. The recruiter signs in again to pick it up.
        app.MapPost("/api/admin/recruiter-approvals/{userId}/approve", async (string userId, AppDbContext db, IEmailSender emailSender, IConfiguration config, ILogger<Program> logger) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user is null) return Results.NotFound();
            if (!await db.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == LiteRoleId))
                return Results.BadRequest(new { error = "That person did not sign up as a self-service recruiter." });

            if (!await db.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == RecruiterRoleId))
            {
                db.UserRoles.Add(new UserRole { UserId = userId, RoleId = RecruiterRoleId });
                await db.SaveChangesAsync();
            }

            try
            {
                var portal = config["RecruiterAppUrl"] ?? "https://recruiter.theinterviewchair.com";
                var first = System.Net.WebUtility.HtmlEncode(user.FirstName);
                await emailSender.SendAsync(user.Email, "Your recruiter account is approved — TheInterviewChair.com",
                    $"<p>Hi {first},</p><p>Your recruiter account is now fully approved. You can use the Candidate Marketplace, client gifts and introductions as well as interview-prep links.</p>" +
                    $"<p>Please <strong>sign out and sign back in</strong> at <a href=\"{portal}\">{portal}</a> so the new access appears.</p><p>TheInterviewChair.com</p>");
            }
            catch (Exception ex) { logger.LogError(ex, "Approval email to {Email} failed; the approval itself is saved.", user.Email); }
            return Results.Ok(new { approved = true });
        }).RequireAuthorization(Permissions.ManageUsers);
    }
}
