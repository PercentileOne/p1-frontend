using System.Text.RegularExpressions;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.SubjectsAdmin;

/// <summary>
/// Admin: "which subjects and roles do people interview for?" (Francis, 2026-10-12). Two sources, kept apart in the answer:
///  - free demos that were finished and scored (Cosmos tryoutSessions: subject, score, date; kept without an end date), filterable by how many days back;
///  - full interviews, which are counted per job title as they start (Cosmos roleActivity; a running total with a last-seen date, so it has no date filter).
/// Each subject also gets a rough category (IT, Sales &amp; Marketing, Management...) from its words, so the page can answer "is it mostly IT and management?". The category is a
/// guide from keywords, not a fact about the person, and "Other" is expected.
/// Demos that were started but not finished are not here (they only exist in the 10-day event log), and the owner's own test runs are counted like anyone's.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/admin/subjects", async (CosmosService cosmos, CancellationToken ct, int days = 0) =>
        {
            var from = days > 0 ? DateTimeOffset.UtcNow.AddDays(-Math.Clamp(days, 1, 3650)).ToString("O") : null;
            var demos = new List<DemoRow>();
            try
            {
                var sql = from is null
                    ? "SELECT c.subject, c.overallScore, c.createdAt FROM c"
                    : "SELECT c.subject, c.overallScore, c.createdAt FROM c WHERE c.createdAt >= @from";
                var q = new QueryDefinition(sql);
                if (from is not null) q = q.WithParameter("@from", from);
                using var feed = cosmos.GetContainer("tryoutSessions").GetItemQueryIterator<DemoRow>(q, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey("tryout") });
                while (feed.HasMoreResults) demos.AddRange(await feed.ReadNextAsync(ct));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { /* nothing recorded yet */ }

            var full = new List<FullRow>();
            try
            {
                using var feed = cosmos.GetContainer("roleActivity").GetItemQueryIterator<FullRow>(
                    new QueryDefinition("SELECT c.jobTitle, c.count, c.lastUpdated FROM c"), requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey("role") });
                while (feed.HasMoreResults) full.AddRange(await feed.ReadNextAsync(ct));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { /* nothing recorded yet */ }

            return Results.Ok(Build(demos, full, days));
        }).RequireAuthorization(Explain.Api.Common.Permissions.ViewAdminPortal).WithName("AdminSubjects").WithTags("Admin");
    }

    public record DemoRow(string? subject, int overallScore, string? createdAt);
    public record FullRow(string? jobTitle, int count, DateTimeOffset? lastUpdated);

    public record SubjectLine(string subject, string category, int demos, double? avgDemoScore, string? lastDemoAt, int fullInterviews, string? lastFullAt, int total);
    public record CategoryLine(string category, int demos, int fullInterviews, int total, int subjects);
    public record Totals(int demosCompleted, int fullInterviews, int distinctSubjects);
    public record Reply(int days, Totals totals, List<CategoryLine> categories, List<SubjectLine> subjects);

    /// <summary>Same subject typed differently ("Marketing manager", " marketing  manager. ") is one subject.</summary>
    public static string Normalise(string? raw)
    {
        var s = Regex.Replace((raw ?? "").Trim().ToLowerInvariant(), @"\s+", " ");
        return s.Trim(' ', '.', ',', ';', ':', '!', '?', '-');
    }

    // Order matters: the first group whose words appear wins, so "Marketing Manager" is Sales & Marketing, not Management, and "Software Engineer" is IT, not Engineering.
    private static readonly (string Category, string[] Words)[] Groups =
    [
        ("IT & Software", ["software", "developer", "programmer", "devops", "c#", ".net", "java", "python", "full stack", "full-stack", "backend", "back end", "frontend", "front end", "web ", "data scientist", "data engineer", "data analyst", "machine learning", "cyber", "cloud", "technology", "technical", "it support", "it manager", "sysadmin", "network", "database", "qa ", "tester", "architect", "ai ", "digital"]),
        ("Sales & Marketing", ["sales", "marketing", "account executive", "account manager", "business development", "bdm", "customer success", "brand", "seo", "advertis", "retail", "estate agent"]),
        ("Finance", ["finance", "financial", "account", "audit", "bank", "equities", "trader", "trading", "broker", "investment", "analyst", "actuar", "tax", "payroll", "insurance", "treasury"]),
        ("Healthcare", ["nurse", "nursing", "doctor", "health", "clinical", "care ", "carer", "pharmac", "dental", "medical", "therapist", "physio", "midwife", "surgeon", "paramedic"]),
        ("Education", ["teacher", "teaching", "lecturer", "tutor", "school", "professor", "education", "gcse", "a-level", "a level", "headteacher", "teaching assistant"]),
        ("Engineering & Trades", ["engineer", "electrician", "plumber", "mechanic", "technician", "construction", "builder", "welder", "carpenter", "surveyor", "site ", "maintenance", "driver", "logistics", "warehouse"]),
        ("Management", ["manager", "director", "head of", "chief", "vice president", "vp ", "lead", "executive", "supervisor", "ceo", "cto", "cfo", "coo", "president", "owner", "founder", "operations", "project", "programme", "hr ", "human resources", "recruit"]),
    ];

    public static string Categorise(string normalisedSubject)
    {
        var padded = " " + normalisedSubject + " ";
        foreach (var (category, words) in Groups)
            if (words.Any(w => padded.Contains(w, StringComparison.Ordinal))) return category;
        return "Other";
    }

    public static Reply Build(IEnumerable<DemoRow> demos, IEnumerable<FullRow> full, int days)
    {
        var map = new Dictionary<string, (Dictionary<string, int> Names, int Demos, double ScoreSum, string? LastDemo, int Full, DateTimeOffset? LastFull)>();
        (Dictionary<string, int>, int, double, string?, int, DateTimeOffset?) Get(string key) =>
            map.TryGetValue(key, out var v) ? v : (new Dictionary<string, int>(), 0, 0, null, 0, null);

        foreach (var d in demos)
        {
            var key = Normalise(d.subject);
            if (key.Length == 0) continue;
            var cur = Get(key);
            cur.Item1[(d.subject ?? key).Trim()] = cur.Item1.GetValueOrDefault((d.subject ?? key).Trim()) + 1;
            var last = cur.Item4 is null || string.CompareOrdinal(d.createdAt ?? "", cur.Item4) > 0 ? d.createdAt : cur.Item4;
            map[key] = (cur.Item1, cur.Item2 + 1, cur.Item3 + d.overallScore, last, cur.Item5, cur.Item6);
        }
        foreach (var f in full)
        {
            var key = Normalise(f.jobTitle);
            if (key.Length == 0 || f.count <= 0) continue;
            var cur = Get(key);
            cur.Item1[(f.jobTitle ?? key).Trim()] = cur.Item1.GetValueOrDefault((f.jobTitle ?? key).Trim()) + f.count;
            var lf = cur.Item6 is null || (f.lastUpdated is { } t && t > cur.Item6) ? f.lastUpdated : cur.Item6;
            map[key] = (cur.Item1, cur.Item2, cur.Item3, cur.Item4, cur.Item5 + f.count, lf);
        }

        var lines = map.Select(kv =>
        {
            var v = kv.Value;
            var shown = v.Names.OrderByDescending(n => n.Value).ThenBy(n => n.Key, StringComparer.OrdinalIgnoreCase).First().Key;
            return new SubjectLine(shown, Categorise(kv.Key), v.Demos, v.Demos > 0 ? Math.Round(v.ScoreSum / v.Demos, 0) : null, v.LastDemo, v.Full, v.LastFull?.ToString("O"), v.Demos + v.Full);
        })
        .OrderByDescending(l => l.total).ThenBy(l => l.subject, StringComparer.OrdinalIgnoreCase)
        .ToList();

        var categories = lines.GroupBy(l => l.category)
            .Select(g => new CategoryLine(g.Key, g.Sum(x => x.demos), g.Sum(x => x.fullInterviews), g.Sum(x => x.total), g.Count()))
            .OrderByDescending(c => c.total).ToList();

        return new Reply(days, new Totals(lines.Sum(l => l.demos), lines.Sum(l => l.fullInterviews), lines.Count), categories, lines.Take(1000).ToList());
    }
}
