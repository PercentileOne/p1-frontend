namespace Explain.Api.Infrastructure.Sql.Models;

public class OrganisationMember
{
    public int Id { get; set; }
    public int OrganisationId { get; set; }
    public string UserId { get; set; } = string.Empty;      // links to Cosmos user document
    public string Role { get; set; } = "member";            // admin | member
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Organisation Organisation { get; set; } = null!;
}
