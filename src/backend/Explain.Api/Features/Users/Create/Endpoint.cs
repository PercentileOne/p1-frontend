using System.Net;
using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Users.Create;

/// <summary>
/// Admin-created standalone accounts — the "New Recruiter"/"New Candidate"/"New Employer"
/// buttons in admin-portal, for people not tied to any Organisation. Same invite mechanism
/// as Organisations/Members/Endpoint.cs's AddOrganisationMember: an unguessable password
/// hash plus a PasswordResetToken-backed set-password email, reusing that table rather than
/// inventing a separate "invite token" concept.
/// </summary>
public static class Endpoint
{
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "candidate", "recruiter", "employer",
    };

    public static void Map(WebApplication app)
    {
        app.MapPost("/api/admin/users", async (CreateRequest req, AppDbContext db, IConfiguration config, ILogger<Program> logger) =>
        {
            var roleSlug = req.Role?.Trim().ToLower() ?? "";
            if (!AllowedRoles.Contains(roleSlug))
                return Results.BadRequest(new { error = "role must be one of: candidate, recruiter, employer." });

            if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
                return Results.BadRequest(new { error = "A valid email is required." });
            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { error = "Name is required." });

            var email = req.Email.Trim().ToLower();
            if (await db.Users.AnyAsync(u => u.Email == email))
                return Results.Conflict(new { error = "An account with that email already exists." });

            var role = await db.Roles.FirstOrDefaultAsync(r => r.Slug == roleSlug);
            if (role is null)
                return Results.BadRequest(new { error = $"No '{roleSlug}' role exists." });

            var nameParts = req.Name.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var firstName = nameParts.Length > 0 ? nameParts[0] : req.Name.Trim();
            var lastName  = nameParts.Length > 1 ? nameParts[1] : "";

            var user = new User
            {
                Email        = email,
                // Unguessable — nobody can sign in with this. The invite email's set-password
                // link is the only way into the account until they use it.
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N")),
                FirstName    = firstName,
                LastName     = lastName,
                Role         = role.Name,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();

            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
            await db.SaveChangesAsync();

            logger.LogInformation("Admin-created {Role} account {Email} ({Id})", role.Slug, email, user.Id);

            try
            {
                await SendInviteEmailAsync(user, role.Name, db, config, logger);
            }
            catch (Exception ex)
            {
                // The account is already committed — an email failure shouldn't roll it back.
                // Worst case, an admin resends via "forgot password" from the login screen,
                // which reaches the exact same account.
                logger.LogError(ex, "Failed to send invite email to {Email}", email);
            }

            return Results.Created($"/api/admin/users/{user.Id}", new
            {
                user.Id, user.Email, Name = $"{user.FirstName} {user.LastName}".Trim(), Role = role.Slug,
            });
        })
        .WithName("CreateUser").WithTags("Users")
        .RequireAuthorization(Permissions.ManageUsers);
    }

    private static async Task SendInviteEmailAsync(User user, string roleName, AppDbContext db, IConfiguration config, ILogger logger)
    {
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
        // after setting a password the person lands on /login, picks their portal, and the
        // existing redirect logic sends them the right place.
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
                  <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 12px;">You've been invited to InterviewMe.global</h1>
                  <p style="font-size:15px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 32px;">
                    Hi {WebEncode(user.FirstName)}, an account has been set up for you as a {WebEncode(roleName)}. Choose a password to get started — this link expires in <strong style="color:#fff">7 days</strong>.
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
            Subject    = "You've been invited to join InterviewMe.global",
            Body       = body,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(user.Email));
        await client.SendMailAsync(message);
        logger.LogInformation("Invite email sent to {Email}", user.Email);
    }

    private static string WebEncode(string s) => WebUtility.HtmlEncode(s);

    public record CreateRequest(string Email, string Name, string Role);
}
