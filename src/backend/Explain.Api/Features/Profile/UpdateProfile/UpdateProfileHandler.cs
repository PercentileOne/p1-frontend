using MediatR;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Domain.Profile;
using Explain.Api.Infrastructure.Cosmos;
using System.Linq;

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
    string? DreamRoleTimeline = null,
    string? Location         = null,
    string? Banner           = null,
    List<string>? FavouriteFilms = null,
    List<ProfileProject>? Projects = null,
    bool? CommentsEnabled = null,
    bool? SearchableByRecruiters = null,
    string? EmploymentTypePreference = null,
    string? RemotePreference = null)
    : IRequest<Result<UserProfile>>;

public class UpdateProfileHandler(
    CosmosService cosmos,
    ILogger<UpdateProfileHandler> logger)
    : IRequestHandler<UpdateProfileCommand, Result<UserProfile>>
{
    public async Task<Result<UserProfile>> Handle(UpdateProfileCommand cmd, CancellationToken ct)
    {
        var validationError = Validate(cmd);
        if (validationError is not null) return Result<UserProfile>.Failure(validationError, 400);

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
        if (cmd.Location       is not null) profile.Location       = cmd.Location.Trim();
        if (cmd.Banner         is not null) profile.Banner         = cmd.Banner;
        if (cmd.FavouriteFilms is not null) profile.FavouriteFilms = cmd.FavouriteFilms;
        if (cmd.Projects       is not null) profile.Projects       = cmd.Projects;
        if (cmd.CommentsEnabled is not null) profile.CommentsEnabled = cmd.CommentsEnabled.Value;
        if (cmd.SearchableByRecruiters is not null) profile.SearchableByRecruiters = cmd.SearchableByRecruiters.Value;
        // Empty string means "cleared back to unset" — stored as null, not "", to keep
        // the "null = candidate hasn't set a preference" invariant clean for the search filter.
        if (cmd.EmploymentTypePreference is not null)
            profile.EmploymentTypePreference = cmd.EmploymentTypePreference.Trim() is { Length: > 0 } et ? et.ToLowerInvariant() : null;
        if (cmd.RemotePreference is not null)
            profile.RemotePreference = cmd.RemotePreference.Trim() is { Length: > 0 } rp ? rp.ToLowerInvariant() : null;

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

    private static readonly HashSet<string> AllowedProjectStatuses = new(StringComparer.OrdinalIgnoreCase) { "current", "past", "future" };
    private static readonly HashSet<string> AllowedEmploymentTypes = new(StringComparer.OrdinalIgnoreCase) { "permanent", "contract", "either" };
    private static readonly HashSet<string> AllowedRemoteTypes = new(StringComparer.OrdinalIgnoreCase) { "remote", "hybrid", "onsite", "any" };

    // No validation existed on this handler at all before — every field below was
    // previously accepted as arbitrary-length free text straight into Cosmos.
    private static string? Validate(UpdateProfileCommand cmd)
    {
        if (cmd.Bio?.Length > 500) return "Bio must be 500 characters or fewer.";
        if (cmd.Location?.Length > 100) return "Location must be 100 characters or fewer.";
        if (cmd.JobTitle?.Length > 100) return "Job title must be 100 characters or fewer.";
        if (cmd.JobRole?.Length > 100) return "Job role must be 100 characters or fewer.";
        if (cmd.Company?.Length > 100) return "Company must be 100 characters or fewer.";

        if (cmd.Interests is not null)
        {
            if (cmd.Interests.Count > 30) return "You can list up to 30 interests.";
            if (cmd.Interests.Any(i => i.Length > 60)) return "Each interest must be 60 characters or fewer.";
        }

        if (cmd.FavouriteFilms is not null)
        {
            if (cmd.FavouriteFilms.Count > 30) return "You can list up to 30 favourite films.";
            if (cmd.FavouriteFilms.Any(f => f.Length > 60)) return "Each film title must be 60 characters or fewer.";
        }

        if (cmd.Projects is not null)
        {
            if (cmd.Projects.Count > 20) return "You can list up to 20 projects.";
            foreach (var p in cmd.Projects)
            {
                if (string.IsNullOrWhiteSpace(p.Title)) return "Every project needs a title.";
                if (p.Title.Length > 100) return "Project titles must be 100 characters or fewer.";
                if (p.Description?.Length > 1000) return "Project descriptions must be 1000 characters or fewer.";
                if (!AllowedProjectStatuses.Contains(p.Status)) return "Project status must be current, past, or future.";
            }
        }

        if (!string.IsNullOrWhiteSpace(cmd.EmploymentTypePreference) && !AllowedEmploymentTypes.Contains(cmd.EmploymentTypePreference))
            return "Employment type must be permanent, contract, or either.";
        if (!string.IsNullOrWhiteSpace(cmd.RemotePreference) && !AllowedRemoteTypes.Contains(cmd.RemotePreference))
            return "Remote preference must be remote, hybrid, onsite, or any.";

        return null;
    }
}
