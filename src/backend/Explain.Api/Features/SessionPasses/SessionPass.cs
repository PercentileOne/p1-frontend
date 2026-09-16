namespace Explain.Api.Features.SessionPasses;

/// <summary>
/// One practice-interview entitlement — either gifted by someone else ("gift") or bought by the
/// candidate themselves ("self"), see PassTiers for the two configurations. id = a fresh Guid,
/// not the recipient's email — recipientEmail is the partition key and a real candidate could
/// plausibly receive more than one pass over time (a second gift, or a repurchase after their
/// first expires), so it can't double as the document id.
///
/// email stays the source of truth for matching a pass to its recipient (same "no claim/link
/// step" pattern as InterviewPreps) — redeemedByUserId is set the first time an authenticated
/// candidate actually consumes a session, purely informational for admin visibility, never
/// itself part of the entitlement check.
/// </summary>
public record SessionPass(
    string id,
    string recipientEmail,
    string recipientName,
    string? recipientJobTitle,
    string tierId, // looks PassTiers back up — e.g. "gift-3day" | "gift-1week" | "self" — needed
                    // separately from source below because MarkPaidAsync needs the EXACT tier
                    // (specifically its WindowDays) that was actually purchased, and source alone
                    // is too coarse to distinguish gift-3day from gift-1week.
    string source, // "gift" | "self" — the broad category (PassTiers.Get(tierId).Source), shown
                    // to the recipient and used for payer-email/product-copy logic
    string? senderName,
    string? senderEmail,
    string status, // "pending" | "paid" | "failed"
    string? stripeCheckoutSessionId,
    string? stripePaymentIntentId,
    decimal amountGbp,
    string currency,
    int sessionsTotal,
    int sessionsUsed,
    DateTimeOffset createdAt,
    DateTimeOffset? paidAt,
    DateTimeOffset? expiresAt,
    string? redeemedByUserId);
