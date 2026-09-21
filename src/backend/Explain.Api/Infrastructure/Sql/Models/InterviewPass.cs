namespace Explain.Api.Infrastructure.Sql.Models;

/// <summary>
/// One practice-interview entitlement, gifted ("gift") or self-bought ("self") — see Features/SessionPasses/PassTiers. Moved from
/// Cosmos to Azure SQL on 2026-09-21 (Francis: "I've gotten used to that sort of thing being in SQL"), so passes now sit beside
/// Subscriptions, AccessGrants and InterviewUsages and can be joined, reported on and counted atomically.
///
/// The public shape the rest of the app and the UI use is still the SessionPass record (Features/SessionPasses/SessionPass.cs);
/// SessionPassService maps between the two, so nothing outside that service knows the storage changed.
/// </summary>
public class InterviewPass
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string RecipientEmail { get; set; } = string.Empty;   // lower-case, trimmed — the source of truth for who a pass belongs to
    public string RecipientName { get; set; } = string.Empty;
    public string? RecipientJobTitle { get; set; }
    public string TierId { get; set; } = string.Empty;           // gift-3day | gift-1week | self
    public string Source { get; set; } = string.Empty;           // gift | self
    public string? SenderName { get; set; }
    public string? SenderEmail { get; set; }
    public string Status { get; set; } = "pending";              // pending | paid | failed | refunded
    public string? StripeCheckoutSessionId { get; set; }
    public string? StripePaymentIntentId { get; set; }
    public decimal AmountGbp { get; set; }
    public string Currency { get; set; } = "GBP";
    public int SessionsTotal { get; set; }
    public int SessionsUsed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? RedeemedByUserId { get; set; }
}
