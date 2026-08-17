using System.Net;
using System.Net.Mail;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Auth.ForgotPassword;

public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/auth/forgot-password", Handle)
           .WithName("ForgotPassword")
           .WithTags("Auth")
           .AllowAnonymous();
    }

    private static async Task<IResult> Handle(Request req, AppDbContext db, IConfiguration config, ILogger<Program> logger)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            return Results.BadRequest(new { error = "Please enter a valid email address." });

        var email = req.Email.Trim().ToLower();

        // Always return 200 — never reveal whether an account exists
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
        {
            logger.LogInformation("Password reset requested for unknown email {Email}", email);
            return Results.Ok(new { message = "If an account exists, a reset link has been sent." });
        }

        // Invalidate any existing unused tokens for this user
        var existing = await db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && !t.Used && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();
        foreach (var t in existing) t.Used = true;

        // Create new token — 2 hour expiry
        var token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        var resetToken = new PasswordResetToken
        {
            UserId    = user.Id,
            Token     = token,
            ExpiresAt = DateTime.UtcNow.AddHours(2),
            Used      = false,
            CreatedAt = DateTime.UtcNow,
        };
        db.PasswordResetTokens.Add(resetToken);
        await db.SaveChangesAsync();

        var appUrl      = config["AppUrl"]?.Split(',')[0].Trim() ?? "https://candidate.interviewme.global";
        var resetUrl    = $"{appUrl}/reset-password?token={token}";
        var smtpHost    = config["Email:SmtpHost"]  ?? throw new InvalidOperationException("Email:SmtpHost not configured");
        var smtpPort    = int.Parse(config["Email:SmtpPort"] ?? "587");
        var smtpUser    = config["Email:SmtpUser"]  ?? throw new InvalidOperationException("Email:SmtpUser not configured");
        var smtpPass    = config["Email:SmtpPass"]  ?? throw new InvalidOperationException("Email:SmtpPass not configured");
        var fromEmail   = config["Email:FromEmail"] ?? "noreply@interviewme.global";
        var fromName    = config["Email:FromName"]  ?? "InterviewMe";

        var firstName = user.FirstName ?? "there";
        var body = $"""
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#07080f;font-family:-apple-system,'Segoe UI',sans-serif;">
              <div style="max-width:560px;margin:40px auto;padding:0 20px;">
                <div style="text-align:center;margin-bottom:32px;">
                  <p style="font-size:18px;font-weight:700;color:#fff;margin:0;">
                    <strong style="color:#fff">Interview</strong><strong style="color:#34D399">Me</strong><span style="color:#4F8EF7;font-weight:400">.global</span>
                  </p>
                </div>
                <div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 36px;">
                  <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 12px;">Reset your password</h1>
                  <p style="font-size:15px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 32px;">
                    Hi {firstName}, we received a request to reset your InterviewMe.global password. Click the button below — this link expires in <strong style="color:#fff">2 hours</strong>.
                  </p>
                  <div style="text-align:center;margin-bottom:32px;">
                    <a href="{resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#34D399,#059669);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;">
                      Reset my password →
                    </a>
                  </div>
                  <p style="font-size:12px;color:rgba(255,255,255,0.3);line-height:1.7;margin:0;word-break:break-all;">
                    Or copy this link into your browser:<br/>{resetUrl}
                  </p>
                </div>
                <p style="text-align:center;font-size:12px;color:rgba(255,255,255,0.2);margin-top:24px;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            </body>
            </html>
            """;

        try
        {
            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new NetworkCredential(smtpUser, smtpPass),
                EnableSsl   = true,
            };
            using var message = new MailMessage
            {
                From       = new MailAddress(fromEmail, fromName),
                Subject    = "Reset your InterviewMe.global password",
                Body       = body,
                IsBodyHtml = true,
            };
            message.To.Add(new MailAddress(email));
            await client.SendMailAsync(message);
            logger.LogInformation("Password reset email sent to {Email}", email);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send password reset email to {Email}", email);
            return Results.Problem("Failed to send reset email. Please try again.", statusCode: 500);
        }

        return Results.Ok(new { message = "If an account exists, a reset link has been sent." });
    }

    private record Request(string Email);
}
