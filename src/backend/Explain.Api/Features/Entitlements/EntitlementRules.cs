using System.Text.RegularExpressions;

namespace Explain.Api.Features.Entitlements;

/// <summary>Live-tunable numbers (stored in Cosmos platformSettings, edited on the admin Access page — no deploy needed).</summary>
public record EntitlementSettings(bool Enforce, int DailyCap, int MonthlyCap, bool TasterEnabled)
{
    // Francis, 2026-09-21: subscribers get 3 interviews a day and 10 a month (a £4.99 subscriber breaks even at about 10 at
    // ~£0.44 each); one free taster per email. Enforcement starts OFF so shipping this changes nothing until it is switched on.
    public static readonly EntitlementSettings Default = new(Enforce: false, DailyCap: 3, MonthlyCap: 10, TasterEnabled: true);
}

/// <summary>Everything the decision needs, gathered by the service. Kept as plain data so the rules are trivially testable.</summary>
public record EntitlementFacts(
    bool IsStaff,
    bool HasComplimentary,      // complimentary (existing accounts) or an individual comp
    bool HasSubscription,       // active, past_due (grace), or cancelled-but-paid-until-period-end
    int PassSessionsLeft,       // across active, unexpired passes
    int DailyUsed,              // interviews started today (UK time) that count toward the daily limit
    int MonthlyUsed,            // ... this UK month
    bool TasterUsed,            // this email has already had its one free interview
    bool EmailVerified,
    bool DisposableEmail);

public record EntitlementDecision(bool Allowed, string Source, string Code, string Message);

public static class EntitlementRules
{
    // Order matters: the most generous free access first, then paid, then the one-off taster.
    public static EntitlementDecision Decide(EntitlementFacts f, EntitlementSettings s)
    {
        if (f.IsStaff)
            return new(true, "staff", "staff", "Staff access.");

        // Complimentary/comp accounts still respect the DAILY limit (a runaway script or a very keen tester shouldn't be able to
        // burn the AI budget), but have no monthly limit and pay nothing.
        var complimentaryBlocked = false;
        if (f.HasComplimentary)
        {
            if (f.DailyUsed < s.DailyCap) return new(true, "complimentary", "complimentary", "Complimentary access.");
            complimentaryBlocked = true;
        }

        var subscriptionBlocked = false;
        string? subscriptionBlockCode = null;
        if (f.HasSubscription)
        {
            if (f.DailyUsed >= s.DailyCap) { subscriptionBlocked = true; subscriptionBlockCode = "daily-cap"; }
            else if (f.MonthlyUsed >= s.MonthlyCap) { subscriptionBlocked = true; subscriptionBlockCode = "monthly-cap"; }
            else return new(true, "subscription", "subscription", "Subscriber.");
        }

        // A pass has its own session count and expiry, so it isn't subject to the daily/monthly limits.
        if (f.PassSessionsLeft > 0)
            return new(true, "pass", "pass", "Interview pass.");

        // The taster is for people with NO other access — a subscriber or complimentary account that has hit its daily/monthly
        // limit must not silently burn it.
        if (s.TasterEnabled && !f.TasterUsed && !f.HasSubscription && !f.HasComplimentary)
        {
            if (f.DisposableEmail)
                return new(false, "none", "email-not-eligible", "Your free interview needs a regular email address — disposable addresses can't be used. You can subscribe or buy a pass instead.");
            if (!f.EmailVerified)
                return new(false, "none", "verify-email", "Please verify your email address to claim your free interview.");
            return new(true, "taster", "taster", "Your free interview.");
        }

        if (subscriptionBlocked || complimentaryBlocked)
        {
            var code = subscriptionBlockCode ?? "daily-cap";
            return code == "monthly-cap"
                ? new(false, "none", "monthly-cap", $"You've used your {s.MonthlyCap} interviews for this month. Your allowance resets at the start of next month — or buy a one-off pass to keep practising now.")
                : new(false, "none", "daily-cap", $"You've used your {s.DailyCap} interviews for today. Your allowance resets at midnight (UK time).");
        }

        if (f.TasterUsed)
            return new(false, "none", "taster-used", "You've had your free interview. Subscribe for £4.99 a month, or buy a one-off pass, to keep practising.");

        return new(false, "none", "no-access", "Subscribe for £4.99 a month, or buy a one-off pass, to start an interview.");
    }
}

/// <summary>
/// "One free taster per email" only means something if the same mailbox can't be written several ways: name+1@gmail.com,
/// n.a.m.e@gmail.com and googlemail.com are all the same inbox. Every check keys on the normalised form. (It can't stop someone
/// with genuinely many mailboxes — each such attempt costs about £0.44 — but it closes the free, effortless tricks.)
/// </summary>
public static class EmailNormaliser
{
    public static string Key(string email)
    {
        var e = (email ?? string.Empty).Trim().ToLowerInvariant();
        var at = e.LastIndexOf('@');
        if (at <= 0) return e;
        var local = e[..at];
        var domain = e[(at + 1)..];

        var plus = local.IndexOf('+');
        if (plus > 0) local = local[..plus];

        if (domain is "gmail.com" or "googlemail.com")
        {
            local = local.Replace(".", "");
            domain = "gmail.com";
        }
        return $"{local}@{domain}";
    }

    private static readonly HashSet<string> Disposable = new(StringComparer.OrdinalIgnoreCase)
    {
        "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "sharklasers.com", "10minutemail.com", "10minutemail.net",
        "tempmail.com", "temp-mail.org", "temp-mail.io", "yopmail.com", "yopmail.net", "trashmail.com", "trashmail.net", "getnada.com", "nada.email",
        "dispostable.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mailnesia.com", "mintemail.com", "mohmal.com", "tempail.com",
        "emailondeck.com", "mytemp.email", "burnermail.io", "spamgourmet.com", "moakt.com", "mail.tm", "tempmailo.com", "discard.email",
    };

    public static bool IsDisposable(string email)
    {
        var at = (email ?? string.Empty).LastIndexOf('@');
        return at > 0 && Disposable.Contains(email[(at + 1)..].Trim());
    }

    // Loose sanity check used when an admin adds a grant by email.
    public static bool LooksLikeEmail(string? email) =>
        !string.IsNullOrWhiteSpace(email) && Regex.IsMatch(email.Trim(), @"^[^@\s]+@[^@\s]+\.[^@\s]+$");
}
