using Newtonsoft.Json;

namespace Explain.Api.Domain.Profile;

public class UserProfile
{
    [JsonProperty("id")]
    public string Id { get; init; } = Guid.NewGuid().ToString();

    // Partition key = userId so all profile reads are single-partition lookups
    [JsonProperty("userId")]
    public string UserId { get; init; } = string.Empty;

    [JsonProperty("firstName")]
    public string FirstName { get; set; } = string.Empty;

    [JsonProperty("lastName")]
    public string LastName { get; set; } = string.Empty;

    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("username")]
    public string Username { get; set; } = string.Empty;

    [JsonProperty("bio")]
    public string Bio { get; set; } = string.Empty;

    [JsonProperty("jobRole")]
    public string? JobRole { get; set; }

    [JsonProperty("jobTitle")]
    public string? JobTitle { get; set; }

    [JsonProperty("company")]
    public string? Company { get; set; }

    [JsonProperty("interests")]
    public List<string> Interests { get; set; } = [];

    [JsonProperty("avatar")]
    public string? Avatar { get; set; }

    [JsonProperty("banner")]
    public string? Banner { get; set; }

    [JsonProperty("location")]
    public string? Location { get; set; }

    [JsonProperty("favouriteFilms")]
    public List<string> FavouriteFilms { get; set; } = [];

    [JsonProperty("projects")]
    public List<ProfileProject> Projects { get; set; } = [];

    [JsonProperty("commentsEnabled")]
    public bool CommentsEnabled { get; set; } = false;

    [JsonProperty("blockedUsers")]
    public List<BlockedUserRef> BlockedUsers { get; set; } = [];

    [JsonProperty("phone")]
    public string? Phone { get; set; }

    // ── Journey / Self Architecture ───────────────────────────────────────────
    [JsonProperty("lifeStage")]
    public string? LifeStage { get; set; }

    [JsonProperty("dreamRoleTitle")]
    public string? DreamRoleTitle { get; set; }

    [JsonProperty("dreamRoleIndustry")]
    public string? DreamRoleIndustry { get; set; }

    [JsonProperty("dreamRoleSalary")]
    public string? DreamRoleSalary { get; set; }

    [JsonProperty("dreamRoleTimeline")]
    public string? DreamRoleTimeline { get; set; }

    [JsonProperty("updatedAt")]
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("O");

    [JsonProperty("createdAt")]
    public string CreatedAt { get; init; } = DateTime.UtcNow.ToString("O");

    public static UserProfile Create(string userId, string firstName, string lastName, string? jobRole = null) => new()
    {
        // Id must equal UserId — GetProfileHandler always reads by id=userId, and
        // without this the default `Id = Guid.NewGuid()` orphans the document:
        // every registration silently created a profile no GET could ever find.
        Id        = userId,
        UserId    = userId,
        FirstName = firstName,
        LastName  = lastName,
        Name      = $"{firstName} {lastName}".Trim(),
        Username  = $"{firstName}{lastName}".ToLower().Replace(" ", ""),
        JobRole   = jobRole,
    };
}

public class ProfileProject
{
    [JsonProperty("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [JsonProperty("title")]
    public string Title { get; set; } = string.Empty;

    // "current" | "past" | "future"
    [JsonProperty("status")]
    public string Status { get; set; } = "current";

    [JsonProperty("description")]
    public string Description { get; set; } = string.Empty;
}

public class BlockedUserRef
{
    [JsonProperty("userId")]
    public string UserId { get; set; } = string.Empty;

    // Denormalized at block-time so the "blocked users" list never needs a lookup.
    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("blockedAt")]
    public string BlockedAt { get; set; } = DateTime.UtcNow.ToString("O");
}

// Trimmed projection returned by GET /profile/{userId} when viewing someone else's
// profile — never exposes Phone or the DreamRole* fields.
public class PublicProfile
{
    [JsonProperty("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    [JsonProperty("username")]
    public string Username { get; set; } = string.Empty;

    [JsonProperty("bio")]
    public string Bio { get; set; } = string.Empty;

    [JsonProperty("jobRole")]
    public string? JobRole { get; set; }

    [JsonProperty("jobTitle")]
    public string? JobTitle { get; set; }

    [JsonProperty("company")]
    public string? Company { get; set; }

    [JsonProperty("interests")]
    public List<string> Interests { get; set; } = [];

    [JsonProperty("avatar")]
    public string? Avatar { get; set; }

    [JsonProperty("banner")]
    public string? Banner { get; set; }

    [JsonProperty("location")]
    public string? Location { get; set; }

    [JsonProperty("commentsEnabled")]
    public bool CommentsEnabled { get; set; }

    public static PublicProfile From(UserProfile p) => new()
    {
        UserId = p.UserId,
        Name = p.Name,
        Username = p.Username,
        Bio = p.Bio,
        JobRole = p.JobRole,
        JobTitle = p.JobTitle,
        Company = p.Company,
        Interests = p.Interests,
        Avatar = p.Avatar,
        Banner = p.Banner,
        Location = p.Location,
        CommentsEnabled = p.CommentsEnabled,
    };
}
