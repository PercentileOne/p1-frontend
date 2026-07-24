namespace TalkToLearn.Api.Infrastructure.Sql.Models;

public class PaymentRecord
{
    public int Id { get; set; }
    public int SubscriptionId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public decimal AmountGbp { get; set; }
    public string Currency { get; set; } = "GBP";
    public string Status { get; set; } = "succeeded";       // succeeded | failed | refunded
    public string? StripePaymentIntentId { get; set; }      // ready for Stripe integration
    public string? FailureReason { get; set; }
    public DateTime PaidAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Subscription Subscription { get; set; } = null!;
}
