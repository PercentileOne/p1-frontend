using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Companies;

/// <summary>
/// Company catalog for "Company Specific" mock interviews (Francis, 2026-09-19): a candidate can pick a
/// well-known employer (Google, Microsoft, M&amp;S, Goldman Sachs…) and the interview is shaped like that
/// company's publicly described process — its values, style, typical stages and bar — instead of a
/// generic one. Same architecture as the exam catalog: a curated seed list, AI-drafted "interview DNA"
/// profiles that are generated ONCE and cached, and honest status labelling (ai-draft → reviewed).
///
/// Profiles are deliberately about PROCESS AND STYLE, never real/leaked questions (many are under NDA):
/// the questions themselves are always freshly written per session by the interview generator, which
/// receives a digest of the profile. Nothing here claims affiliation with any company.
///
/// Anonymous reads (the candidate portal's demo login can't authenticate). The only anonymous AI cost is
/// the just-in-time profile draft, and it can only ever run for a curated stub — a fixed list — so spend
/// is bounded structurally. Seeding and bulk generation are x-admin-key gated.
/// </summary>
public static class Endpoint
{
    private static readonly ConcurrentDictionary<string, Task<CompanyProfile?>> InFlight = new();
    private static readonly SemaphoreSlim ListLock = new(1, 1);
    private static (DateTime at, List<CompanySummary> rows)? _listCache;

    public static void Map(WebApplication app)
    {
        // GET /api/companies — light list for the picker (no profile bodies).
        app.MapGet("/api/companies", async (CosmosService cosmos) =>
        {
            if (_listCache is { } c && DateTime.UtcNow - c.at < TimeSpan.FromMinutes(5)) return Results.Ok(c.rows);
            await ListLock.WaitAsync();
            try
            {
                var rows = new List<CompanySummary>();
                using var feed = cosmos.GetContainer("companyProfiles").GetItemQueryIterator<CompanyProfile>(
                    new QueryDefinition("SELECT * FROM c WHERE c.status != 'retired'"));
                while (feed.HasMoreResults)
                    foreach (var p in await feed.ReadNextAsync())
                        rows.Add(new CompanySummary(p.id, p.name, p.aliases ?? new(), p.sector, p.region, p.rank, p.status));
                rows = rows.OrderBy(r => r.rank).ThenBy(r => r.name).ToList();
                _listCache = (DateTime.UtcNow, rows);
                return Results.Ok(rows);
            }
            finally { ListLock.Release(); }
        }).AllowAnonymous();

        // GET /api/companies/{id} — the full profile. A curated stub is drafted on first use (single-flight).
        app.MapGet("/api/companies/{id}", async (string id, CosmosService cosmos, IHttpClientFactory factory, IConfiguration config, ILogger<Program> logger) =>
        {
            var profile = await ReadAsync(cosmos, id);
            if (profile is null) return Results.NotFound();
            if (profile.status == "stub")
            {
                var drafted = await InFlight.GetOrAdd(id, _ => DraftAsync(cosmos, factory, config, logger, id));
                InFlight.TryRemove(id, out _);
                if (drafted is null) return Results.Json(new { error = "Still preparing this company's profile — please try again in a moment." }, statusCode: 503);
                profile = drafted;
            }
            return Results.Ok(profile);
        }).AllowAnonymous();

        // POST /api/admin/companies/seed — upsert the curated list as stubs (never overwrites a drafted profile).
        app.MapPost("/api/admin/companies/seed", async (HttpContext ctx, IConfiguration config, CosmosService cosmos) =>
        {
            if (!IsAdmin(ctx, config)) return Results.Unauthorized();
            var container = cosmos.GetContainer("companyProfiles");
            var added = 0; var kept = 0;
            for (var i = 0; i < CompanySeed.All.Count; i++)
            {
                var s = CompanySeed.All[i];
                var id = Slug(s.Name);
                var existing = await ReadAsync(cosmos, id);
                if (existing is not null)
                {
                    // Refresh curated metadata only (rank/sector/aliases/sources) — never the drafted body.
                    await container.UpsertItemAsync(existing with { rank = i + 1, sector = s.Sector, region = s.Region, aliases = s.Aliases.ToList(), sourceUrls = s.Sources.ToList() }, new PartitionKey(id));
                    kept++;
                    continue;
                }
                await container.UpsertItemAsync(new CompanyProfile(id, s.Name, s.Aliases.ToList(), s.Sector, s.Region, i + 1, "stub",
                    null, null, null, null, null, null, s.Sources.ToList(), null, null, null), new PartitionKey(id));
                added++;
            }
            _listCache = null;
            return Results.Ok(new { added, kept, total = CompanySeed.All.Count });
        }).AllowAnonymous();

        // POST /api/admin/companies/generate?limit=10[&force=true][&id=x] — draft profiles for stubs (or one id).
        // Runs the drafts in the background (a full profile takes ~20-40s each) and returns at once; poll GET /api/admin/companies/status.
        app.MapPost("/api/admin/companies/generate", async (HttpContext ctx, IConfiguration config, CosmosService cosmos, IHttpClientFactory factory, ILogger<Program> logger, int? limit, bool? force, string? id) =>
        {
            if (!IsAdmin(ctx, config)) return Results.Unauthorized();
            var ids = new List<string>();
            if (!string.IsNullOrWhiteSpace(id)) ids.Add(id);
            else
            {
                using var feed = cosmos.GetContainer("companyProfiles").GetItemQueryIterator<CompanyProfile>(new QueryDefinition("SELECT * FROM c"));
                var all = new List<CompanyProfile>();
                while (feed.HasMoreResults) all.AddRange(await feed.ReadNextAsync());
                ids = all.Where(p => force == true ? p.status != "reviewed" : p.status == "stub").OrderBy(p => p.rank).Take(Math.Clamp(limit ?? 10, 1, 100)).Select(p => p.id).ToList();
            }
            _ = Task.Run(async () =>
            {
                foreach (var cid in ids)
                {
                    try { await DraftAsync(cosmos, factory, config, logger, cid, force == true); }
                    catch (Exception ex) { logger.LogError(ex, "Company profile draft failed for {Id}", cid); }
                }
                _listCache = null;
            });
            return Results.Accepted(value: new { started = ids.Count, ids });
        }).AllowAnonymous();

        app.MapGet("/api/admin/companies/status", async (HttpContext ctx, IConfiguration config, CosmosService cosmos) =>
        {
            if (!IsAdmin(ctx, config)) return Results.Unauthorized();
            using var feed = cosmos.GetContainer("companyProfiles").GetItemQueryIterator<CompanyProfile>(new QueryDefinition("SELECT * FROM c"));
            var all = new List<CompanyProfile>();
            while (feed.HasMoreResults) all.AddRange(await feed.ReadNextAsync());
            return Results.Ok(new
            {
                total = all.Count,
                byStatus = all.GroupBy(p => p.status).ToDictionary(g => g.Key, g => g.Count()),
                stubs = all.Where(p => p.status == "stub").Select(p => p.name).ToList(),
            });
        }).AllowAnonymous();
    }

    private static bool IsAdmin(HttpContext ctx, IConfiguration config)
    {
        var key = config["ExamCatalogAgent:AdminKey"];
        return !string.IsNullOrEmpty(key) && ctx.Request.Headers["x-admin-key"] == key;
    }

    internal static string Slug(string name) =>
        Regex.Replace(name.ToLowerInvariant().Replace("&", " and "), "[^a-z0-9]+", "-").Trim('-');

    private static async Task<CompanyProfile?> ReadAsync(CosmosService cosmos, string id)
    {
        try { return (await cosmos.GetContainer("companyProfiles").ReadItemAsync<CompanyProfile>(id, new PartitionKey(id))).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return null; }
    }

    // ── Drafting ─────────────────────────────────────────────────────────────────────────────────

    private static async Task<CompanyProfile?> DraftAsync(CosmosService cosmos, IHttpClientFactory factory, IConfiguration config, ILogger logger, string id, bool force = false)
    {
        var current = await ReadAsync(cosmos, id);
        if (current is null) return null;
        if (current.status != "stub" && !force) return current;

        // Best-effort grounding: official "how we hire"/values pages, when the curated list has any and they load.
        var sourceText = new StringBuilder();
        var usedSources = new List<string>();
        foreach (var url in (current.sourceUrls ?? new()).Take(3))
        {
            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Get, url);
                req.Headers.UserAgent.ParseAdd("Mozilla/5.0 (compatible; TheInterviewChairBot/1.0)");
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(12));
                using var res = await factory.CreateClient().SendAsync(req, cts.Token);
                if (!res.IsSuccessStatusCode) continue;
                var html = await res.Content.ReadAsStringAsync(cts.Token);
                var text = Regex.Replace(Regex.Replace(html, @"<(script|style)[\s\S]*?</\1>", " ", RegexOptions.IgnoreCase), "<[^>]+>", " ");
                text = Regex.Replace(System.Net.WebUtility.HtmlDecode(text), @"\s+", " ").Trim();
                if (text.Length < 400) continue;
                sourceText.AppendLine($"--- SOURCE {url} ---").AppendLine(text.Length > 6000 ? text[..6000] : text);
                usedSources.Add(url);
            }
            catch { /* a source that doesn't load is simply skipped */ }
        }

        var system = @"You are a careful researcher who documents how well-known employers publicly describe and run their hiring, for a mock-interview platform.
You describe PROCESS, STYLE, VALUES and BAR — never real or leaked interview questions (many are covered by NDAs). Only state what is publicly known or a fair, widely-reported characterisation; where you are unsure, say less rather than invent. Never claim affiliation. Return ONLY valid JSON.";

        var sourceBlock = sourceText.Length > 0
            ? $"\nOFFICIAL SOURCE TEXT (ground your answer in this where it is relevant; it may be partial):\n{sourceText}"
            : "\n(No source text available — rely on well-established public knowledge and stay conservative.)";

        var user = $@"Company: {current.name}{(current.aliases is { Count: > 0 } ? $" (also known as: {string.Join(", ", current.aliases)})" : "")}
Sector: {current.sector}. Region focus: {current.region}.{sourceBlock}

Write this company's ""interview DNA"" profile as JSON with EXACTLY these fields:
{{
  ""about"": ""2-3 sentences: what the company does and is known for"",
  ""mission"": ""its stated mission/purpose in one sentence"",
  ""values"": [ {{ ""name"": ""..."", ""meaning"": ""one line on what it means in practice"" }} ],   // 4-8 publicly stated values/principles/behaviours
  ""facts"": [ ""..."" ],   // 6-8 concrete, stable facts a well-prepared candidate should know (products/brands, scale, strategy, recent well-known direction). No exact figures that go stale quickly.
  ""interview"": {{
    ""overview"": ""3-4 sentences on how hiring typically works here and what they are really testing for"",
    ""stages"": [ {{ ""name"": ""..."", ""format"": ""one line"" }} ],   // typical stages in order, e.g. recruiter screen, assessment, panel/loop
    ""tone"": ""how interviews feel: e.g. structured/behavioural, conversational, pressure-testing, case-driven"",
    ""styles"": {{
      ""technical"": {{ ""focus"": [""...""], ""questionTypes"": [""...""], ""bar"": ""Beginner|Standard|Pro|Expert"", ""typicalQuestions"": 5|10|15|20, ""notes"": ""one or two sentences"" }},
      ""commercial"": {{ ... }},   // marketing, sales, product, brand, customer, strategy roles
      ""corporate"": {{ ... }},    // finance, HR, legal, risk, compliance, operations-management roles
      ""operations"": {{ ... }}    // stores, frontline, logistics, supply chain, customer service roles
    }}
  }}
}}
Rules: include a style entry ONLY for role families that genuinely exist at this company (a pure retailer may have no ""technical"" entry beyond IT support; an investment bank may have no ""operations"" store entry). ""focus"" = the themes interviewers probe (4-6 short phrases). ""questionTypes"" = the kinds of questions asked (e.g. structured behavioural STAR, leadership-principle deep dives, case study, system design, market sizing, situational judgement) — 3-5 short phrases. ""bar"" = how demanding a typical process is for that family. Keep every string concise.";

        using var doc = await ModelJsonAsync(system, user, 0.4, factory, config);
        var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true, NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString };
        Draft? d;
        try { d = doc.RootElement.Deserialize<Draft>(opts); }
        catch (Exception ex) { logger.LogWarning(ex, "Company profile draft for {Id} did not match the expected shape", id); return null; }
        if (d?.interview is null || (d.interview.styles?.Count ?? 0) == 0) { logger.LogWarning("Company profile draft for {Id} had no interview styles", id); return null; }

        var updated = current with
        {
            status = usedSources.Count > 0 ? "source-grounded" : "ai-draft",
            about = d.about,
            mission = d.mission,
            values = d.values,
            facts = d.facts,
            interview = d.interview with { styles = d.interview.styles!.Where(kv => kv.Key is "technical" or "commercial" or "corporate" or "operations").ToDictionary(kv => kv.Key, kv => kv.Value) },
            sources = usedSources,
            generatedAt = DateTime.UtcNow.ToString("o"),
        };
        await cosmos.GetContainer("companyProfiles").UpsertItemAsync(updated, new PartitionKey(id));
        _listCache = null;
        logger.LogInformation("Company profile drafted: {Name} ({Status}, {N} sources)", current.name, updated.status, usedSources.Count);
        return updated;
    }

    private static async Task<JsonDocument> ModelJsonAsync(string system, string user, double temperature, IHttpClientFactory factory, IConfiguration config)
    {
        var apiKey = config["ModelRouter:ApiKey"] ?? throw new InvalidOperationException("ModelRouter:ApiKey not configured");
        var endpoint = config["ModelRouter:Endpoint"] ?? throw new InvalidOperationException("ModelRouter:Endpoint not configured");
        var body = JsonSerializer.Serialize(new
        {
            model = "model-router", temperature,
            response_format = new { type = "json_object" },
            messages = new object[] { new { role = "system", content = system }, new { role = "user", content = user } },
        });
        using var msg = new HttpRequestMessage(HttpMethod.Post, $"{endpoint.TrimEnd('/')}/openai/v1/chat/completions");
        msg.Headers.Add("api-key", apiKey);
        msg.Content = new StringContent(body, Encoding.UTF8, "application/json");
        using var resp = await factory.CreateClient().SendAsync(msg);
        var text = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode) throw new InvalidOperationException($"Model Router returned {resp.StatusCode}: {text}");
        using var outer = JsonDocument.Parse(text);
        var content = outer.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
            ?? throw new InvalidOperationException("Empty model response");
        return JsonDocument.Parse(content);
    }
}

public record CompanySummary(string id, string name, List<string> aliases, string sector, string region, int rank, string status);

public record CompanyValue(string name, string? meaning);
public record CompanyStage(string name, string? format);
public record CompanyStyle(List<string>? focus, List<string>? questionTypes, string? bar, int? typicalQuestions, string? notes);
public record CompanyInterview(string? overview, List<CompanyStage>? stages, string? tone, Dictionary<string, CompanyStyle>? styles);
internal record Draft(string? about, string? mission, List<CompanyValue>? values, List<string>? facts, CompanyInterview? interview);

/// <summary>status: stub | ai-draft | source-grounded | reviewed | retired</summary>
public record CompanyProfile(
    string id,
    string name,
    List<string>? aliases,
    string sector,
    string region,
    int rank,
    string status,
    string? about,
    string? mission,
    List<CompanyValue>? values,
    List<string>? facts,
    CompanyInterview? interview,
    List<string>? sources,
    List<string>? sourceUrls,
    string? generatedAt,
    string? lastVerifiedAt,
    string? notes);
