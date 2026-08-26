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

        // If this email already has an account, don't hard-reject — a real person can
        // legitimately be both a candidate and a recruiter (or later, an employer), and
        // forcing a second email address for that would fragment them into two disconnected
        // profiles, which defeats the whole point of a single shareable candidate identity.
        // Instead: prove it's really them (correct password for the existing account), then
        // grant the additional role onto that SAME account rather than creating a new one.
        var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (existing is not null)
        {
            if (!BCrypt.Net.BCrypt.Verify(cmd.Password, existing.PasswordHash))
            {
                logger.LogWarning("Register failed — email already exists, password mismatch: {Email}", email);
                return Result<AuthResponse>.Failure("An account with this email already exists.", 409);
            }

            var alreadyHasRole = await db.UserRoles.AnyAsync(ur => ur.UserId == existing.Id && ur.RoleId == roleId, ct);
            if (!alreadyHasRole)
            {
                db.UserRoles.Add(new UserRole { UserId = existing.Id, RoleId = roleId });
                await db.SaveChangesAsync(ct);
                logger.LogInformation("Added {Role} role to existing account {Email} ({Id})", roleName, email, existing.Id);
            }

            var existingName     = $"{existing.FirstName} {existing.LastName}".Trim();
            var existingUsername = $"{existing.FirstName}{existing.LastName}".ToLower().Replace(" ", "");
            var existingPerms    = await permissions.LoadAsync(existing.Id, ct);
            var existingOrg      = await db.OrganisationMembers
                .Where(m => m.UserId == existing.Id)
                .OrderBy(m => m.JoinedAt)
                .Select(m => new { OrgId = m.OrganisationId.ToString(), OrgName = m.Organisation.Name, OrgRole = m.Role })
                .FirstOrDefaultAsync(ct);
            var existingToken    = tokens.CreateSessionToken(existing.Id, existing.Email, existingName, roleName, existingPerms,
                existingOrg?.OrgId, existingOrg?.OrgName, existingOrg?.OrgRole);
            return Result<AuthResponse>.Success(new AuthResponse(existingToken,
                new UserDto(existing.Id, existing.Email, existingName, existing.FirstName, existingUsername, roleName,
                    existingOrg?.OrgId, existingOrg?.OrgName, existingOrg?.OrgRole)));
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
