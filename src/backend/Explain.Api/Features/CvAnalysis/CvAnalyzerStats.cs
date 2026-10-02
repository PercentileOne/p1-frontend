using System.Security.Cryptography;
using System.Text;

namespace Explain.Api.Features.CvAnalysis;

/// <summary>
/// One row per CV analysis that actually ran (Francis, 2026-10-02: "how many people have used the CV Analyzer, and where from?").
/// Deliberately holds NO personal content: no CV text, no name, no email, no IP address. The visitor is only a one-way hash (so
/// "distinct people" can be counted without knowing who they are) and the place is the same IP-based country/town guess the Activity Log shows.
/// Kept permanently (the Activity Log's own copy expires after 10 days), in the cvAnalyzerUses container, partitioned by month.
/// </summary>
public record CvUseDoc(
    string id,
    string month,          // "yyyy-MM" — the partition key
    string day,            // "yyyy-MM-dd" (UTC)
    string at,             // "o"-formatted UTC
    string visitor,        // one-way hash of the signed-in user id or the IP — never reversible
    bool signedIn,
    string source,         // marketing | candidate | recruiter | other
    string? country,
    string? city,
    string? region);

public record CvDayCount(string Day, int Analyses, int Visitors);
public record CvPlaceCount(string Country, string? City, string? Region, int Analyses, int Visitors);
public record CvSourceCount(string Source, int Analyses);
public record CvStatsSummary(
    int Days, int Analyses, int Visitors, int SignedInAnalyses, int AnonymousAnalyses,
    List<CvDayCount> ByDay, List<CvPlaceCount> ByCountry, List<CvPlaceCount> ByTown, List<CvSourceCount> BySource);

public static class CvAnalyzerStats
{
    /// <summary>One-way, salted hash so the same visitor can be counted once without storing who they are.</summary>
    public static string VisitorHash(string key, string salt)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{salt}|{key}"));
        return Convert.ToHexString(bytes)[..16].ToLowerInvariant();
    }

    /// <summary>Which page the analysis came from, judged from the browser's Origin/Referer host. Anything unrecognised is "other".</summary>
    public static string SourceFromOrigin(string? origin)
    {
        if (string.IsNullOrWhiteSpace(origin)) return "other";
        var o = origin.ToLowerInvariant();
        if (o.Contains("recruiter")) return "recruiter";
        if (o.Contains("candidate.")) return "candidate";
        if (o.Contains("www.theinterviewchair.com") || o.Contains("product.interviewme") || o.Contains("://theinterviewchair.com")) return "marketing";
        return "other";
    }

    /// <summary>Counts what happened over the last <paramref name="days"/> days (today included). Pure — easy to test.</summary>
    public static CvStatsSummary Summarise(IEnumerable<CvUseDoc> rows, int days, DateTime utcNow)
    {
        days = Math.Clamp(days, 1, 366);
        var first = DateOnly.FromDateTime(utcNow).AddDays(-(days - 1));
        var inWindow = rows.Where(r => DateOnly.TryParse(r.day, out var d) && d >= first).ToList();

        var byDay = Enumerable.Range(0, days)
            .Select(i => first.AddDays(i).ToString("yyyy-MM-dd"))
            .Select(day =>
            {
                var rs = inWindow.Where(r => r.day == day).ToList();
                return new CvDayCount(day, rs.Count, rs.Select(r => r.visitor).Distinct().Count());
            }).ToList();

        List<CvPlaceCount> Group(Func<CvUseDoc, (string Country, string? City, string? Region)> key) =>
            inWindow.GroupBy(key)
                .Select(g => new CvPlaceCount(g.Key.Country, g.Key.City, g.Key.Region, g.Count(), g.Select(r => r.visitor).Distinct().Count()))
                .OrderByDescending(p => p.Analyses).ThenBy(p => p.Country).ThenBy(p => p.City)
                .ToList();

        var byCountry = Group(r => (string.IsNullOrWhiteSpace(r.country) ? "Unknown" : r.country!, null, null));
        var byTown = Group(r => (string.IsNullOrWhiteSpace(r.country) ? "Unknown" : r.country!,
            string.IsNullOrWhiteSpace(r.city) ? null : r.city, string.IsNullOrWhiteSpace(r.region) ? null : r.region)).Take(50).ToList();
        var bySource = inWindow.GroupBy(r => r.source).Select(g => new CvSourceCount(g.Key, g.Count())).OrderByDescending(s => s.Analyses).ToList();

        return new CvStatsSummary(
            days, inWindow.Count, inWindow.Select(r => r.visitor).Distinct().Count(),
            inWindow.Count(r => r.signedIn), inWindow.Count(r => !r.signedIn),
            byDay, byCountry, byTown, bySource);
    }

    /// <summary>A sensible-looking email address, nothing more (we are not verifying it exists). Null when it isn't usable.</summary>
    public static string? CleanEmail(string? raw)
    {
        var e = raw?.Trim();
        if (string.IsNullOrEmpty(e) || e.Length > 254) return null;
        var at = e.IndexOf('@');
        if (at < 1 || at != e.LastIndexOf('@')) return null;
        var domain = e[(at + 1)..];
        if (domain.Length < 3 || !domain.Contains('.') || domain.StartsWith('.') || domain.EndsWith('.') || e.Any(char.IsWhiteSpace)) return null;
        return e.ToLowerInvariant();
    }

    /// <summary>A first name as the person typed it: trimmed, one line, no angle brackets, max 60 characters. Null when blank.</summary>
    public static string? CleanName(string? raw)
    {
        var n = raw?.Trim();
        if (string.IsNullOrEmpty(n)) return null;
        n = new string(n.Where(c => !char.IsControl(c) && c != '<' && c != '>').ToArray()).Trim();
        if (n.Length > 60) n = n[..60].Trim();
        return n.Length == 0 ? null : n;
    }

    /// <summary>Stable id for an opted-in address, so signing up twice just updates the same row.</summary>
    public static string OptInId(string cleanEmail) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(cleanEmail))).ToLowerInvariant();
}

/// <summary>An address someone TICKED A BOX to give us. Only ever written after an explicit yes, with the exact wording they agreed to.</summary>
public record MarketingOptInDoc(
    string id,
    string source,         // partition key — e.g. "cv-analyzer"
    string email,
    string? name,          // first name, exactly as the person confirmed or typed it in the same box (optional)
    string consentText,    // the exact tick-box wording shown at the time
    string consentedAt);   // "o"-formatted UTC
