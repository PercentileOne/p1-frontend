using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Azure.Cosmos;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;
using Explain.Api.Features.ExamCatalog.Blueprint;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.ExamCatalog.Refresh;

/// <summary>
/// Weekly exam-catalog refresh (Francis, 2026-09-19 — milestone 3 of ~/.claude/plans/
/// any-exam-certifications-plan.md: "a job must run at least weekly to keep the data up to date").
///
/// The AI alone can't know what changed after its training cutoff, so this job reads REAL sources:
/// every catalog entry can carry a `sourceUrl` (the official study guide / course page). Each run:
///   1. fetches those pages (oldest-checked first, capped) and fingerprints their text;
///   2. when a page changed, has the AI re-extract the blueprint from THAT PAGE'S TEXT ONLY
///      (blueprintStatus "source-grounded") — an admin-"reviewed" blueprint is never overwritten,
///      it's reported as possibly stale instead;
///   3. reports pages that stopped loading or say the exam is retired — never auto-retires, since a
///      wrong retirement would silently hide a live exam;
///   4. drafts blueprints for a bounded number of source-less stubs (same AI draft as the on-demand
///      path), so the catalog fills in over the weeks;
///   5. stores a digest (counts + notes) in platformSettings for the admin.
///
/// In-process BackgroundService, same pattern as LearnAlertsSendService (no new Azure resource).
/// Schedule survives restarts because "last finished" lives in Cosmos: it ticks every 30 minutes and
/// runs once ≥7 days have passed, inside a quiet 01:00-05:59 UTC window. Every AI/network call is
/// budget-capped so a bad week can't run away with spend.
/// </summary>
public class ExamCatalogRefreshService(
    IHttpClientFactory factory, IConfiguration config, CosmosService cosmos, ILogger<ExamCatalogRefreshService> logger) : BackgroundService
{
    private static readonly TimeSpan TickInterval = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan RunEvery = TimeSpan.FromDays(7);
    private const int MaxSourceChecks = 120;
    private const int MaxGroundedExtractions = 40;
    private const int MaxStubDrafts = 20;
    private const int MaxNotes = 80;
    private const string StateId = "examCatalogRefresh";

    private readonly SemaphoreSlim _running = new(1, 1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken); // don't race container creation at boot
        using var timer = new PeriodicTimer(TickInterval);
        do
        {
            try
            {
                if (config["ExamCatalogRefresh:Enabled"] != "false" && await IsDueAsync())
                    await RunAsync("scheduled", null, stoppingToken);
            }
            catch (Exception ex) { logger.LogError(ex, "Exam catalog refresh tick failed"); }
        } while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task<bool> IsDueAsync()
    {
        var hour = DateTime.UtcNow.Hour;
        if (hour < 1 || hour > 5) return false; // quiet window only
        var last = await ReadStateAsync();
        if (last is null || last.finishedAt is null) return true;
        return DateTime.UtcNow - DateTime.Parse(last.finishedAt).ToUniversalTime() >= RunEvery;
    }

    public async Task<RefreshState?> ReadStateAsync()
    {
        try { return (await cosmos.GetContainer("platformSettings").ReadItemAsync<RefreshState>(StateId, new PartitionKey(StateId))).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return null; }
    }

    public bool IsRunning => _running.CurrentCount == 0;

    /// <summary>Runs one refresh. `maxChecks` lets a manual run be tiny (e.g. to test); null = the normal caps.</summary>
    public async Task<RefreshState?> RunAsync(string trigger, int? maxChecks, CancellationToken ct = default)
    {
        if (!await _running.WaitAsync(0, ct)) return null; // already running
        var container = cosmos.GetContainer("platformSettings");
        var notes = new List<string>();
        var c = new Counters();
        var started = DateTime.UtcNow.ToString("o");
        try
        {
            await SaveAsync(container, c, notes, trigger, started, null, "running");
            var baseUrl = config["ExamCatalogAgent:BaseUrl"]?.TrimEnd('/');
            var adminKey = config["ExamCatalogAgent:AdminKey"];
            if (string.IsNullOrEmpty(baseUrl) || string.IsNullOrEmpty(adminKey)) throw new InvalidOperationException("ExamCatalogAgent not configured");

            var entries = await LoadCatalogAsync(baseUrl, ct);
            logger.LogInformation("Exam catalog refresh ({Trigger}): {N} entries", trigger, entries.Count);

            // ── 0. Exams users added themselves ("search anything") since the last finished run ─
            var since = (await ReadStateAsync())?.finishedAt ?? DateTime.UtcNow.AddDays(-7).ToString("o");
            var userAdded = entries.Where(e => e.Source == "auto-add" && string.CompareOrdinal(e.CreatedAt, since) > 0).ToList();
            if (userAdded.Count > 0)
                AddNote(notes, $"Added by users since the last run ({userAdded.Count}): " + string.Join("; ", userAdded.Take(15).Select(e => $"{e.Name} [{e.Category}]")) + " — worth a look, and attaching an official source URL");

            // ── 1. Real-source checks ──────────────────────────────────────────────────────────
            var withSource = entries.Where(e => e.SourceUrl.Length > 0)
                .OrderBy(e => e.SourceCheckedAt, StringComparer.Ordinal).Take(maxChecks ?? MaxSourceChecks).ToList();
            var budget = new Budget { ExtractionsLeft = maxChecks.HasValue ? Math.Min(maxChecks.Value, MaxGroundedExtractions) : MaxGroundedExtractions };
            foreach (var e in withSource)
            {
                ct.ThrowIfCancellationRequested();
                try { await CheckSourceAsync(e, baseUrl, adminKey, c, notes, budget, ct); }
                catch (Exception ex) { c.failed++; AddNote(notes, $"{e.Name}: refresh failed ({ex.Message})"); logger.LogError(ex, "Exam refresh failed for {Name}", e.Name); }
                await Task.Delay(1500, ct); // be polite to the source sites
            }

            // ── 2. Draft blueprints for source-less stubs (bounded) ────────────────────────────
            if (!maxChecks.HasValue)
            {
                var stubs = entries.Where(e => e.Domains == 0 && e.SourceUrl.Length == 0)
                    .OrderBy(e => e.Category).ThenBy(e => e.Name).Take(MaxStubDrafts).ToList();
                foreach (var e in stubs)
                {
                    ct.ThrowIfCancellationRequested();
                    var updated = await Blueprint.Endpoint.GenerateAndPersistAsync(e.Id, e.Raw, baseUrl, adminKey, factory, config, logger);
                    if (updated is null) { c.failed++; AddNote(notes, $"{e.Name}: couldn't draft a blueprint"); }
                    else c.drafted++;
                }
            }

            c.entries = entries.Count;
            var done = await SaveAsync(container, c, notes, trigger, started, DateTime.UtcNow.ToString("o"), "ok");
            logger.LogInformation("Exam catalog refresh done: checked {Ch}, changed {Chg}, grounded {G}, drafted {D}, failed {F}", c.checkedSources, c.changed, c.grounded, c.drafted, c.failed);
            return done;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Exam catalog refresh failed");
            AddNote(notes, "Run failed: " + ex.Message);
            return await SaveAsync(container, c, notes, trigger, started, DateTime.UtcNow.ToString("o"), "failed");
        }
        finally { _running.Release(); }
    }

    // ── Source check ─────────────────────────────────────────────────────────────────────────────

    private async Task CheckSourceAsync(CatalogEntry e, string baseUrl, string adminKey, Counters c, List<string> notes, Budget budget, CancellationToken ct)
    {
        c.checkedSources++;
        var now = DateTime.UtcNow.ToString("o");
        var (status, text) = await FetchPageAsync(e.SourceUrl, ct);
        if (status == "throttled")
        {
            AddNote(notes, $"{e.Name}: site is rate-limiting us — will retry next run");
            return; // not stamped as checked, so it is picked up first next time
        }
        if (status != "ok" || text is null)
        {
            c.unreachable++;
            AddNote(notes, $"{e.Name}: source page unreachable ({e.SourceUrl})");
            await PatchAsync(e.Id, baseUrl, adminKey, new { sourceStatus = "unreachable", sourceCheckedAt = now });
            return;
        }

        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text)));
        if (hash == e.SourceHash)
        {
            c.unchanged++;
            await PatchAsync(e.Id, baseUrl, adminKey, new { sourceStatus = "ok", sourceCheckedAt = now, lastVerifiedAt = now });
            return;
        }

        // The page differs from last time (or this is its first check). A page can change for reasons that
        // don't touch the blueprint (dates, banners), so the AI extraction below is what decides whether
        // the blueprint actually changed — an identical extraction only updates the fingerprint.
        // A proper exam code (SAA-C03, AZ-104...) that the official page never mentions means the URL is
        // probably the wrong exam. Don't build a blueprint from it — flag it for the admin instead.
        if (Regex.IsMatch(e.ExamCode, @"^[A-Za-z]{2,4}-[A-Za-z]?\d{2,3}$") && !text.Contains(e.ExamCode, StringComparison.OrdinalIgnoreCase))
        {
            c.failed++;
            AddNote(notes, $"{e.Name}: the source page never mentions {e.ExamCode} — the source URL may be wrong ({e.SourceUrl})");
            await PatchAsync(e.Id, baseUrl, adminKey, new { sourceStatus = "suspect", sourceCheckedAt = now });
            return;
        }

        if (e.BlueprintStatus == "reviewed" && e.SourceHash.Length > 0)
        {
            c.reviewedStale++;
            AddNote(notes, $"{e.Name}: official page changed — its reviewed blueprint may be out of date");
            await PatchAsync(e.Id, baseUrl, adminKey, new { sourceHash = hash, sourceStatus = "ok", sourceCheckedAt = now });
            return;
        }
        if (budget.ExtractionsLeft <= 0)
        {
            AddNote(notes, $"{e.Name}: page changed but the weekly AI budget is spent — next run");
            return; // deliberately do NOT store the hash, so the next run picks it up
        }
        budget.ExtractionsLeft--;

        var ext = await ExtractFromPageAsync(e, text);
        if (ext is null || ext.Domains.Count < 3)
        {
            c.failed++;
            AddNote(notes, $"{e.Name}: couldn't extract content areas from the official page");
            await PatchAsync(e.Id, baseUrl, adminKey, new { sourceHash = hash, sourceStatus = "ok", sourceCheckedAt = now });
            return;
        }
        if (ext.Retired) AddNote(notes, $"{e.Name}: the official page says this exam is retired — please check and retire it if so");

        var sameAsBefore = e.DomainsSignature == Signature(ext.Domains);
        if (sameAsBefore && e.BlueprintStatus is "source-grounded" or "reviewed")
        {
            c.unchanged++;
            await PatchAsync(e.Id, baseUrl, adminKey, new { sourceHash = hash, sourceStatus = "ok", sourceCheckedAt = now, lastVerifiedAt = now });
            return;
        }

        var payload = new Dictionary<string, object?>
        {
            ["domains"] = ext.Domains.Select(d => new { name = d.Name, weightPct = d.WeightPct }).ToList(),
            ["blueprintStatus"] = "source-grounded",
            ["blueprintGeneratedAt"] = now, ["sourceHash"] = hash, ["sourceStatus"] = "ok", ["sourceCheckedAt"] = now, ["lastVerifiedAt"] = now,
        };
        if (e.MaxScore == 0 && ext.MaxScore > ext.MinScore)
        {
            payload["minScore"] = ext.MinScore; payload["maxScore"] = ext.MaxScore; payload["passScore"] = Math.Clamp(ext.PassScore, 0, ext.MaxScore);
        }
        await PatchAsync(e.Id, baseUrl, adminKey, payload);
        c.changed++; c.grounded++;
        AddNote(notes, e.Domains == 0
            ? $"{e.Name}: blueprint built from the official page ({ext.Domains.Count} content areas)"
            : $"{e.Name}: blueprint updated from the official page ({e.Domains} → {ext.Domains.Count} content areas)");
    }

    private async Task<(string status, string? text)> FetchPageAsync(string url, CancellationToken ct)
    {
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(25));
            var client = factory.CreateClient();
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.TryAddWithoutValidation("User-Agent", "P1ExamCatalogBot/1.0 (+https://www.theinterviewchair.com)");
            var res = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            // A throttling site (College Board answers 429 if hit quickly) is NOT a broken page: wait and
            // retry once, and if it's still throttling report it as such rather than "unreachable".
            if (res.StatusCode is HttpStatusCode.TooManyRequests or HttpStatusCode.ServiceUnavailable)
            {
                res.Dispose();
                await Task.Delay(TimeSpan.FromSeconds(8), cts.Token);
                using var retry = new HttpRequestMessage(HttpMethod.Get, url);
                retry.Headers.TryAddWithoutValidation("User-Agent", "P1ExamCatalogBot/1.0 (+https://www.theinterviewchair.com)");
                res = await client.SendAsync(retry, HttpCompletionOption.ResponseHeadersRead, cts.Token);
                if (res.StatusCode is HttpStatusCode.TooManyRequests or HttpStatusCode.ServiceUnavailable) { res.Dispose(); return ("throttled", null); }
            }
            using var _ = res;
            if (!res.IsSuccessStatusCode) return ("unreachable", null);

            // Many official exam guides (AWS, Google Cloud, DfE subject content) are PDFs.
            if (res.Content.Headers.ContentType?.MediaType == "application/pdf" || url.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                var bytes = await res.Content.ReadAsByteArrayAsync(cts.Token);
                if (bytes.Length > 12_000_000) return ("unreachable", null);
                return ("ok", PdfToText(bytes));
            }
            var html = await res.Content.ReadAsStringAsync(cts.Token);
            if (html.Length > 2_500_000) html = html[..2_500_000];
            return ("ok", HtmlToText(html));
        }
        catch { return ("unreachable", null); }
    }

    // First ~30 pages is plenty — exam guides put the content domains and weightings up front.
    private static string PdfToText(byte[] bytes)
    {
        using var pdf = PdfDocument.Open(bytes);
        var sb = new StringBuilder();
        foreach (var page in pdf.GetPages().Take(30))
        {
            sb.Append(ContentOrderTextExtractor.GetText(page)).Append(' ');
            if (sb.Length > 60_000) break;
        }
        return Regex.Replace(sb.ToString(), @"\s+", " ").Trim();
    }

    private static string HtmlToText(string html)
    {
        var t = Regex.Replace(html, @"<(script|style|noscript|svg|nav|footer|header)\b[\s\S]*?</\1>", " ", RegexOptions.IgnoreCase);
        t = Regex.Replace(t, @"<!--[\s\S]*?-->", " ");
        t = Regex.Replace(t, @"<[^>]+>", " ");
        t = WebUtility.HtmlDecode(t);
        return Regex.Replace(t, @"\s+", " ").Trim();
    }

    // ── AI: extract a blueprint from the page's OWN text ─────────────────────────────────────────

    private sealed record Extraction(List<Blueprint.Endpoint.Domain> Domains, int MinScore, int MaxScore, int PassScore, bool Retired);

    private async Task<Extraction?> ExtractFromPageAsync(CatalogEntry e, string pageText)
    {
        var apiKey = config["ModelRouter:ApiKey"] ?? throw new InvalidOperationException("ModelRouter:ApiKey not configured");
        var endpoint = config["ModelRouter:Endpoint"] ?? throw new InvalidOperationException("ModelRouter:Endpoint not configured");
        var text = pageText.Length > 14000 ? pageText[..14000] : pageText;

        var system = "You extract an exam blueprint from the text of an OFFICIAL exam page. Use ONLY the text provided — never your own knowledge of the exam. Return ONLY valid JSON.";
        var user = $@"Exam: {e.Name}{(e.Vendor.Length > 0 ? $" ({e.Vendor}{(e.ExamCode.Length > 0 ? " " + e.ExamCode : "")})" : "")}

OFFICIAL PAGE TEXT:
<<<
{text}
>>>

Extract the exam's content areas (""skills measured"", ""domains"", ""units"" — whatever this page calls them) with their published percentage weightings.
- Only what the page actually states. If a range such as 20-25% is given, use its midpoint.
- If content areas are listed but NO weightings are stated, split the weight evenly.
- Names short (2-8 words), as the page words them. 3 to 10 areas. If the page lists no content areas at all, return an empty ""domains"" array.
- ""minScore"", ""maxScore"", ""passScore"": ONLY if the page states the score scale / passing score (else 0).
- ""retired"": true ONLY if the page states THIS exam has been retired or withdrawn (not merely that other exams were).

Return JSON:
{{ ""domains"": [ {{ ""name"": ""..."", ""weightPct"": 25 }} ], ""minScore"": 0, ""maxScore"": 0, ""passScore"": 0, ""retired"": false }}";

        var body = JsonSerializer.Serialize(new
        {
            model = "model-router", temperature = 0.1,
            response_format = new { type = "json_object" },
            messages = new object[] { new { role = "system", content = system }, new { role = "user", content = user } },
        });
        using var msg = new HttpRequestMessage(HttpMethod.Post, $"{endpoint.TrimEnd('/')}/openai/v1/chat/completions");
        msg.Headers.Add("api-key", apiKey);
        msg.Content = new StringContent(body, Encoding.UTF8, "application/json");
        using var resp = await factory.CreateClient().SendAsync(msg);
        var respText = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode) throw new InvalidOperationException($"Model Router returned {resp.StatusCode}");

        using var outer = JsonDocument.Parse(respText);
        var content = outer.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
        if (string.IsNullOrEmpty(content)) return null;
        using var doc = JsonDocument.Parse(content);
        var root = doc.RootElement;
        if (!root.TryGetProperty("domains", out var arr) || arr.ValueKind != JsonValueKind.Array) return null;

        var raw = new List<Blueprint.Endpoint.Domain>();
        foreach (var d in arr.EnumerateArray())
        {
            var name = d.TryGetProperty("name", out var n) && n.ValueKind == JsonValueKind.String ? n.GetString()?.Trim() : null;
            var w = d.TryGetProperty("weightPct", out var wv) && wv.ValueKind == JsonValueKind.Number ? (int)Math.Round(wv.GetDouble()) : 0;
            if (string.IsNullOrWhiteSpace(name) || w <= 0) continue;
            raw.Add(new Blueprint.Endpoint.Domain(name.Length > 100 ? name[..100] : name, w));
        }
        if (raw.Count < 3) return new Extraction(new List<Blueprint.Endpoint.Domain>(), 0, 0, 0, false);
        raw = raw.Take(10).ToList();

        int I(string p) => root.TryGetProperty(p, out var v) && v.ValueKind == JsonValueKind.Number ? (int)Math.Round(v.GetDouble()) : 0;
        var retired = root.TryGetProperty("retired", out var r) && r.ValueKind == JsonValueKind.True;
        return new Extraction(Blueprint.Endpoint.NormaliseTo100(raw), I("minScore"), I("maxScore"), I("passScore"), retired);
    }

    // ── Catalog access (through the agent's public endpoints) ────────────────────────────────────

    private sealed class CatalogEntry
    {
        public string Id = "", Name = "", Category = "", Vendor = "", ExamCode = "", BlueprintStatus = "", SourceUrl = "", SourceHash = "", SourceCheckedAt = "", Raw = "", Source = "", CreatedAt = "";
        public int Domains, MaxScore;
        public string DomainsSignature = "";
    }

    private static string Signature(IEnumerable<Blueprint.Endpoint.Domain> d) =>
        string.Join("|", d.Select(x => $"{x.Name.Trim().ToLowerInvariant()}:{x.WeightPct}"));

    private async Task<List<CatalogEntry>> LoadCatalogAsync(string baseUrl, CancellationToken ct)
    {
        var http = factory.CreateClient();
        var cats = JsonDocument.Parse(await http.GetStringAsync($"{baseUrl}/examcatalog/categories", ct)).RootElement;
        var all = new List<CatalogEntry>();
        foreach (var cat in cats.EnumerateArray())
        {
            var name = cat.GetProperty("category").GetString()!;
            var json = await http.GetStringAsync($"{baseUrl}/examcatalog/browse?category={Uri.EscapeDataString(name)}&top=500", ct);
            using var doc = JsonDocument.Parse(json);
            foreach (var e in doc.RootElement.EnumerateArray())
            {
                string S(string p) => e.TryGetProperty(p, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";
                var domains = new List<Blueprint.Endpoint.Domain>();
                if (e.TryGetProperty("domains", out var d) && d.ValueKind == JsonValueKind.Array)
                    foreach (var x in d.EnumerateArray())
                        domains.Add(new Blueprint.Endpoint.Domain(x.GetProperty("name").GetString() ?? "", x.TryGetProperty("weightPct", out var w) ? w.GetInt32() : 0));
                all.Add(new CatalogEntry
                {
                    Id = S("id"), Name = S("name"), Category = S("category"), Vendor = S("vendor"), ExamCode = S("examCode"),
                    BlueprintStatus = S("blueprintStatus"), Source = S("source"), CreatedAt = S("createdAt"), SourceUrl = S("sourceUrl"), SourceHash = S("sourceHash"), SourceCheckedAt = S("sourceCheckedAt"),
                    Domains = domains.Count, DomainsSignature = Signature(domains),
                    MaxScore = e.TryGetProperty("maxScore", out var ms) && ms.ValueKind == JsonValueKind.Number ? ms.GetInt32() : 0,
                    Raw = e.GetRawText(),
                });
            }
        }
        return all;
    }

    private async Task PatchAsync(string id, string baseUrl, string adminKey, object payload)
    {
        var http = factory.CreateClient();
        http.DefaultRequestHeaders.Add("x-functions-key", adminKey);
        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var res = await http.PostAsync($"{baseUrl}/examcatalog/{Uri.EscapeDataString(id)}/edit", content);
        if (!res.IsSuccessStatusCode) throw new InvalidOperationException($"catalog edit failed: {(int)res.StatusCode}");
    }

    // ── Digest ───────────────────────────────────────────────────────────────────────────────────

    private sealed class Budget { public int ExtractionsLeft; }
    private sealed class Counters { public int entries, checkedSources, unchanged, changed, grounded, reviewedStale, unreachable, drafted, failed; }

    private static void AddNote(List<string> notes, string note) { if (notes.Count < MaxNotes) notes.Add(note); }

    private async Task<RefreshState> SaveAsync(Container container, Counters c, List<string> notes, string trigger, string startedAt, string? finishedAt, string status)
    {
        var state = new RefreshState(StateId, StateId, status, trigger, startedAt, finishedAt, c.entries, c.checkedSources, c.unchanged, c.changed,
            c.grounded, c.reviewedStale, c.unreachable, c.drafted, c.failed, notes.ToList());
        await container.UpsertItemAsync(state, new PartitionKey(StateId));
        return state;
    }
}

public record RefreshState(
    string id,
    string pk,
    string status,
    string trigger,
    string startedAt,
    string? finishedAt,
    int entries,
    int checkedSources,
    int unchanged,
    int changed,
    int grounded,
    int reviewedStale,
    int unreachable,
    int drafted,
    int failed,
    List<string> notes);
