using MediatR;
using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Domain.Profile;
using TalkToLearn.Api.Infrastructure.Cosmos;
using TalkToLearn.Api.Infrastructure.Sql;
using SqlUser = TalkToLearn.Api.Infrastructure.Sql.Models.User;

namespace TalkToLearn.Api.Features.Auth.Register;

public class RegisterCommandHandler(
    AppDbContext db,
    CosmosService cosmos,
    TokenService tokens,
    ILogger<RegisterCommandHandler> logger)
    : IRequestHandler<RegisterCommand, Result<AuthResponse>>
{
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
            Role         = "user",
        };

        db.Users.Add(sqlUser);

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
        var token    = tokens.CreateSessionToken(sqlUser.Id, sqlUser.Email, name, sqlUser.Role);
        var response = new AuthResponse(token, new UserDto(sqlUser.Id, sqlUser.Email, name, sqlUser.FirstName, username, sqlUser.Role));

        return Result<AuthResponse>.Success(response);
    }
}
