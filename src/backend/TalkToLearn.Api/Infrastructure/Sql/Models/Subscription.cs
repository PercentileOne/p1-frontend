namespace TalkToLearn.Api.Infrastructure.Sql.Models;

public class Subscription
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;      // links to Cosmos user document
    public string Plan { get; set; } = "free";              // free | student | pro | org
    public string Status { get; set; } = "active";          // active | cancelled | past_due | paused
    public decimal PriceGbp { get; set; }
    public string BillingCycle { get; set; } = "monthly";   // monthly | annual
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CancelledAt { get; set; }
    public DateTime? RenewsAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public List<PaymentRecord> Payments { get; set; } = [];
}
