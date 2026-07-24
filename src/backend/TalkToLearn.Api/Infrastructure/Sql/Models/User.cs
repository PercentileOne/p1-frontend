namespace TalkToLearn.Api.Infrastructure.Sql.Models;

public class User
{
    public string Id           { get; init; }  = Guid.NewGuid().ToString();
    public string Email        { get; set; }   = string.Empty;
    public string PasswordHash { get; set; }   = string.Empty;
    public string FirstName    { get; set; }   = string.Empty;
    public string LastName     { get; set; }   = string.Empty;
    public string Role         { get; set; }   = "user";          // user | admin
    public DateTime CreatedAt  { get; init; }  = DateTime.UtcNow;
    public DateTime UpdatedAt  { get; set; }   = DateTime.UtcNow;

    // Navigation
    public List<Follow> Following { get; set; } = [];   // people this user follows
    public List<Follow> Followers { get; set; } = [];   // people who follow this user
}
