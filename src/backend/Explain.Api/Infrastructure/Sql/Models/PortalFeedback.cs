namespace Explain.Api.Infrastructure.Sql.Models;

public class PortalFeedback
{
    public int       Id           { get; set; }
    public string    Name         { get; set; } = "";
    public string?   Email        { get; set; }
    public string?   Occupation   { get; set; }
    public string?   AgeGroup     { get; set; }
    public string?   HowHeard     { get; set; }

    // Ratings stored as JSON ({"overall":5,"ease_of_use":4,...})
    public string    RatingsJson  { get; set; } = "{}";

    public string    Thoughts     { get; set; } = "";
    public string?   Improvements { get; set; }
    public string?   Recommend    { get; set; }
    public string?   Source       { get; set; }
    public DateTime  SubmittedAt  { get; set; } = DateTime.UtcNow;
}
