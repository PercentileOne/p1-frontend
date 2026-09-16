using MediatR;
using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Domain.Profile;
using Explain.Api.Features.Events;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Email;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;
using SqlUser = Explain.Api.Infrastructure.Sql.Models.User;

namespace Explain.Api.Features.Auth.Register;

public class RegisterCommandHandler(
    AppDbContext db,
    CosmosService cosmos,
    TokenService tokens,
    PermissionLoader permissions,
    IEmailSender emailSender,
    SecurityEventLogger securityEvents,
    IConfiguration config,
    ILogger<RegisterCommandHandler> logger)
    : IRequestHandler<RegisterCommand, Result<AuthResponse>>
{
    // Only roles a stranger should be able to grant themselves through a public, anonymous
    // endpoint. Employer/Admin/SuperAdmin are seeded (see AddRbacRolesAndPermissions migration)
    // but deliberately absent here — those are assigned by an admin, never by self-registration.
    private static readonly Dictionary<string, (int RoleId, string Name)> SelfRegisterableRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        ["candidate"] = (1, "Candidate"),
        ["recruiter"] = (2, "Recruiter"),
    };

    public async Task<Result<AuthResponse>> Handle(RegisterCommand cmd, CancellationToken ct)
    {
        logger.LogInformation("Register attempt for {Email}", cmd.Email);

        if (string.IsNullOrWhiteSpace(cmd.Email) || !cmd.Email.Contains('@'))
            return Result<AuthResponse>.Failure("Invalid email address.", 400);

        if (string.IsNullOrWhiteSpace(cmd.Password) || cmd.Password.Length < 8)
            return Result<AuthResponse>.Failure("Password must be at least 8 characters.", 400);

        if (string.IsNullOrWhiteSpace(cmd.FirstName))
            return Result<AuthResponse>.Failure("First name is required.", 400);

        if (string.IsNullOrWhiteSpace(cmd.LastName))
            return Result<AuthResponse>.Failure("Last name is required.", 400);

        var email = cmd.Email.Trim().ToLower();
        var (roleId, roleName) = cmd.Role is not null && SelfRegisterableRoles.TryGetValue(cmd.Role, out var r)
            ? r
            : SelfRegisterableRoles["candidate"];

        // If this email already has an account, don't hard-reject — a real person can
        // legitimately be both a candidate and a recruiter (or later, an employer), and
        // forcing a second email address for that would fragment them into two disconnected
        // profiles, which defeats the whole point of a single shareable candidate identity.
        // Instead: prove it's really them (correct password for the existing account), then
        // grant the additional role onto that SAME account rather than creating a new one.
        var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (existing is not null)
        {
            if (!BCrypt.Net.BCrypt.Verify(cmd.Password, existing.PasswordHash))
            {
                logger.LogWarning("Register failed — email already exists, password mismatch: {Email}", email);
                return Result<AuthResponse>.Failure("An account with this email already exists.", 409);
            }

            // This existing account was itself created after email verification shipped and
            // still hasn't completed it — don't hand out a working session for a second role on
            // top of an account that was never actually confirmed real in the first place.
            if (!existing.EmailVerified)
            {
                logger.LogWarning("Register (add-role) blocked for {Email} — email not verified", email);
                return Result<AuthResponse>.Failure("Please verify your email first — check your inbox for the verification link, then try again.", 403);
            }

            var alreadyHasRole = await db.UserRoles.AnyAsync(ur => ur.UserId == existing.Id && ur.RoleId == roleId, ct);
            if (!alreadyHasRole)
            {
                db.UserRoles.Add(new UserRole { UserId = existing.Id, RoleId = roleId });
                await db.SaveChangesAsync(ct);
                logger.LogInformation("Added {Role} role to existing account {Email} ({Id})", roleName, email, existing.Id);
            }

            var existingName     = $"{existing.FirstName} {existing.LastName}".Trim();
            var existingUsername = $"{existing.FirstName}{existing.LastName}".ToLower().Replace(" ", "");
            var existingPerms    = await permissions.LoadAsync(existing.Id, ct);
            var existingOrg      = await db.OrganisationMembers
                .Where(m => m.UserId == existing.Id)
                .OrderBy(m => m.JoinedAt)
                .Select(m => new { OrgId = m.OrganisationId.ToString(), OrgName = m.Organisation.Name, OrgRole = m.Role })
                .FirstOrDefaultAsync(ct);
            var existingToken    = tokens.CreateSessionToken(existing.Id, existing.Email, existingName, roleName, existingPerms,
                existingOrg?.OrgId, existingOrg?.OrgName, existingOrg?.OrgRole);
            return Result<AuthResponse>.Success(new AuthResponse(existingToken,
                new UserDto(existing.Id, existing.Email, existingName, existing.FirstName, existingUsername, roleName,
                    existingOrg?.OrgId, existingOrg?.OrgName, existingOrg?.OrgRole)));
        }

        // Email verification (Francis, 2026-09-16 — stop anyone getting a working account from
        // a fake/throwaway address). EmailVerified defaults false on the model; every brand-new
        // self-registration gets a real token and must click the link before a session is ever
        // issued for it — see the return at the bottom of this method, which deliberately does
        // NOT call CreateSessionToken.
        var verificationToken = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");

        // Write identity to SQL
        var sqlUser = new SqlUser
        {
            Email        = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(cmd.Password),
            FirstName    = cmd.FirstName.Trim(),
            LastName     = cmd.LastName.Trim(),
            Role         = roleName,
            EmailVerificationToken = verificationToken,
            EmailVerificationSentAt = DateTime.UtcNow,
        };

        db.Users.Add(sqlUser);
        db.UserRoles.Add(new UserRole { UserId = sqlUser.Id, RoleId = roleId });

        try
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("SQL user created: {Email} ({Id})", email, sqlUser.Id);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "SQL insert failed for {Email}", email);
            return Result<AuthResponse>.Failure("Failed to create account. Please try again.", 500);
        }

        // Write flexible profile to Cosmos — no migrations needed when fields grow
        var profile  = UserProfile.Create(sqlUser.Id, sqlUser.FirstName, sqlUser.LastName, cmd.Profession?.Trim());
        var profiles = cosmos.GetContainer("profiles");

        try
        {
            await profiles.UpsertItemAsync(profile, new PartitionKey(sqlUser.Id), cancellationToken: ct);
            logger.LogInformation("Cosmos profile created for {Id}", sqlUser.Id);
        }
        catch (Exception ex)
        {
            // Profile write failed — SQL user exists but has no profile yet.
            // Not fatal: profile is created lazily on first GET /profile if missing.
            logger.LogError(ex, "Cosmos profile write failed for {Id} — will be created on first profile fetch", sqlUser.Id);
        }

        try
        {
            await SendVerificationEmailAsync(sqlUser, verificationToken, config, emailSender, logger);
        }
        catch (Exception ex)
        {
            // The account is already committed — an email failure shouldn't roll it back or
            // block registration itself. Worst case, they contact support for a manual resend;
            // GET /api/auth/verify-email/resend (Verify/Endpoint.cs) also covers this.
            logger.LogError(ex, "Failed to send verification email to {Email}", email);
        }

        _ = securityEvents.LogAsync("EMAIL_VERIFICATION_SENT", sqlUser.Id, sqlUser.Email, null, ct: CancellationToken.None);

        // Deliberately NOT tokens.CreateSessionToken(...) here — the whole point of this feature
        // is that a brand-new account never gets a working session until the email is actually
        // verified. Reported as a Failure (not Success) purely so the existing frontend error-
        // banner plumbing (RegisterPage.tsx's apiErr) renders this message with zero UI changes
        // needed — the account genuinely was created, this isn't really an error, just the one
        // remaining step before it's usable.
        return Result<AuthResponse>.Failure(
            "Account created! Check your email to verify it, then sign in.", 403);
    }

    private static async Task SendVerificationEmailAsync(SqlUser user, string token, IConfiguration config, IEmailSender emailSender, ILogger logger)
    {
        var apiBase = config["ApiPublicUrl"] ?? "https://api.explain.global";
        var verifyUrl = $"{apiBase}/api/auth/verify-email?token={Uri.EscapeDataString(token)}";

        var body = $"""
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#07080f;font-family:-apple-system,'Segoe UI',sans-serif;">
              <div style="max-width:560px;margin:40px auto;padding:0 20px;">
                <div style="text-align:center;margin-bottom:28px;">
                  <p style="font-size:18px;font-weight:700;color:#fff;margin:0;">
                    <strong style="color:#34D399">The</strong><strong style="color:#fff">Interview</strong><strong style="color:#34D399">Chair</strong><span style="color:rgba(255,255,255,0.55);font-weight:400">.com</span>
                  </p>
                </div>
                <div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 36px;">
                  <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 12px;">Verify your email</h1>
                  <p style="font-size:15px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 32px;">
                    Hi {System.Net.WebUtility.HtmlEncode(user.FirstName)}, one last step — confirm this is really your email address before you can sign in.
                  </p>
                  <div style="text-align:center;margin-bottom:32px;">
                    <a href="{verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#34D399,#059669);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;">
                      Verify my email →
                    </a>
                  </div>
                  <p style="font-size:12px;color:rgba(255,255,255,0.3);line-height:1.7;margin:0;word-break:break-all;">
                    Or copy this link into your browser:<br/>{verifyUrl}
                  </p>
                </div>
              </div>
            </body>
            </html>
            """;

        await emailSender.SendAsync(user.Email, "Verify your email — TheInterviewChair.com", body);
        logger.LogInformation("Verification email sent to {Email}", user.Email);
    }
}
