namespace Explain.Api.Infrastructure.Sql.Models;

/// <summary>
/// A one-off, no-login purchase (Francis, 2026-09-22): "Download 25 AI Interview Questions" for a named job role, sold from the
/// public marketing site for a small fixed price (see Features/QuestionPacks). Content is generated and stored at CHECKOUT-CREATION
/// time (Status="pending"), not in the webhook — a single Model Router call is cheap and this way the success page has the pack
/// ready to render the instant Stripe redirects back, with no "still generating, please wait" polling step. QuestionsJson is never
/// returned to the browser until the webhook flips Status to "paid" (see QuestionPackService.GetByCheckoutSessionIdAsync).
/// </summary>
public class QuestionPack
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string JobRole { get; set; } = string.Empty;
    public string? FocusAreas { get; set; }              // comma-separated chips/keywords the buyer picked, purely descriptive
    public string Difficulty { get; set; } = "Pro";       // Standard | Pro | Expert — see Features/QuestionPacks/Endpoint.cs's CleanDifficulty
    public string QuestionsJson { get; set; } = "[]";     // serialized List<{question, answer}>, 1-50 entries once generated (Count)
    public string Status { get; set; } = "pending";       // pending | paid | refunded
    public string? BuyerEmail { get; set; }               // filled in from Stripe's own checkout session once paid, not collected by us
    public string? StripeCheckoutSessionId { get; set; }
    public string? StripePaymentIntentId { get; set; }
    public decimal AmountGbp { get; set; }
    public string Currency { get; set; } = "GBP";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
}
