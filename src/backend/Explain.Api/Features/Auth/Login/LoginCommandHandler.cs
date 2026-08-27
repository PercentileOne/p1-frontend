using MediatR;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Features.Auth.Register;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Auth.Login;

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
