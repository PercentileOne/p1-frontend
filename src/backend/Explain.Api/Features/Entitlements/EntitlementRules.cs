using System.Text.RegularExpressions;

namespace Explain.Api.Features.Entitlements;

/// <summary>Live-tunable numbers (stored in Cosmos platformSettings, edited on the admin Access page — no deploy needed).</summary>
public record EntitlementSettings(bool Enforce, int DailyCap, int MonthlyCap, bool TasterEnabled,
    int FreePeriodMonths = 3, int FreePeriodMonthlyCap = 3, int RecruiterPrepCap = 10)
{
    // Francis, 2026-09-21: subscribers get 3 interviews a day and 10 a month (a £4.99 subscriber breaks even at about 10 at
    // ~£0.44 each); one free taster per email. Enforcement starts OFF so shipping this changes nothing until it is switched on.
    // Free period (Francis, 2026-10-22): every new account is free for 3 months from sign-up with 3 interviews a month (recruiters: 10 prep
    // links a month), then it needs a plan. Like every limit here it only bites once Enforce is on.
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
    bool DisposableEmail,
    int PrepSessionsLeft = 0,    // free practice sessions left on recruiter-sent interview preps (3 per prep)
    bool InFreePeriod = false,   // account is inside its free months (and is not staff / complimentary / a subscriber)
    int FreeMonthlyUsed = 0,     // free-period interviews started this UK month
    bool FreePeriodEnded = false);  // the free months are over, so the one-off taster no longer applies

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

        // The free months: 2 interviews a month (and the daily cap) for a new account's first 3 months. Placed before a pass so a paid pass
        // is only spent once the free allowance is. A verified, non-disposable email is needed, the same as for the taster.
        string? freeBlockCode = null;
        if (f.InFreePeriod && f.EmailVerified && !f.DisposableEmail)
        {
            // The monthly cap is checked first: when both are used up, "back tomorrow" would be a false promise.
            if (f.FreeMonthlyUsed >= s.FreePeriodMonthlyCap) freeBlockCode = "free-cap";
            else if (f.DailyUsed >= s.DailyCap) freeBlockCode = "daily-cap";
            else return new(true, "free-period", "free-period", "Free period.");
        }

        // A pass has its own session count and expiry, so it isn't subject to the daily/monthly limits.
        if (f.PassSessionsLeft > 0)
            return new(true, "pass", "pass", "Interview pass.");

        // A recruiter-sent interview prep is a gift from the recruiter (up to 3 practice sessions per prep) — it never depends on the
        // candidate's own plan, and must not burn the candidate's own one-off taster.
        if (f.PrepSessionsLeft > 0)
            return new(true, "prep", "prep", "Interview prep from your recruiter.");

        // The taster is for people with NO other access — a subscriber or complimentary account that has hit its daily/monthly
        // limit must not silently burn it.
        if (s.TasterEnabled && !f.TasterUsed && !f.HasSubscription && !f.HasComplimentary && !f.InFreePeriod && !f.FreePeriodEnded)
        {
            if (f.DisposableEmail)
                return new(false, "none", "email-not-eligible", "Your free interview needs a regular email address — disposable addresses can't be used. You can subscribe or buy a pass instead.");
            if (!f.EmailVerified)
                return new(false, "none", "verify-email", "Please verify your email address to claim your free interview.");
            return new(true, "taster", "taster", "Your free interview.");
        }

        if (freeBlockCode == "free-cap")
            return new(false, "none", "free-cap", $"You've used your {s.FreePeriodMonthlyCap} free interviews for this month. They reset at the start of next month, or buy a one-off pass to keep practicing now.");

        if (subscriptionBlocked || complimentaryBlocked || freeBlockCode == "daily-cap")
        {
            var code = subscriptionBlockCode ?? "daily-cap";
            return code == "monthly-cap"
                ? new(false, "none", "monthly-cap", $"You've used your {s.MonthlyCap} interviews for this month. Your allowance resets at the start of next month — or buy a one-off pass to keep practicing now.")
                : new(false, "none", "daily-cap", $"You've used your {s.DailyCap} interviews for today. Your allowance resets at midnight (UK time).");
        }

        if (f.FreePeriodEnded)
            return new(false, "none", "free-period-ended", "Your free months have ended. Subscribe for £4.99 a month, or buy a one-off pass, to keep practicing.");

        if (f.TasterUsed)
            return new(false, "none", "taster-used", "You've had your free interview. Subscribe for £4.99 a month, or buy a one-off pass, to keep practicing.");

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
