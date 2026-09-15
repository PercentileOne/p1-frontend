using MediatR;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Features.Auth.Register;
using Explain.Api.Infrastructure.Email;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Auth.Login;

public class LoginCommandHandler(
    AppDbContext db,
    TokenService tokens,
    PermissionLoader permissions,
    IConfiguration config,
    IEmailSender emailSender,
    ILogger<LoginCommandHandler> logger)
    : IRequestHandler<LoginCommand, Result<AuthResponse>>
{
    public async Task<Result<AuthResponse>> Handle(LoginCommand cmd, CancellationToken ct)
    {
        logger.LogInformation("Login attempt for {Email}", cmd.Email);

        if (string.IsNullOrWhiteSpace(cmd.Email) || string.IsNullOrWhiteSpace(cmd.Password))
            return Result<AuthResponse>.Failure("Email and password are required.", 400);

        var email = cmd.Email.Trim().ToLower();

        // Basic brute-force protection (Francis, 2026-09-15 — noticed bot login attempts
        // against the admin portal and there was previously no throttling at all). Blocks
        // further attempts against this email for a short window after repeated recent
        // failures, using LoginHistory — already captured on every attempt, just never used
        // for this. Checked before the DB user lookup so a locked-out attacker can't tell
        // whether the account even exists from response timing.
        var lockoutWindow = TimeSpan.FromMinutes(15);
        var recentFailures = await db.LoginHistories
            .Where(h => h.Email == email && !h.Success && h.LoginAt > DateTime.UtcNow - lockoutWindow)
            .CountAsync(ct);
        if (recentFailures >= 8)
        {
            logger.LogWarning("Login temporarily locked for {Email} after {Count} recent failures", email, recentFailures);
            return Result<AuthResponse>.Failure("Too many failed attempts. Please try again in 15 minutes.", 429);
        }

        // Single indexed lookup — no full-scan, no RU cost
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // Same message for wrong email OR wrong password — never reveal which
        if (user is null || !BCrypt.Net.BCrypt.Verify(cmd.Password, user.PasswordHash))
        {
            logger.LogWarning("Login failed for {Email}", email);
            await RecordLogin(user?.Id ?? "unknown", email, false, "Invalid credentials", cmd.IpAddress, cmd.UserAgent, ct);
            return Result<AuthResponse>.Failure("Incorrect email or password.", 401);
        }

        logger.LogInformation("Login successful for {Email}", email);
        await RecordLogin(user.Id, email, true, null, cmd.IpAddress, cmd.UserAgent, ct);

        var name     = $"{user.FirstName} {user.LastName}".Trim();
        var username = $"{user.FirstName}{user.LastName}".ToLower().Replace(" ", "");
        var perms    = await permissions.LoadAsync(user.Id, ct);
        var role     = perms.Contains("CAN_VIEW_ADMIN_PORTAL")  ? "Admin"
                     : perms.Contains("CAN_VIEW_RECRUITER_PORTAL") ? "Recruiter"
                     : perms.Contains("CAN_VIEW_EMPLOYER_PORTAL")  ? "Employer"
                     : "Candidate";

        // Orgs are admin-provisioned (not self-registered), so realistically a user belongs to
        // at most one today. Taking the earliest membership keeps this correct for that case
        // without yet building the org-picker UI a genuine multi-org user would need at login.
        var org = await db.OrganisationMembers
            .Where(m => m.UserId == user.Id)
            .OrderBy(m => m.JoinedAt)
            .Select(m => new { OrgId = m.OrganisationId.ToString(), OrgName = m.Organisation.Name, OrgRole = m.Role })
            .FirstOrDefaultAsync(ct);

        var token    = tokens.CreateSessionToken(user.Id, user.Email, name, role, perms, org?.OrgId, org?.OrgName, org?.OrgRole);
        var response = new AuthResponse(token, new UserDto(user.Id, user.Email, name, user.FirstName, username, role, org?.OrgId, org?.OrgName, org?.OrgRole));

        // Fire-and-forget, not awaited — an SMTP round-trip has no business adding latency to
        // every single login across every portal. Wrapped in its own try/catch inside the method
        // itself (same best-effort pattern as RecordLogin), so a slow/down mail provider can
        // never surface as a login failure. Deliberately CancellationToken.None, not the
        // request's own `ct` — that token gets cancelled the moment the HTTP response finishes,
        // which (since this isn't awaited) would race the still-in-flight SMTP call and kill the
        // send before it completes.
        _ = SendLoginAlert(email, name, role, org?.OrgName);

        return Result<AuthResponse>.Success(response);
    }

    // Francis wants visibility into every sign-in across every portal (2026-09-15) — candidate,
    // recruiter, employer, admin, all of them. Deliberately success-only: alerting on every
    // failed attempt too would mean an email per bot/typo, drowning out the signal that
    // actually matters (a real account being accessed).
    private async Task SendLoginAlert(string email, string name, string role, string? orgName)
    {
        try
        {
            var alertTo = config["Email:LoginAlertRecipient"] ?? "francis@percentile.one";
            var whenStr = DateTime.UtcNow.ToString("dd MMM yyyy, HH:mm 'UTC'");
            var body = $"""
                {name} ({email}) just signed in as {role}{(orgName is null ? "" : $" — {orgName}")}.

                {whenStr}
                """;
            await emailSender.SendAsync(alertTo, $"New sign-in: {name} ({role})", body.Replace("\n", "<br/>"));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send login alert email for {Email}", email);
        }
    }

    private async Task RecordLogin(string userId, string email, bool success, string? failureReason, string? ipAddress, string? userAgent, CancellationToken ct)
    {
        try
        {
            db.LoginHistories.Add(new LoginHistory
            {
                UserId        = userId,
                Email         = email,
                Method        = "password",
                Success       = success,
                FailureReason = failureReason,
                // Previously declared on the model but never actually set — see this session's
                // wider system-event-logging work, which needed real IP capture anyway.
                IpAddress     = ipAddress,
                UserAgent     = userAgent,
            });
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to record login history for {Email}", email);
        }
    }
}
