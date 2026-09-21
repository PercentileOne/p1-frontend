namespace Explain.Api.Infrastructure.Sql.Models;

/// <summary>
/// A recruiter or employer asking for an account (Francis, 2026-09-21). They can't self-register — they get candidate data, so a human
/// vets each one: request -> Francis calls -> admin creates the organisation + first account and sends a Stripe payment link.
/// Status: new | contacted | approved (organisation + account created) | paid | declined.
/// </summary>
public class AccessRequest
{
    public string Id { get; init; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Type { get; set; } = "recruiter";          // recruiter | employer
    public int Seats { get; set; } = 1;
    public string? Message { get; set; }
    public string Status { get; set; } = "new";
    public string? Notes { get; set; }                       // Francis's own notes from the call
    public decimal? QuotedMonthlyGbp { get; set; }           // per seat; null = the standard price for the type
    public int? OrganisationId { get; set; }                 // set once the organisation has been created
    public string? StripeCheckoutSessionId { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public DateTime? PaymentLinkSentAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? HandledBy { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
