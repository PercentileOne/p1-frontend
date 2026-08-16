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

        // Always return 200 — never reveal whether email exists
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
        {
            logger.LogInformation("Password reset requested for unknown email {Email}", email);
            return Results.Ok(new { message = "If an account with that email exists, a reset link has been sent." });
        }

        // Invalidate any existing unused tokens for this user
        var existing = await db.PasswordResetTokens
            .Where(t => t.UserId == user.Id && !t.Used && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();
        foreach (var t in existing) t.Used = true;

        // Generate a secure token
        var rawToken = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');

        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId    = user.Id,
            Token     = rawToken,
            ExpiresAt = DateTime.UtcNow.AddHours(2),
        });
        await db.SaveChangesAsync();

        // Send reset email
        var resetUrl = $"https://candidate.interviewme.global/reset-password?token={rawToken}";

        try
        {
            await SendResetEmail(user.FirstName, email, resetUrl, config);
            logger.LogInformation("Password reset email sent to {Email}", email);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send password reset email to {Email}", email);
            // Still return success — token is saved, user can retry
        }

        return Results.Ok(new { message = "If an account with that email exists, a reset link has been sent." });
    }

    private static async Task SendResetEmail(string firstName, string email, string resetUrl, IConfiguration config)
    {
        var smtpHost  = config["Email:SmtpHost"]  ?? throw new InvalidOperationException("Email:SmtpHost not configured");
        var smtpPort  = int.Parse(config["Email:SmtpPort"] ?? "587");
        var smtpUser  = config["Email:SmtpUser"]  ?? throw new InvalidOperationException("Email:SmtpUser not configured");
        var smtpPass  = config["Email:SmtpPass"]  ?? throw new InvalidOperationException("Email:SmtpPass not configured");
        var fromEmail = config["Email:FromEmail"] ?? "noreply@interviewme.global";
        var fromName  = config["Email:FromName"]  ?? "InterviewMe.global";

        var body = $"""
            <div style="font-family:-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#09090f;color:#fff;border-radius:16px;overflow:hidden;">
              <div style="background:linear-gradient(135deg,#34D399,#047857);padding:32px;text-align:center;">
                <p style="font-size:22px;font-weight:900;letter-spacing:-0.02em;margin:0;">Interview<span style="color:#34D399">Me</span><span style="color:#4F8EF7;opacity:0.9">.global</span></p>
              </div>
              <div style="padding:32px;">
                <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;">Hi {firstName},</h2>
                <p style="color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 28px;">
                  We received a request to reset your password. Click the button below — the link is valid for 2 hours.
                </p>
                <a href="{resetUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#34D399,#059669);color:#fff;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
                  Reset My Password →
                </a>
                <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:28px 0 0;line-height:1.6;">
                  If you didn't request this, you can safely ignore this email — your password won't change.<br/>
                  This link expires in 2 hours.
                </p>
              </div>
            </div>
            """;

        using var client  = new SmtpClient(smtpHost, smtpPort) { Credentials = new NetworkCredential(smtpUser, smtpPass), EnableSsl = true };
        using var message = new MailMessage { From = new MailAddress(fromEmail, fromName), Subject = "Reset your InterviewMe.global password", Body = body, IsBodyHtml = true };
        message.To.Add(new MailAddress(email, firstName));
        await client.SendMailAsync(message);
    }

    private record Request(string Email);
}
