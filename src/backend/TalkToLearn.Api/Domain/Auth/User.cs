using Newtonsoft.Json;

namespace TalkToLearn.Api.Domain.Auth;

public class User
{
    [JsonProperty("id")]
    public string Id { get; init; } = Guid.NewGuid().ToString();
    [JsonProperty("email")]
    public string Email { get; init; } = string.Empty;
    [JsonProperty("firstName")]
    public string FirstName { get; set; } = string.Empty;
    [JsonProperty("lastName")]
    public string LastName { get; set; } = string.Empty;
    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;
    [JsonProperty("age")]
    public int? Age { get; set; }
    [JsonProperty("title")]
    public string? Title { get; set; }
    [JsonProperty("username")]
    public string Username { get; set; } = string.Empty;
    [JsonProperty("bio")]
    public string Bio { get; set; } = string.Empty;
    [JsonProperty("jobRole")]
    public string? JobRole { get; set; }
    [JsonProperty("interests")]
    public List<string> Interests { get; set; } = [];
    [JsonProperty("role")]
    public string Role { get; set; } = "user";
    [JsonProperty("subscription")]
    public string Subscription { get; set; } = "free";
    [JsonProperty("createdAt")]
    public string CreatedAt { get; init; } = DateTime.UtcNow.ToString("O");
    [JsonProperty("updatedAt")]
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("O");
    [JsonProperty("passwordHash")]
    public string? PasswordHash { get; set; }
    [JsonProperty("pk")]
    public string Pk { get; init; } = "user";

    public static User Create(
        string email,
        string? passwordHash = null,
        string? firstName = null,
        string? lastName = null,
        int? age = null,
        string? profession = null) => new()
    {
        Email        = email,
        FirstName    = firstName ?? email.Split('@')[0],
        LastName     = lastName ?? string.Empty,
        Name         = firstName != null
                           ? $"{firstName} {lastName}".Trim()
                           : email.Split('@')[0],
        Age          = age,
        JobRole      = profession,
        Username     = email.Split('@')[0].ToLower().Replace(".", "").Replace("-", ""),
        PasswordHash = passwordHash,
    };
}
