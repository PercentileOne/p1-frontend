using Microsoft.EntityFrameworkCore;
using Explain.Api.Features.Events;
using Explain.Api.Infrastructure.Email;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Features.Auth.Verify;

/// <summary>
/// The other half of RegisterCommandHandler's email-verification gate (Francis, 2026-09-16).
/// A candidate clicks the link in their verification email, which hits this GET endpoint
/// directly (not a frontend route) — simplest possible flow, no SPA page needed just to make
/// one API call and redirect. AllowAnonymous on both routes: nobody clicking this link has a
/// session yet, that's the entire point.
/// </summary>
public static class Endpoint
{
    // Only a known internal page is ever carried through the email link (no open redirect): today just the subscribe page.
    public static string? SafeNext(string? next) => next == "/subscription" ? next : null;

    public static void Map(WebApplication app)
    {
        app.MapGet("/api/auth/verify-email", async (string? token, string? next, AppDbContext db, IConfiguration config, SecurityEventLogger securityEvents) =>
        {
            var candidateAppUrl = config["CandidateAppUrl"] ?? "http://localhost:5173";
            var nextQuery = SafeNext(next) is { } safe ? $"&next={Uri.EscapeDataString(safe)}" : "";

            if (string.IsNullOrWhiteSpace(token))
                return Results.Redirect($"{candidateAppUrl}/login?verifyError=missing-token");

            var user = await db.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == token);
            if (user is null)
                // Already used, or never existed — either way there's nothing left to verify.
                // A used token redirecting to the same "you can sign in now" outcome is fine:
                // clicking an already-consumed link twice shouldn't look like a hard failure.
                return Results.Redirect($"{candidateAppUrl}/login?verified=true{nextQuery}");

            user.EmailVerified = true;
            user.EmailVerificationToken = null;
            await db.SaveChangesAsync();

            _ = securityEvents.LogAsync("EMAIL_VERIFIED", user.Id, user.Email, null);

            return Results.Redirect($"{candidateAppUrl}/login?verified=true{nextQuery}");
        })
        .WithName("VerifyEmail").WithTags("Auth")
        .AllowAnonymous();

        // A fresh token + a fresh email, for the "I never got it" / "the link expired" case —
        // deliberately silent about whether the email is real (same "never reveal account
        // existence" principle LoginCommandHandler already follows for wrong-password), and
        // throttled to one send per 60s per account so this can't be used to spam an inbox.
        app.MapPost("/api/auth/verify-email/resend", async (ResendRequest req, AppDbContext db, IConfiguration config, IEmailSender emailSender, ILogger<Program> logger) =>
        {
            var generic = Results.Ok(new { message = "If that email needs verifying, a new link is on its way." });
            if (string.IsNullOrWhiteSpace(req.Email)) return generic;

            var email = req.Email.Trim().ToLower();
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user is null || user.EmailVerified) return generic;

            if (user.EmailVerificationSentAt is { } last && DateTime.UtcNow - last < TimeSpan.FromSeconds(60))
                return generic;

            user.EmailVerificationToken = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
            user.EmailVerificationSentAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            try
            {
                var apiBase = config["ApiPublicUrl"] ?? "https://api.explain.global";
                var verifyUrl = $"{apiBase}/api/auth/verify-email?token={Uri.EscapeDataString(user.EmailVerificationToken)}";
                var body = $"""
                    <p style="font-family:-apple-system,'Segoe UI',sans-serif;">
                      Hi {System.Net.WebUtility.HtmlEncode(user.FirstName)}, here's a fresh verification link for TheInterviewChair.com:
                      <br/><br/>
                      <a href="{verifyUrl}">Verify my email →</a>
                    </p>
                    """;
                await emailSender.SendAsync(user.Email, "Verify your email — TheInterviewChair.com", body);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to resend verification email to {Email}", email);
            }

            return generic;
        })
        .WithName("ResendVerificationEmail").WithTags("Auth")
        .AllowAnonymous();
    }

    public record ResendRequest(string Email);
}
