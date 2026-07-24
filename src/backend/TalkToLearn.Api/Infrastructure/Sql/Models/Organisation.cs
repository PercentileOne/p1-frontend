namespace TalkToLearn.Api.Infrastructure.Sql.Models;

public class Organisation
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;        // e.g. "University of Westminster"
    public string Type { get; set; } = "business";          // business | university | jobcentre | recruitment
    public string ContactEmail { get; set; } = string.Empty;
    public string? ContactName { get; set; }
    public int SeatCount { get; set; } = 1;                 // number of licences purchased
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public List<OrganisationMember> Members { get; set; } = [];
}
