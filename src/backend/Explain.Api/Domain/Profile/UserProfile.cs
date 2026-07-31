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
        UserId    = userId,
        FirstName = firstName,
        LastName  = lastName,
        Name      = $"{firstName} {lastName}".Trim(),
        Username  = $"{firstName}{lastName}".ToLower().Replace(" ", ""),
        JobRole   = jobRole,
    };
}
