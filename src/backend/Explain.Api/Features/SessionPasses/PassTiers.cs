namespace Explain.Api.Features.SessionPasses;

/// <summary>
/// The configurations of the one shared entitlement mechanism. Keyed by a specific tierId (not
/// just "gift"/"self") since gift now offers two durations (Francis, 2026-09-16 — the marketing
/// page's "Gift an Interview" section) at different price points. Same SessionPass document
/// shape, same SessionPassService either way — Source on each tier is the broad "gift" | "self"
/// category (used for payer-email/product-copy logic and shown to the recipient), separate from
/// tierId (used to look these configs back up, e.g. on MarkPaidAsync — see SessionPass.tierId's
/// own comment for why that's a distinct field from source).
///
/// Pricing built from real measured LiveAvatar cost, £0.44/practice interview: gift-3day (3
/// sessions, cost £1.32) at £2.99 is the low-commitment "try it" option; gift-1week (5 sessions,
/// cost £2.20) at £3.99 is the original gift tier, unchanged. Self-purchase (10 sessions, cost
/// £4.40) at £5.99 — a candidate already knows the product, so a bigger single allowance makes
/// more sense there than a duration ladder.
/// </summary>
public static class PassTiers
{
    public static readonly IReadOnlyDictionary<string, PassTier> All = new Dictionary<string, PassTier>
    {
        ["gift-3day"] = new PassTier(Source: "gift", AmountGbp: 2.99m, SessionsTotal: 3, WindowDays: 3, Label: "3-Day Pass"),
        ["gift-1week"] = new PassTier(Source: "gift", AmountGbp: 3.99m, SessionsTotal: 5, WindowDays: 7, Label: "1-Week Pass"),
        ["self"] = new PassTier(Source: "self", AmountGbp: 5.99m, SessionsTotal: 10, WindowDays: 7, Label: "Interview Pass"),
    };

    public static PassTier? Get(string tierId) => All.GetValueOrDefault(tierId);
}

// Label is the marketing-facing name (matches the "3-Day Pass"/"1-Week Pass" tier cards on
// home.html and gift-interview.html) — used anywhere copy describes the pass by its window
// rather than its raw session count, e.g. the recipient invite email.
public record PassTier(string Source, decimal AmountGbp, int SessionsTotal, int WindowDays, string Label);
