using System.Net;
using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Organisations.Members;

/// <summary>
/// Adding an org member either links an EXISTING user account (by email) or — new —
/// invites a brand-new person: creates their account (with a role derived from the org's
/// type), links it, and emails them a set-password link. This is the "how do an
/// organisation's own employees actually become account holders" gap: previously an org
/// admin could only be linked to someone who'd already independently registered on the
/// platform first, which was never going to happen for a Recruiter/Employer whose whole
/// account exists because their employer signed them up.
///
/// Reuses the password-reset primitive rather than inventing a separate "invite token"
/// concept — a PasswordResetToken with a longer expiry IS an invite; the recipient lands on
/// the exact same "choose a new password" page (ResetPasswordPage.tsx) either way, which
/// then sends them to /login where the shared role dropdown routes them to the right portal.
/// </summary>
public static class Endpoint
{
    // Which platform role a brand-new invitee gets, based on the organisation they're
    // joining — mirrors RegisterCommandHandler's SelfRegisterableRoles table, minus the
    // "self" part. University/jobcentre orgs have no corresponding portal yet, so members
    // there are linked/created with no extra role — an admin can grant one separately later.
    private static readonly Dictionary<string, (int RoleId, string Name)> OrgTypeRole = new(StringComparer.OrdinalIgnoreCase)
    {
        ["recruitment"] = (2, "Recruiter"),
        ["business"]    = (3, "Employer"),
    };

    public static void Map(WebApplication app)
    {
        app.MapPost("/api/admin/organisations/{id:int}/members", async (int id, AddRequest req, AppDbContext db, IConfiguration config, ILogger<Program> logger) =>
        {
            var org = await db.Organisations.FindAsync(id);
            if (org is null) return Results.NotFound(new { error = "Organisation not found." });

            if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
                return Results.BadRequest(new { error = "A valid email is required." });

            var email = req.Email.Trim().ToLower();
            var user  = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            var invited = false;

            if (user is null)
            {
                if (string.IsNullOrWhiteSpace(req.Name))
                    return Results.BadRequest(new { error = "No account exists with that email yet — enter their name so we can create one and invite them." });

                var nameParts = req.Name.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                var firstName = nameParts.Length > 0 ? nameParts[0] : req.Name.Trim();
                var lastName  = nameParts.Length > 1 ? nameParts[1] : "";

                OrgTypeRole.TryGetValue(org.Type, out var roleInfo);

                user = new User
                {
                    Email        = email,
                    // Unguessable — nobody can sign in with this. The invite email's
                    // set-password link is the only way into the account until they use it.
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N")),
                    FirstName    = firstName,
                    LastName     = lastName,
                    Role         = roleInfo.Name ?? "user",
                };
                db.Users.Add(user);

                if (roleInfo.RoleId != 0)
                    db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleInfo.RoleId });

                await db.SaveChangesAsync();
                invited = true;
                logger.LogInformation("Created invited user {Email} ({Id}) for organisation {OrgId}", email, user.Id, id);
            }

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

            if (invited)
            {
                try
                {
                    await SendInviteEmailAsync(user, org, db, config, logger);
                }
                catch (Exception ex)
                {
                    // The account and org link are already committed — an email failure
                    // shouldn't roll those back. Worst case, an admin resends via "forgot
                    // password" from the login screen, which reaches the exact same account.
                    logger.LogError(ex, "Failed to send invite email to {Email}", email);
                }
            }

            return Results.Created($"/api/admin/organisations/{id}/members/{member.Id}", new
            {
                member.Id, member.UserId, Name = $"{user.FirstName} {user.LastName}".Trim(), user.Email, member.Role, member.JoinedAt, Invited = invited,
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

    private static async Task SendInviteEmailAsync(User user, Organisation org, AppDbContext db, IConfiguration config, ILogger logger)
    {
        // Same PasswordResetToken table Features/Auth/ForgotPassword uses — an invite IS a
        // password-reset link, just with a longer window since it's not time-sensitive the
        // way a live "I forgot my password" request is.
        var token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId    = user.Id,
            Token     = token,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            Used      = false,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var smtpHost = config["Email:SmtpHost"];
        var smtpUser = config["Email:SmtpUser"];
        var smtpPass = config["Email:SmtpPass"];

        if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
        {
            logger.LogWarning("Email:Smtp* not configured — skipping invite email to {Email}", user.Email);
            return;
        }

        var smtpPort  = int.Parse(config["Email:SmtpPort"] ?? "587");
        var fromEmail = config["Email:FromEmail"] ?? "noreply@interviewme.global";
        var fromName  = config["Email:FromName"] ?? "InterviewMe";

        // Candidate portal owns the reset-password page and the shared /login role dropdown —
        // after setting a password the person lands on /login, picks Recruiter/Employer, and
        // the existing redirect logic sends them to the right portal's /auth/callback.
        var setupUrl = $"https://candidate.interviewme.global/reset-password?token={token}";

        var body = $"""
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#07080f;font-family:-apple-system,'Segoe UI',sans-serif;">
              <div style="max-width:560px;margin:40px auto;padding:0 20px;">
                <div style="text-align:center;margin-bottom:28px;">
                  <p style="font-size:18px;font-weight:700;color:#fff;margin:0;">
                    <strong style="color:#fff">Interview</strong><strong style="color:#34D399">Me</strong><span style="color:#4F8EF7;font-weight:400">.global</span>
                  </p>
                </div>
                <div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 36px;">
                  <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 12px;">You've been added to {WebEncode(org.Name)}</h1>
                  <p style="font-size:15px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 32px;">
                    Hi {WebEncode(user.FirstName)}, {WebEncode(org.ContactName)} has set you up with an InterviewMe.global account for {WebEncode(org.Name)}. Choose a password to get started — this link expires in <strong style="color:#fff">7 days</strong>.
                  </p>
                  <div style="text-align:center;margin-bottom:32px;">
                    <a href="{setupUrl}" style="display:inline-block;background:linear-gradient(135deg,#34D399,#059669);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;">
                      Set up my account →
                    </a>
                  </div>
                  <p style="font-size:12px;color:rgba(255,255,255,0.3);line-height:1.7;margin:0;word-break:break-all;">
                    Or copy this link into your browser:<br/>{setupUrl}
                  </p>
                </div>
              </div>
            </body>
            </html>
            """;

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            Credentials = new NetworkCredential(smtpUser, smtpPass),
            EnableSsl   = true,
        };
        using var message = new MailMessage
        {
            From       = new MailAddress(fromEmail, fromName),
            Subject    = $"You've been invited to join {org.Name} on InterviewMe.global",
            Body       = body,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(user.Email));
        await client.SendMailAsync(message);
        logger.LogInformation("Invite email sent to {Email} for organisation {OrgId}", user.Email, org.Id);
    }

    private static string WebEncode(string s) => WebUtility.HtmlEncode(s);

    public record AddRequest(string Email, string? Role, string? Name);
}
