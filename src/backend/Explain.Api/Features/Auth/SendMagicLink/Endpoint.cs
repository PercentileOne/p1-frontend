using Explain.Api.Common;

namespace Explain.Api.Features.Auth.SendMagicLink;

// POST /auth/magic-link  { "email": "francis@percentile.one" }
// Generates a signed JWT link and (for now) logs it to console.
// Wire up Resend / Azure Communication Services here later.

public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/auth/magic-link", Handle)
           .WithName("SendMagicLink")
           .WithTags("Auth")
           .AllowAnonymous();
    }

    private static IResult Handle(Request req, TokenService tokens, ILogger<Program> logger)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            return Results.BadRequest(new { error = "Invalid email address." });

        var email = req.Email.Trim().ToLower();
        var token = tokens.CreateMagicLinkToken(email);
        var appUrl = Environment.GetEnvironmentVariable("APP_URL") ?? "http://localhost:5173";
        var link  = $"{appUrl}/auth/verify?token={token}";

        // TODO: send via Resend — for now log to console
        logger.LogInformation("Magic link for {Email}: {Link}", email, link);

        return Results.Ok(new { message = "Magic link sent. Check your email (or the console in dev)." });
    }

    public record Request(string Email);
}
