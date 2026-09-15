namespace Explain.Api.Features.SessionPasses;

/// <summary>
/// The two configurations of the one shared entitlement mechanism (Francis, 2026-09-15) — a
/// gift someone else buys for a candidate, and the candidate's own self-purchase one-off pass.
/// Same SessionPass document shape, same SessionPassService, just a different tier looked up
/// here by `source`. Gift is deliberately cheaper/smaller than self-purchase: real measured
/// LiveAvatar cost is £0.44/practice interview, so 5 sessions = £2.20 cost against £3.99 —
/// healthy margin without needing the full 10-session self-purchase allowance.
/// </summary>
public static class PassTiers
{
    public static readonly IReadOnlyDictionary<string, PassTier> All = new Dictionary<string, PassTier>
    {
        ["gift"] = new PassTier(AmountGbp: 3.99m, SessionsTotal: 5, WindowDays: 7),
        ["self"] = new PassTier(AmountGbp: 5.99m, SessionsTotal: 10, WindowDays: 7),
    };

    public static PassTier? Get(string source) => All.GetValueOrDefault(source);
}

public record PassTier(decimal AmountGbp, int SessionsTotal, int WindowDays);
