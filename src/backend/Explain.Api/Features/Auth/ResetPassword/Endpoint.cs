using Microsoft.EntityFrameworkCore;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Features.Auth.ResetPassword;

public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/auth/reset-password", Handle)
           .WithName("ResetPassword")
           .WithTags("Auth")
           .AllowAnonymous();
    }

    private static async Task<IResult> Handle(Request req, AppDbContext db, ILogger<Program> logger)
    {
        if (string.IsNullOrWhiteSpace(req.Token))
            return Results.BadRequest(new { error = "Reset token is required." });

        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 8)
            return Results.BadRequest(new { error = "Password must be at least 8 characters." });

        var entry = await db.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.Token == req.Token && !t.Used && t.ExpiresAt > DateTime.UtcNow);

        if (entry is null)
            return Results.BadRequest(new { error = "This reset link is invalid or has expired. Please request a new one." });

        var user = await db.Users.FindAsync(entry.UserId);
        if (user is null)
            return Results.BadRequest(new { error = "Account not found." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        user.UpdatedAt    = DateTime.UtcNow;
        entry.Used        = true;

        await db.SaveChangesAsync();

        logger.LogInformation("Password reset completed for {Email}", user.Email);
        return Results.Ok(new { message = "Password updated successfully. You can now sign in." });
    }

    private record Request(string Token, string NewPassword);
}
