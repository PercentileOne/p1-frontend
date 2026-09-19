using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;

namespace Explain.Api.Features.ExamCatalog.Blueprint;

/// <summary>
/// "Just-in-time" exam blueprints (Francis, 2026-09-19 — see ~/.claude/plans/
/// any-exam-certifications-plan.md). The catalog holds many name-only stub entries; an exam is only
/// takeable once it has a blueprint (its content areas + weightings, in `domains`). Instead of
/// telling a candidate "still being built out", picking a stub calls this endpoint: the AI drafts
/// the blueprint once, it is saved back into the catalog flagged blueprintStatus="ai-draft" (the UI
/// warns it may differ from the official specification until an admin reviews it), and every later
/// candidate reuses it for free.
///
/// Deliberately anonymous, like /api/cv-analysis: the catalog picker is candidate-portal only but
/// the call is cheap and self-limiting — it only ever runs for an entry that has no blueprint yet
/// and the result is persisted, so total spend is bounded by catalog size, not by traffic. A
/// per-exam single-flight lock stops concurrent first-clicks from generating it twice. (The planned
/// "search anything" auto-create needs real abuse controls before it ships — not needed here.)
/// </summary>
public static class Endpoint
{
    private static readonly ConcurrentDictionary<string, Task<string?>> InFlight = new();
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    public static void Map(WebApplication app)
    {
        app.MapPost("/api/exam-catalog/{id}/blueprint", async (
            string id, IHttpClientFactory factory, IConfiguration config, ILogger<Program> logger) =>
        {
            var baseUrl = config["ExamCatalogAgent:BaseUrl"]?.TrimEnd('/');
            var adminKey = config["ExamCatalogAgent:AdminKey"];
            if (string.IsNullOrEmpty(baseUrl) || string.IsNullOrEmpty(adminKey))
                return Results.Json(new { error = "Exam catalog is not configured." }, statusCode: 503);

            var http = factory.CreateClient();
            var entryRes = await http.GetAsync($"{baseUrl}/examcatalog/entry/{Uri.EscapeDataString(id)}");
            if (entryRes.StatusCode == System.Net.HttpStatusCode.NotFound) return Results.NotFound();
            if (!entryRes.IsSuccessStatusCode) return Results.Json(new { error = "Exam catalog unavailable." }, statusCode: 502);
            var entryJson = await entryRes.Content.ReadAsStringAsync();

            using (var doc = JsonDocument.Parse(entryJson))
            {
                if (doc.RootElement.TryGetProperty("domains", out var d) && d.ValueKind == JsonValueKind.Array && d.GetArrayLength() > 0)
                    return Results.Content(entryJson, "application/json"); // already has a blueprint
            }

            // Single-flight per exam. The task removes itself when done so a failure can be retried.
            var task = InFlight.GetOrAdd(id, _ => GenerateAndPersistAsync(id, entryJson, baseUrl, adminKey, factory, config, logger));
            string? updated;
            try { updated = await task; }
            finally { InFlight.TryRemove(id, out _); }

            return updated is null
                ? Results.Json(new { error = "Couldn't prepare this exam right now — please try again in a moment." }, statusCode: 502)
                : Results.Content(updated, "application/json");
        }).AllowAnonymous();
    }

    private static async Task<string?> GenerateAndPersistAsync(
        string id, string entryJson, string baseUrl, string adminKey,
        IHttpClientFactory factory, IConfiguration config, ILogger logger)
    {
        try
        {
            using var entryDoc = JsonDocument.Parse(entryJson);
            var e = entryDoc.RootElement;
            string S(string name) => e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";
            int N(string name) => e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt32() : 0;

            var scoringModel = S("scoringModel");
            var needsScores = (scoringModel is "" or "scaled") && N("maxScore") == 0;

            var draft = await CallModelAsync(
                name: S("name"), category: S("category"), region: S("region"), board: S("board"),
                level: S("level"), subject: S("subject"), vendor: S("vendor"), examCode: S("examCode"),
                needsScores: needsScores, factory: factory, config: config);
            if (draft is null) return null;

            var payload = new Dictionary<string, object?>
            {
                ["domains"] = draft.Domains.Select(d => new { name = d.Name, weightPct = d.WeightPct }).ToList(),
                ["blueprintStatus"] = "ai-draft",
                ["blueprintGeneratedAt"] = DateTime.UtcNow.ToString("o"),
            };
            if (needsScores && draft.MaxScore > draft.MinScore)
            {
                payload["minScore"] = draft.MinScore;
                payload["maxScore"] = draft.MaxScore;
                payload["passScore"] = Math.Clamp(draft.PassScore, 0, draft.MaxScore);
            }

            var http = factory.CreateClient();
            http.DefaultRequestHeaders.Add("x-functions-key", adminKey);
            using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var editRes = await http.PostAsync($"{baseUrl}/examcatalog/{Uri.EscapeDataString(id)}/edit", content);
            if (!editRes.IsSuccessStatusCode)
            {
                logger.LogError("Blueprint persist failed for {Id}: {Status}", id, editRes.StatusCode);
                return null;
            }
            logger.LogInformation("Exam blueprint generated for {Id} ({Name}): {Count} domains", id, S("name"), draft.Domains.Count);
            return await editRes.Content.ReadAsStringAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Blueprint generation failed for {Id}", id);
            return null;
        }
    }

    private sealed record Domain(string Name, int WeightPct);
    private sealed record Draft(List<Domain> Domains, int MinScore, int MaxScore, int PassScore);

    private static async Task<Draft?> CallModelAsync(
        string name, string category, string region, string board, string level, string subject,
        string vendor, string examCode, bool needsScores, IHttpClientFactory factory, IConfiguration config)
    {
        var apiKey = config["ModelRouter:ApiKey"] ?? throw new InvalidOperationException("ModelRouter:ApiKey not configured");
        var endpoint = config["ModelRouter:Endpoint"] ?? throw new InvalidOperationException("ModelRouter:Endpoint not configured");

        var jurisdiction = region switch { "uk" => "United Kingdom", "us" => "United States", _ => "international" };
        var system = "You are an expert on UK and US exams, qualifications and professional certifications. You produce the exam BLUEPRINT — the content areas an exam covers and how heavily each is weighted. Return ONLY valid JSON — no markdown, no explanation.";

        var scoresLine = needsScores
            ? "\n- \"minScore\", \"maxScore\" and \"passScore\": the exam's reported score scale and its published pass mark (integers; passScore 0 if there is no fixed pass mark). Use the real published scale if you know it (e.g. Microsoft 1-1000 pass 700; SAT 400-1600)."
            : "";
        var scoresJson = needsScores ? ", \"minScore\": 0, \"maxScore\": 1000, \"passScore\": 700" : "";

        var user = $@"Exam: {name}
Type/category: {category}
Jurisdiction: {jurisdiction}
{(string.IsNullOrEmpty(board) ? "" : $"Awarding body/board: {board}\n")}{(string.IsNullOrEmpty(level) ? "" : $"Level: {level}\n")}{(string.IsNullOrEmpty(subject) ? "" : $"Subject: {subject}\n")}{(string.IsNullOrEmpty(vendor) ? "" : $"Vendor/owner: {vendor}\n")}{(string.IsNullOrEmpty(examCode) ? "" : $"Exam code: {examCode}\n")}
Produce the blueprint for a multiple-choice mock of this exam:
- ""domains"": 4 to 8 content areas, named the way the official specification / exam guide / skills-measured document groups them (short: 2-8 words, specific to THIS exam — not generic). Each has ""weightPct"", an integer percentage of the exam; the weights must sum to 100. Use the officially published weightings where you know them (midpoint of a published range). If you do not know them, give sensible approximate weightings. If no exam board is given, use the subject content common to the main UK/US boards.{scoresLine}
- Do not invent details you are not sure about.

Return JSON:
{{ ""domains"": [ {{ ""name"": ""..."", ""weightPct"": 25 }} ]{scoresJson} }}";

        var body = JsonSerializer.Serialize(new
        {
            model = "model-router",
            temperature = 0.3,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = system },
                new { role = "user", content = user },
            },
        });

        var client = factory.CreateClient();
        using var msg = new HttpRequestMessage(HttpMethod.Post, $"{endpoint.TrimEnd('/')}/openai/v1/chat/completions");
        msg.Headers.Add("api-key", apiKey);
        msg.Content = new StringContent(body, Encoding.UTF8, "application/json");
        using var resp = await client.SendAsync(msg);
        var responseBody = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode) throw new InvalidOperationException($"Model Router returned {resp.StatusCode}: {responseBody}");

        using var doc = JsonDocument.Parse(responseBody);
        var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
            ?? throw new InvalidOperationException("Empty model response");
        using var parsed = JsonDocument.Parse(content);
        var root = parsed.RootElement;

        if (!root.TryGetProperty("domains", out var arr) || arr.ValueKind != JsonValueKind.Array) return null;
        var raw = new List<Domain>();
        foreach (var d in arr.EnumerateArray())
        {
            var dn = d.TryGetProperty("name", out var n) && n.ValueKind == JsonValueKind.String ? n.GetString()?.Trim() : null;
            var w = d.TryGetProperty("weightPct", out var wv) && wv.ValueKind == JsonValueKind.Number ? (int)Math.Round(wv.GetDouble()) : 0;
            if (string.IsNullOrWhiteSpace(dn) || w <= 0) continue;
            raw.Add(new Domain(dn.Length > 100 ? dn[..100] : dn, w));
        }
        if (raw.Count < 3) return null;
        raw = raw.Take(10).ToList();

        int I(string prop) => root.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.Number ? (int)Math.Round(v.GetDouble()) : 0;
        return new Draft(NormaliseTo100(raw), I("minScore"), I("maxScore"), I("passScore"));
    }

    // Largest-remainder rounding so the weights always sum to exactly 100, whatever the model returned.
    private static List<Domain> NormaliseTo100(List<Domain> raw)
    {
        var total = raw.Sum(d => d.WeightPct);
        var scaled = raw.Select(d => (d, exact: d.WeightPct * 100.0 / total)).ToList();
        var floors = scaled.Select(s => (int)Math.Floor(s.exact)).ToList();
        var remainder = 100 - floors.Sum();
        var order = scaled.Select((s, i) => (i, frac: s.exact - Math.Floor(s.exact))).OrderByDescending(x => x.frac).Take(remainder).Select(x => x.i).ToHashSet();
        return raw.Select((d, i) => new Domain(d.Name, floors[i] + (order.Contains(i) ? 1 : 0))).ToList();
    }
}
