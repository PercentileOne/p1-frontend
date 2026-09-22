using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json.Linq;
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
    bool TasterAvailable,
    int PrepSessionsLeft = 0);

public record StartResult(bool Allowed, bool Enforced, string Source, string Code, string Message, string? UsageId, string? Ticket = null);

/// <summary>
/// Gathers the facts about one person and applies EntitlementRules. "Enforced" false means the rules are still evaluated and every
/// start is still recorded, but nobody is ever turned away — so the whole system can be shipped, watched and tested before it
/// blocks a single real user (see the admin Access page: "would block" counts).
/// </summary>
public class EntitlementService(AppDbContext db, SessionPassService passes, IConfiguration config, ILogger<EntitlementService> logger, CosmosService? cosmos = null)
{
    // A recruiter pays 99p per interview-prep link (Francis, 2026-09-22 — was £1.99) and the candidate gets up to this many free practice sessions on it.
    public const int PrepSessionsPerLink = 3;
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

    // ── Settings (Azure SQL, table EntitlementSettings — one row, Id = 1) ───────────────────────
    private static (EntitlementSettings s, DateTime at)? _cache; // static: the service itself is per-request, the setting is not

    public async Task<EntitlementSettings> GetSettingsAsync()
    {
        if (_cache is { } c && DateTime.UtcNow - c.at < TimeSpan.FromSeconds(20)) return c.s;
        var row = await db.EntitlementSettings.AsNoTracking().FirstOrDefaultAsync(r => r.Id == 1);
        var result = row is null
            ? EntitlementSettings.Default
            : new EntitlementSettings(row.Enforce, Math.Clamp(row.DailyCap, 0, 100), Math.Clamp(row.MonthlyCap, 0, 1000), row.TasterEnabled);
        _cache = (result, DateTime.UtcNow);
        return result;
    }

    public async Task SaveSettingsAsync(EntitlementSettings s, string updatedBy)
    {
        var row = await db.EntitlementSettings.FirstOrDefaultAsync(r => r.Id == 1);
        if (row is null) { row = new Infrastructure.Sql.Models.EntitlementSettingsRow { Id = 1 }; db.EntitlementSettings.Add(row); }
        row.Enforce = s.Enforce; row.DailyCap = s.DailyCap; row.MonthlyCap = s.MonthlyCap; row.TasterEnabled = s.TasterEnabled;
        row.UpdatedAt = DateTime.UtcNow; row.UpdatedBy = updatedBy;
        await db.SaveChangesAsync();
        _cache = null;
    }

    // ── Facts ─────────────────────────────────────────────────────────────────────────────────
    // Newtonsoft turns ISO date strings into DateTime while reading a JObject, and JToken.Value<DateTimeOffset>() then throws
    // "Invalid cast from DateTime to DateTimeOffset" (found live 2026-09-21: every prep lookup failed and silently meant "no prep").
    // ToObject goes through the serializer, which handles both the string and the DateTime form.
    public static DateTimeOffset ToOffset(JToken? token)
    {
        if (token is null || token.Type == JTokenType.Null) return DateTimeOffset.MinValue;
        try { return token.ToObject<DateTimeOffset>(); } catch { return DateTimeOffset.MinValue; }
    }

    // Recruiter-sent interview preps (Cosmos, /recruiterId partition — so this is a cross-partition read by candidate email, the same one the
    // candidate's "Received preps" list does). Live from the day it was sent until 2 days after the interview it is preparing for.
    // Returns each usable prep with the sessions it has left, soonest interview first. Any Cosmos trouble means "no prep access" (logged),
    // never an exception — a failed lookup must not break every interview start.
    private async Task<List<(string PrepId, int Left)>> ActivePrepsAsync(string emailLower, string userId, DateTime now)
    {
        var result = new List<(string, int)>();
        if (cosmos is null) return result;
        try
        {
            var container = cosmos.GetContainer("interview-preps");
            var prepIds = new List<(string Id, DateTimeOffset Date)>();
            using var feed = container.GetItemQueryIterator<JObject>(
                new QueryDefinition("SELECT c.id, c.interviewDate, c.createdAt FROM c WHERE c.email = @e").WithParameter("@e", emailLower));
            while (feed.HasMoreResults)
                foreach (var d in await feed.ReadNextAsync())
                {
                    var date = ToOffset(d["interviewDate"]);
                    var created = ToOffset(d["createdAt"]);
                    if (date.UtcDateTime.AddDays(2) > now && created.UtcDateTime > now.AddDays(-120)) prepIds.Add((d["id"]!.Value<string>()!, date));
                }
            if (prepIds.Count == 0) return result;

            var ids = prepIds.Select(p => p.Id).ToList();
            var used = await db.InterviewUsages.AsNoTracking()
                .Where(u => u.Source == "prep" && u.VoidedAt == null && u.PassId != null && ids.Contains(u.PassId))
                .GroupBy(u => u.PassId!).Select(g => new { Id = g.Key, N = g.Count() }).ToListAsync();
            foreach (var (id, _) in prepIds.OrderBy(p => p.Date))
            {
                var left = PrepSessionsPerLink - (used.FirstOrDefault(x => x.Id == id)?.N ?? 0);
                if (left > 0) result.Add((id, left));
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not read interview preps for entitlement check; treating as none.");
        }
        return result;
    }

    private async Task<(EntitlementFacts facts, int passesLeft, string? prepIdToUse)> GatherAsync(string userId, string email, bool adminClaim)
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
        var preps = await ActivePrepsAsync(emailLower, userId, now);

        var facts = new EntitlementFacts(
            IsStaff: adminClaim || isAdminRole || grants.Contains("staff"),
            HasComplimentary: grants.Contains("complimentary") || grants.Contains("comp"),
            HasSubscription: hasSub,
            PassSessionsLeft: passLeft,
            DailyUsed: dailyUsed,
            MonthlyUsed: monthlyUsed,
            TasterUsed: tasterUsed,
            EmailVerified: user?.EmailVerified ?? false,
            DisposableEmail: EmailNormaliser.IsDisposable(email),
            PrepSessionsLeft: preps.Sum(p => p.Left));
        return (facts, passLeft, preps.Count > 0 ? preps[0].PrepId : null);
    }

    private static string PlanOf(EntitlementFacts f) =>
        f.IsStaff ? "staff" : f.HasSubscription ? "subscriber" : f.HasComplimentary ? "complimentary" : f.PassSessionsLeft > 0 ? "pass" : f.PrepSessionsLeft > 0 ? "prep" : !f.TasterUsed ? "taster" : "none";

    // Read-only — used by the UI to show "1 free interview available" / limits, and to decide whether to show the paywall early.
    public async Task<EntitlementStatus> GetStatusAsync(string userId, string email, bool adminClaim = false)
    {
        var settings = await GetSettingsAsync();
        var (facts, passLeft, _) = await GatherAsync(userId, email, adminClaim);
        var d = EntitlementRules.Decide(facts, settings);
        return new EntitlementStatus(
            Enforced: settings.Enforce, Plan: PlanOf(facts), CanStartInterview: d.Allowed || !settings.Enforce,
            Code: d.Code, Message: d.Message,
            DailyUsed: facts.DailyUsed, DailyCap: settings.DailyCap, MonthlyUsed: facts.MonthlyUsed, MonthlyCap: settings.MonthlyCap,
            PassSessionsLeft: passLeft, TasterAvailable: settings.TasterEnabled && !facts.TasterUsed && !facts.HasSubscription && !facts.HasComplimentary && !facts.IsStaff,
            PrepSessionsLeft: facts.PrepSessionsLeft);
    }

    // The moment an interview begins: decide, and record the start (consuming a pass session / the taster when that is the source).
    public async Task<StartResult> StartInterviewAsync(string userId, string email, bool adminClaim = false)
    {
        var settings = await GetSettingsAsync();
        var (facts, _, prepId) = await GatherAsync(userId, email, adminClaim);
        var d = EntitlementRules.Decide(facts, settings);
        var key = EmailNormaliser.Key(email);
        var (day, month) = UkDayAndMonth(DateTime.UtcNow);

        var wouldBlock = !d.Allowed;
        if (wouldBlock && settings.Enforce)
            return new StartResult(false, true, "none", d.Code, d.Message, null);

        // From here the person is being let in — either legitimately, or because enforcement is off.
        string? passId = null;   // for a prep this holds the prep's id, so its 3 sessions can be counted
        if (d.Source == "prep") passId = prepId;
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
