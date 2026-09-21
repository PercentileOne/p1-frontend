using System.Net;
using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Features.SessionPasses;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Entitlements;

/// <summary>What the UI is told about a person's access — never contains anything they shouldn't see.</summary>
public record EntitlementStatus(
    bool Enforced,
    string Plan,                 // staff | complimentary | subscriber | pass | taster | none
    bool CanStartInterview,
    string Code,
    string Message,
    int DailyUsed, int DailyCap, int MonthlyUsed, int MonthlyCap,
    int PassSessionsLeft,
    bool TasterAvailable);

public record StartResult(bool Allowed, bool Enforced, string Source, string Code, string Message, string? UsageId, string? Ticket = null);

/// <summary>
/// Gathers the facts about one person and applies EntitlementRules. "Enforced" false means the rules are still evaluated and every
/// start is still recorded, but nobody is ever turned away — so the whole system can be shipped, watched and tested before it
/// blocks a single real user (see the admin Access page: "would block" counts).
/// </summary>
public class EntitlementService(AppDbContext db, CosmosService cosmos, SessionPassService passes, IConfiguration config, ILogger<EntitlementService> logger)
{
    private static readonly TimeZoneInfo Uk = FindUk();
    private static TimeZoneInfo FindUk()
    {
        foreach (var id in new[] { "Europe/London", "GMT Standard Time" })
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch { /* try the next id */ }
        return TimeZoneInfo.Utc;
    }

    public static (string Day, string Month) UkDayAndMonth(DateTime utcNow)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc), Uk);
        return (local.ToString("yyyy-MM-dd"), local.ToString("yyyy-MM"));
    }

    // ── Settings (Cosmos platformSettings, same pattern as NameBank/LiveAvatar) ────────────────
    internal sealed record SettingsDoc(string id, string pk, bool enforce, int dailyCap, int monthlyCap, bool tasterEnabled, DateTimeOffset updatedAt, string updatedBy);
    private static (EntitlementSettings s, DateTime at)? _cache; // static: the service itself is per-request, the setting is not

    public async Task<EntitlementSettings> GetSettingsAsync()
    {
        if (_cache is { } c && DateTime.UtcNow - c.at < TimeSpan.FromSeconds(20)) return c.s;
        var container = cosmos.GetContainer("platformSettings");
        EntitlementSettings result;
        try
        {
            var doc = (await container.ReadItemAsync<SettingsDoc>("entitlements", new PartitionKey("entitlements"))).Resource;
            result = new EntitlementSettings(doc.enforce, Math.Clamp(doc.dailyCap, 0, 100), Math.Clamp(doc.monthlyCap, 0, 1000), doc.tasterEnabled);
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { result = EntitlementSettings.Default; }
        _cache = (result, DateTime.UtcNow);
        return result;
    }

    public async Task SaveSettingsAsync(EntitlementSettings s, string updatedBy)
    {
        var doc = new SettingsDoc("entitlements", "entitlements", s.Enforce, s.DailyCap, s.MonthlyCap, s.TasterEnabled, DateTimeOffset.UtcNow, updatedBy);
        await cosmos.GetContainer("platformSettings").UpsertItemAsync(doc, new PartitionKey("entitlements"));
        _cache = null;
    }

    // ── Facts ─────────────────────────────────────────────────────────────────────────────────
    private async Task<(EntitlementFacts facts, int passesLeft)> GatherAsync(string userId, string email, bool adminClaim)
    {
        var now = DateTime.UtcNow;
        var emailLower = email.Trim().ToLowerInvariant();
        var key = EmailNormaliser.Key(email);
        var (day, month) = UkDayAndMonth(now);

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        var isAdminRole = user is not null && string.Equals(user.Role, "admin", StringComparison.OrdinalIgnoreCase);

        var grants = await db.AccessGrants.AsNoTracking()
            .Where(g => g.RevokedAt == null && (g.ExpiresAt == null || g.ExpiresAt > now) && (g.Email == emailLower || g.Email == key || g.UserId == userId))
            .Select(g => g.Kind).ToListAsync();

        var hasSub = await db.Subscriptions.AsNoTracking().AnyAsync(s => s.UserId == userId &&
            (s.Status == "active" || s.Status == "past_due" || (s.Status == "cancelled" && s.RenewsAt != null && s.RenewsAt > now)));

        var activePasses = await passes.GetActiveForEmailAsync(emailLower);
        var passLeft = activePasses.Sum(p => Math.Max(0, p.sessionsTotal - p.sessionsUsed));

        string[] counted = ["subscription", "complimentary"];
        var dailyUsed = await db.InterviewUsages.AsNoTracking().CountAsync(u => u.UserId == userId && u.UkDay == day && u.VoidedAt == null && counted.Contains(u.Source));
        var monthlyUsed = await db.InterviewUsages.AsNoTracking().CountAsync(u => u.UserId == userId && u.UkMonth == month && u.VoidedAt == null && counted.Contains(u.Source));
        var tasterUsed = await db.InterviewUsages.AsNoTracking().AnyAsync(u => u.EmailKey == key && u.Source == "taster" && u.VoidedAt == null);

        var facts = new EntitlementFacts(
            IsStaff: adminClaim || isAdminRole || grants.Contains("staff"),
            HasComplimentary: grants.Contains("complimentary") || grants.Contains("comp"),
            HasSubscription: hasSub,
            PassSessionsLeft: passLeft,
            DailyUsed: dailyUsed,
            MonthlyUsed: monthlyUsed,
            TasterUsed: tasterUsed,
            EmailVerified: user?.EmailVerified ?? false,
            DisposableEmail: EmailNormaliser.IsDisposable(email));
        return (facts, passLeft);
    }

    private static string PlanOf(EntitlementFacts f) =>
        f.IsStaff ? "staff" : f.HasSubscription ? "subscriber" : f.HasComplimentary ? "complimentary" : f.PassSessionsLeft > 0 ? "pass" : !f.TasterUsed ? "taster" : "none";

    // Read-only — used by the UI to show "1 free interview available" / limits, and to decide whether to show the paywall early.
    public async Task<EntitlementStatus> GetStatusAsync(string userId, string email, bool adminClaim = false)
    {
        var settings = await GetSettingsAsync();
        var (facts, passLeft) = await GatherAsync(userId, email, adminClaim);
        var d = EntitlementRules.Decide(facts, settings);
        return new EntitlementStatus(
            Enforced: settings.Enforce, Plan: PlanOf(facts), CanStartInterview: d.Allowed || !settings.Enforce,
            Code: d.Code, Message: d.Message,
            DailyUsed: facts.DailyUsed, DailyCap: settings.DailyCap, MonthlyUsed: facts.MonthlyUsed, MonthlyCap: settings.MonthlyCap,
            PassSessionsLeft: passLeft, TasterAvailable: settings.TasterEnabled && !facts.TasterUsed && !facts.HasSubscription && !facts.HasComplimentary && !facts.IsStaff);
    }

    // The moment an interview begins: decide, and record the start (consuming a pass session / the taster when that is the source).
    public async Task<StartResult> StartInterviewAsync(string userId, string email, bool adminClaim = false)
    {
        var settings = await GetSettingsAsync();
        var (facts, _) = await GatherAsync(userId, email, adminClaim);
        var d = EntitlementRules.Decide(facts, settings);
        var key = EmailNormaliser.Key(email);
        var (day, month) = UkDayAndMonth(DateTime.UtcNow);

        var wouldBlock = !d.Allowed;
        if (wouldBlock && settings.Enforce)
            return new StartResult(false, true, "none", d.Code, d.Message, null);

        // From here the person is being let in — either legitimately, or because enforcement is off.
        string? passId = null;
        if (d.Source == "pass")
        {
            var consumed = await passes.CheckAndConsumeAsync(email.Trim().ToLowerInvariant());
            if (!consumed && settings.Enforce) return new StartResult(false, true, "none", "no-access", "Your pass has no sessions left.", null);
        }

        var usage = new InterviewUsage
        {
            UserId = userId, EmailKey = key, Source = d.Allowed ? d.Source : "none", PassId = passId,
            StartedAt = DateTime.UtcNow, UkDay = day, UkMonth = month, Enforced = settings.Enforce, WouldBlock = wouldBlock,
        };
        db.InterviewUsages.Add(usage);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (d.Source == "taster")
        {
            // Two simultaneous starts both saw the taster as unused; the database's unique index let exactly one through.
            logger.LogInformation(ex, "Taster already claimed for {Key} by a concurrent request", key);
            if (settings.Enforce) return new StartResult(false, true, "none", "taster-used", "You've had your free interview. Subscribe for £4.99 a month, or buy a one-off pass, to keep practising.", null);
        }

        var ticket = InterviewTicket.Create(config["Jwt:Secret"] ?? string.Empty, userId, DateTimeOffset.UtcNow);
        return new StartResult(true, settings.Enforce, d.Allowed ? d.Source : "enforcement-off", d.Code, d.Message, usage.Id, ticket);
    }

    // Gives a start back (the interview never actually began). Frees the taster / a daily slot; does not refund a pass session.
    public async Task VoidAsync(string userId, string usageId)
    {
        var row = await db.InterviewUsages.FirstOrDefaultAsync(u => u.Id == usageId && u.UserId == userId && u.VoidedAt == null);
        if (row is null) return;
        row.VoidedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }
}
