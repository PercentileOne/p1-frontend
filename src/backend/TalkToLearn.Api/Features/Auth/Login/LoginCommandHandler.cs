using MediatR;
using Microsoft.EntityFrameworkCore;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Features.Auth.Register;
using TalkToLearn.Api.Infrastructure.Sql;
using TalkToLearn.Api.Infrastructure.Sql.Models;

namespace TalkToLearn.Api.Features.Auth.Login;

public class LoginCommandHandler(
    AppDbContext db,
    TokenService tokens,
    PermissionLoader permissions,
    ILogger<LoginCommandHandler> logger)
    : IRequestHandler<LoginCommand, Result<AuthResponse>>
{
    public async Task<Result<AuthResponse>> Handle(LoginCommand cmd, CancellationToken ct)
    {
        logger.LogInformation("Login attempt for {Email}", cmd.Email);

        if (string.IsNullOrWhiteSpace(cmd.Email) || string.IsNullOrWhiteSpace(cmd.Password))
            return Result<AuthResponse>.Failure("Email and password are required.", 400);

        var email = cmd.Email.Trim().ToLower();

        // Single indexed lookup — no full-scan, no RU cost
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

        // Same message for wrong email OR wrong password — never reveal which
        if (user is null || !BCrypt.Net.BCrypt.Verify(cmd.Password, user.PasswordHash))
        {
            logger.LogWarning("Login failed for {Email}", email);
            await RecordLogin(user?.Id ?? "unknown", email, false, "Invalid credentials", ct);
            return Result<AuthResponse>.Failure("Incorrect email or password.", 401);
        }

        logger.LogInformation("Login successful for {Email}", email);
        await RecordLogin(user.Id, email, true, null, ct);

        var name     = $"{user.FirstName} {user.LastName}".Trim();
        var username = $"{user.FirstName}{user.LastName}".ToLower().Replace(" ", "");
        var perms    = await permissions.LoadAsync(user.Id, ct);
        var role     = perms.Contains("CAN_VIEW_ADMIN_PORTAL")  ? "Admin"
                     : perms.Contains("CAN_VIEW_RECRUITER_PORTAL") ? "Recruiter"
                     : perms.Contains("CAN_VIEW_CLIENT_PORTAL")    ? "Client"
                     : "Candidate";
        var token    = tokens.CreateSessionToken(user.Id, user.Email, name, role, perms);
        var response = new AuthResponse(token, new UserDto(user.Id, user.Email, name, user.FirstName, username, role));

        return Result<AuthResponse>.Success(response);
    }

    private async Task RecordLogin(string userId, string email, bool success, string? failureReason, CancellationToken ct)
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
            });
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to record login history for {Email}", email);
        }
    }
}
