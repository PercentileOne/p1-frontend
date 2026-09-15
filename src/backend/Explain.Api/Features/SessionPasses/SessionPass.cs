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
    string source, // "gift" | "self"
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
