using MediatR;
using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Domain.Profile;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;
using SqlUser = Explain.Api.Infrastructure.Sql.Models.User;

namespace Explain.Api.Features.Auth.Register;

public class RegisterCommandHandler(
    AppDbContext db,
    CosmosService cosmos,
    TokenService tokens,
    PermissionLoader permissions,
    ILogger<RegisterCommandHandler> logger)
    : IRequestHandler<RegisterCommand, Result<AuthResponse>>
{
    // Only roles a stranger should be able to grant themselves through a public, anonymous
    // endpoint. Client/Admin/SuperAdmin are seeded (see AddRbacRolesAndPermissions migration)
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

        // Duplicate check in SQL — indexed, instant, no full-scan
        if (await db.Users.AnyAsync(u => u.Email == email, ct))
        {
            logger.LogWarning("Register failed — email already exists: {Email}", email);
            return Result<AuthResponse>.Failure("An account with this email already exists.", 409);
        }

        // Write identity to SQL
        var sqlUser = new SqlUser
        {
            Email        = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(cmd.Password),
            FirstName    = cmd.FirstName.Trim(),
            LastName     = cmd.LastName.Trim(),
            Role         = roleName,
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

        var name     = $"{sqlUser.FirstName} {sqlUser.LastName}".Trim();
        var username = $"{sqlUser.FirstName}{sqlUser.LastName}".ToLower().Replace(" ", "");
        var perms    = await permissions.LoadAsync(sqlUser.Id, ct);
        var token    = tokens.CreateSessionToken(sqlUser.Id, sqlUser.Email, name, roleName, perms);
        var response = new AuthResponse(token, new UserDto(sqlUser.Id, sqlUser.Email, name, sqlUser.FirstName, username, roleName));

        return Result<AuthResponse>.Success(response);
    }
}
