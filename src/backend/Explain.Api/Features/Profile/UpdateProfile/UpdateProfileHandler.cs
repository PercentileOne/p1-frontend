using MediatR;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Domain.Profile;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Profile.UpdateProfile;

public record UpdateProfileCommand(
    string UserId,
    string? FirstName,
    string? LastName,
    string? Bio,
    string? JobRole,
    string? JobTitle,
    string? Company,
    string? Phone,
    string? Avatar,
    List<string>? Interests,
    string? LifeStage        = null,
    string? DreamRoleTitle   = null,
    string? DreamRoleIndustry = null,
    string? DreamRoleSalary  = null,
    string? DreamRoleTimeline = null)
    : IRequest<Result<UserProfile>>;

public class UpdateProfileHandler(
    CosmosService cosmos,
    ILogger<UpdateProfileHandler> logger)
    : IRequestHandler<UpdateProfileCommand, Result<UserProfile>>
{
    public async Task<Result<UserProfile>> Handle(UpdateProfileCommand cmd, CancellationToken ct)
    {
        var container = cosmos.GetContainer("profiles");
        UserProfile profile;

        try
        {
            var response = await container.ReadItemAsync<UserProfile>(
                cmd.UserId, new PartitionKey(cmd.UserId), cancellationToken: ct);
            profile = response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Create profile if it somehow doesn't exist yet. Id must equal UserId —
            // GetProfileHandler always reads by id=userId, and without this the
            // default `Id = Guid.NewGuid()` orphans a fresh, never-retrievable
            // document on every single save.
            profile = new UserProfile { Id = cmd.UserId, UserId = cmd.UserId };
        }

        // Apply only the fields the caller sent
        if (cmd.FirstName is not null) { profile.FirstName = cmd.FirstName.Trim(); }
        if (cmd.LastName  is not null) { profile.LastName  = cmd.LastName.Trim(); }
        if (cmd.FirstName is not null || cmd.LastName is not null)
            profile.Name = $"{profile.FirstName} {profile.LastName}".Trim();
        if (cmd.Bio       is not null) profile.Bio       = cmd.Bio.Trim();
        if (cmd.JobRole   is not null) profile.JobRole   = cmd.JobRole.Trim();
        if (cmd.JobTitle  is not null) profile.JobTitle  = cmd.JobTitle.Trim();
        if (cmd.Company   is not null) profile.Company   = cmd.Company.Trim();
        if (cmd.Phone     is not null) profile.Phone     = cmd.Phone.Trim();
        if (cmd.Avatar    is not null) profile.Avatar    = cmd.Avatar;
        if (cmd.Interests         is not null) profile.Interests          = cmd.Interests;
        if (cmd.LifeStage         is not null) profile.LifeStage          = cmd.LifeStage.Trim();
        if (cmd.DreamRoleTitle    is not null) profile.DreamRoleTitle     = cmd.DreamRoleTitle.Trim();
        if (cmd.DreamRoleIndustry is not null) profile.DreamRoleIndustry  = cmd.DreamRoleIndustry.Trim();
        if (cmd.DreamRoleSalary   is not null) profile.DreamRoleSalary    = cmd.DreamRoleSalary.Trim();
        if (cmd.DreamRoleTimeline is not null) profile.DreamRoleTimeline  = cmd.DreamRoleTimeline.Trim();

        profile.UpdatedAt = DateTime.UtcNow.ToString("O");

        try
        {
            await container.UpsertItemAsync(profile, new PartitionKey(cmd.UserId), cancellationToken: ct);
            logger.LogInformation("Profile updated for {UserId}", cmd.UserId);
            return Result<UserProfile>.Success(profile);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Profile update failed for {UserId}", cmd.UserId);
            return Result<UserProfile>.Failure("Could not save profile.", 500);
        }
    }
}
