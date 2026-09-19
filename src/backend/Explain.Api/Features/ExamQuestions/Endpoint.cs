using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.ExamQuestions;

/// <summary>
/// Server-side exam question bank (Francis, 2026-09-19 — milestone 2 of ~/.claude/plans/
/// any-exam-certifications-plan.md). Replaces the browser generating one AI call per question with
/// no reuse. Now:
///   • questions live in the `examQuestions` container, partitioned by exam, and are REUSED — each
///     attempt samples the least-served ones, so cost per attempt trends to zero as the bank fills;
///   • only the shortfall is generated synchronously (batched per domain, deduplicated); the pool
///     is then topped up in the background so the next attempt has variety;
///   • maths/science-style exams get an independent SOLVE-AND-COMPARE verification pass, and a
///     question whose marked answer the solver disagrees with is discarded, never served;
///   • candidates can report a question; enough distinct reports and it stops being served and
///     lands in an admin review queue.
///
/// Anonymous like the other AI endpoints (the portal's demo login can't authenticate), so spend is
/// bounded structurally instead: MaxPoolPerDomain caps how many questions can ever be generated
/// for an exam domain, no matter how many requests arrive.
/// </summary>
public static class Endpoint
{
    private const int MaxPoolPerDomain = 60;      // hard cap on questions ever generated per exam domain
    private const int PoolTargetFloor = 12;       // background top-up aims for at least this many per domain
    private const int MaxPerModelCall = 10;
    private const int FlagAfterDistinctReports = 3;

    private static readonly ConcurrentDictionary<string, Task> TopUpInFlight = new();
    private static readonly Regex StemNeeds = new(
        @"math|statistic|physic|chem|biolog|science|comput|econom|account|calculus|precalc|algebra|quant|reasoning|GRE|GMAT|\bSAT\b|\bACT\b|MCAT",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static void Map(WebApplication app)
    {
        // POST /api/exams/{examId}/questions  { "count": 30 }
        app.MapPost("/api/exams/{examId}/questions", async (
            string examId, QuestionsRequest req, IHttpClientFactory factory, IConfiguration config,
            CosmosService cosmos, ILogger<Program> logger) =>
        {
            var baseUrl = config["ExamCatalogAgent:BaseUrl"]?.TrimEnd('/');
            if (string.IsNullOrEmpty(baseUrl)) return Results.Json(new { error = "Exam catalog is not configured." }, statusCode: 503);

            var entryRes = await factory.CreateClient().GetAsync($"{baseUrl}/examcatalog/entry/{Uri.EscapeDataString(examId)}");
            if (entryRes.StatusCode == System.Net.HttpStatusCode.NotFound) return Results.NotFound();
            if (!entryRes.IsSuccessStatusCode) return Results.Json(new { error = "Exam catalog unavailable." }, statusCode: 502);

            using var entryDoc = JsonDocument.Parse(await entryRes.Content.ReadAsStringAsync());
            var exam = ExamInfo.From(entryDoc.RootElement);
            if (exam.Domains.Count == 0) return Results.BadRequest(new { error = "This exam has no blueprint yet." });

            var count = Math.Clamp(req.Count ?? 30, 5, 100);
            var quotas = Quotas(exam.Domains, count);
            var container = cosmos.GetContainer("examQuestions");

            // One task per domain: sample from the bank, generate only the shortfall.
            var perDomain = await Task.WhenAll(exam.Domains.Select(async d =>
            {
                var quota = quotas[d.Name];
                if (quota == 0) return new List<BankQuestion>();
                var pool = await LoadPoolAsync(container, examId, d.Name);
                var picked = pool.OrderBy(q => q.servedCount).ThenBy(_ => Random.Shared.Next()).Take(quota).ToList();
                // Generate only the shortfall, in rounds of up to MaxPerModelCall (a big domain on a
                // 60-question exam can need more than one). Sequential so each round can dedupe
                // against what the previous one just stored.
                for (var round = 0; round < 3 && picked.Count < quota; round++)
                {
                    try
                    {
                        var fresh = await GenerateAsync(exam, d.Name, quota - picked.Count, pool, factory, config, container, logger);
                        if (fresh.Count == 0) break;
                        pool.AddRange(fresh);
                        picked.AddRange(fresh.Take(quota - picked.Count));
                    }
                    catch (Exception ex) { logger.LogError(ex, "Exam question generation failed for {Exam}/{Domain}", exam.Name, d.Name); break; }
                }
                return picked;
            }));

            var served = perDomain.SelectMany(x => x).OrderBy(_ => Random.Shared.Next()).ToList();
            if (served.Count == 0) return Results.Json(new { error = "Couldn't prepare questions right now — please try again in a moment." }, statusCode: 502);

            // Bookkeeping + pool top-up happen after the candidate already has their questions.
            _ = Task.Run(async () =>
            {
                foreach (var q in served)
                    try { await container.PatchItemAsync<BankQuestion>(q.id, new PartitionKey(examId), new[] { PatchOperation.Increment("/servedCount", 1) }); }
                    catch { /* served-count is best-effort */ }
                foreach (var d in exam.Domains) await TopUpAsync(exam, d.Name, quotas[d.Name], factory, config, container, logger);
            });

            return Results.Ok(served.Select(q => new { q.id, q.questionText, q.options, q.correctIndex, q.explanation, q.domain }));
        }).AllowAnonymous();

        // POST /api/exams/{examId}/questions/{questionId}/report  { "reason": "wrong-answer" }
        // Anonymous, but a reporter is only counted once per question (user id if signed in, else a
        // hash of their IP), so one person can't knock a question out by spamming the button.
        app.MapPost("/api/exams/{examId}/questions/{questionId}/report", async (
            string examId, string questionId, ReportRequest req, HttpContext ctx, CosmosService cosmos, ILogger<Program> logger) =>
        {
            var container = cosmos.GetContainer("examQuestions");
            BankQuestion q;
            try { q = (await container.ReadItemAsync<BankQuestion>(questionId, new PartitionKey(examId))).Resource; }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return Results.NotFound(); }

            var who = ctx.User.FindFirst("sub")?.Value
                ?? "ip:" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown")))[..16];
            var reporters = q.reporters ?? new List<string>();
            if (reporters.Contains(who)) return Results.Ok(new { alreadyReported = true });

            var reason = (req.Reason ?? "other").Trim();
            var notes = (q.reports ?? new List<ReportNote>()).Append(new ReportNote(reason.Length > 60 ? reason[..60] : reason, DateTime.UtcNow.ToString("o"))).TakeLast(10).ToList();
            var count = q.reportCount + 1;
            var status = q.status == "active" && count >= FlagAfterDistinctReports ? "flagged" : q.status;
            await container.UpsertItemAsync(q with { reportCount = count, reporters = reporters.Append(who).ToList(), reports = notes, status = status }, new PartitionKey(examId));
            if (status == "flagged" && q.status == "active") logger.LogWarning("Exam question {Id} ({Exam}) flagged after {N} reports", questionId, examId, count);
            return Results.Ok(new { reported = true });
        }).AllowAnonymous();

        // Admin review queue for flagged questions.
        app.MapGet("/api/admin/exam-questions/flagged", async (CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("examQuestions");
            var rows = new List<BankQuestion>();
            using var feed = container.GetItemQueryIterator<BankQuestion>(new QueryDefinition("SELECT * FROM c WHERE c.status = 'flagged'"));
            while (feed.HasMoreResults) rows.AddRange(await feed.ReadNextAsync());
            return Results.Ok(rows.OrderByDescending(r => r.reportCount));
        }).RequireAuthorization(Permissions.ManageExamCatalog);

        // action: "retire" (never serve again) | "restore" (clear reports, serve again)
        app.MapPost("/api/admin/exam-questions/{examId}/{questionId}/resolve", async (
            string examId, string questionId, ResolveRequest req, CosmosService cosmos) =>
        {
            if (req.Action is not ("retire" or "restore")) return Results.BadRequest(new { error = "action must be retire or restore." });
            var container = cosmos.GetContainer("examQuestions");
            BankQuestion q;
            try { q = (await container.ReadItemAsync<BankQuestion>(questionId, new PartitionKey(examId))).Resource; }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return Results.NotFound(); }
            var updated = req.Action == "retire"
                ? q with { status = "retired" }
                : q with { status = "active", reportCount = 0, reporters = new List<string>(), reports = new List<ReportNote>() };
            await container.UpsertItemAsync(updated, new PartitionKey(examId));
            return Results.Ok(new { status = updated.status });
        }).RequireAuthorization(Permissions.ManageExamCatalog);
    }

    // ── Pool + generation ────────────────────────────────────────────────────────────────────────

    private static async Task<List<BankQuestion>> LoadPoolAsync(Container container, string examId, string domain)
    {
        var rows = new List<BankQuestion>();
        var query = new QueryDefinition("SELECT * FROM c WHERE c.examId = @e AND c.domain = @d AND c.status = 'active'")
            .WithParameter("@e", examId).WithParameter("@d", domain);
        using var feed = container.GetItemQueryIterator<BankQuestion>(query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(examId) });
        while (feed.HasMoreResults) rows.AddRange(await feed.ReadNextAsync());
        return rows;
    }

    private static async Task TopUpAsync(ExamInfo exam, string domain, int quota, IHttpClientFactory factory, IConfiguration config, Container container, ILogger logger)
    {
        var key = $"{exam.Id}|{domain}";
        var task = TopUpInFlight.GetOrAdd(key, _ => Task.Run(async () =>
        {
            try
            {
                var pool = await LoadPoolAsync(container, exam.Id, domain);
                var target = Math.Min(MaxPoolPerDomain, Math.Max(PoolTargetFloor, quota * 3));
                var want = Math.Min(MaxPerModelCall, target - pool.Count);
                if (want > 0) await GenerateAsync(exam, domain, want, pool, factory, config, container, logger);
            }
            catch (Exception ex) { logger.LogError(ex, "Exam pool top-up failed for {Key}", key); }
        }));
        try { await task; } finally { TopUpInFlight.TryRemove(key, out _); }
    }

    /// <summary>Generates up to `want` NEW questions for one domain, verifies (STEM), dedupes, persists, returns the stored ones.</summary>
    private static async Task<List<BankQuestion>> GenerateAsync(
        ExamInfo exam, string domain, int want, List<BankQuestion> existing,
        IHttpClientFactory factory, IConfiguration config, Container container, ILogger logger)
    {
        var room = MaxPoolPerDomain - existing.Count;
        want = Math.Min(Math.Min(want, MaxPerModelCall), Math.Max(room, 0));
        if (want <= 0) return new List<BankQuestion>();

        var raw = await CallGenerateAsync(exam, domain, want + 1, existing, factory, config); // +1: some get dropped
        var seen = existing.Select(q => q.hash).ToHashSet();
        var candidates = new List<RawQuestion>();
        foreach (var r in raw)
        {
            if (!IsWellFormed(r)) continue;
            var h = Hash(r.questionText);
            if (!seen.Add(h)) continue;
            candidates.Add(r with { hash = h });
        }

        var verified = exam.NeedsVerification;
        if (verified && candidates.Count > 0)
            candidates = await VerifyAsync(exam, candidates, factory, config, logger);

        var stored = new List<BankQuestion>();
        foreach (var c in candidates.Take(want))
        {
            var (opts, correct) = ShuffleOptions(c.options, c.correctIndex);
            var q = new BankQuestion(Guid.NewGuid().ToString(), exam.Id, domain, c.questionText.Trim(), opts, correct,
                (c.explanation ?? "").Trim(), c.hash!, DateTime.UtcNow.ToString("o"), verified);
            await container.UpsertItemAsync(q, new PartitionKey(exam.Id));
            stored.Add(q);
        }
        logger.LogInformation("Exam bank: {Exam}/{Domain} +{N} ({Dropped} dropped, verified={V})", exam.Name, domain, stored.Count, raw.Count - stored.Count, verified);
        return stored;
    }

    private static bool IsWellFormed(RawQuestion r) =>
        !string.IsNullOrWhiteSpace(r.questionText) && r.options is { Count: 4 } && r.options.All(o => !string.IsNullOrWhiteSpace(o))
        && r.correctIndex is >= 0 and <= 3 && r.options.Select(o => o.Trim().ToLowerInvariant()).Distinct().Count() == 4;

    private static string Hash(string text)
    {
        var norm = new string(text.ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());
        if (norm.Length > 200) norm = norm[..200];
        return Convert.ToHexString(SHA1.HashData(Encoding.UTF8.GetBytes(norm)))[..20];
    }

    // The model tends to favour some answer positions; shuffling at store time removes that bias.
    private static (List<string> options, int correctIndex) ShuffleOptions(List<string> options, int correctIndex)
    {
        var order = Enumerable.Range(0, options.Count).OrderBy(_ => Random.Shared.Next()).ToList();
        return (order.Select(i => options[i].Trim()).ToList(), order.IndexOf(correctIndex));
    }

    // Largest-remainder split of `count` across domains by weight (every domain with weight > 0 sums exactly to count).
    private static Dictionary<string, int> Quotas(List<DomainInfo> domains, int count)
    {
        var weights = domains.Select(d => Math.Max(d.WeightPct, 0)).ToList();
        var total = weights.Sum();
        if (total == 0) { weights = domains.Select(_ => 1).ToList(); total = domains.Count; } // no weights at all: split evenly
        var exact = domains.Select((d, i) => (d.Name, x: weights[i] * (double)count / total)).ToList();
        var floors = exact.ToDictionary(e => e.Name, e => (int)Math.Floor(e.x));
        var rest = count - floors.Values.Sum();
        foreach (var e in exact.OrderByDescending(e => e.x - Math.Floor(e.x)).Take(rest)) floors[e.Name]++;
        return floors;
    }

    // ── Model calls ──────────────────────────────────────────────────────────────────────────────

    private static string AudienceLine(ExamInfo e)
    {
        var spelling = e.Region == "us" ? "American spelling and US conventions" : e.Region == "uk" ? "British spelling and UK conventions" : "clear international English";
        var board = string.IsNullOrEmpty(e.Board) ? "" : e.Board + " ";
        return e.Category switch
        {
            "gcse" => $"Pitch them at UK GCSE students (age 14-16) following the {board}GCSE {(string.IsNullOrEmpty(e.Subject) ? e.Name : e.Subject)} content — {spelling}.",
            "a-level" => $"Pitch them at UK A-Level students (age 16-18) following the {board}A-Level {(string.IsNullOrEmpty(e.Subject) ? e.Name : e.Subject)} content — {spelling}.",
            "ap" => $"Pitch them at US high-school students taking the College Board AP course — {spelling}.",
            "admissions" => $"Pitch them at test-takers preparing for this admissions test — {spelling}.",
            _ => $"Pitch them at a candidate preparing for the real exam — {spelling}.",
        };
    }

    private static async Task<List<RawQuestion>> CallGenerateAsync(ExamInfo e, string domain, int n, List<BankQuestion> existing, IHttpClientFactory factory, IConfiguration config)
    {
        var ident = string.Join(" ", new[] { e.Vendor, string.IsNullOrEmpty(e.ExamCode) ? "" : $"exam {e.ExamCode}" }.Where(s => !string.IsNullOrEmpty(s)));
        var system = $@"You write realistic multiple-choice practice questions for a ""{e.Name}""{(ident.Length > 0 ? $" ({ident})" : "")} mock exam.
{AudienceLine(e)}
Each question must test genuine understanding within the given domain — never invent current pricing, exact portal UI labels, or other details that change over time. If a question involves a calculation, work it out carefully and make sure the marked correct option is genuinely correct.
These are ORIGINAL practice questions — never reproduce real past-paper or exam-dump questions.
Only when a question genuinely needs mathematical or scientific notation (fractions, powers, roots, chemical formulae, units), write it as LaTeX inside \( ... \) — e.g. \(\frac{{3}}{{4}}\), \(x^2\), \(\sqrt{{2}}\), \(\mathrm{{H_2O}}\). Use those delimiters only, never $...$. Everything else is ordinary plain text; questions with no maths contain no LaTeX at all.
Return ONLY valid JSON — no markdown, no explanation outside the JSON.";

        var avoid = existing.Count == 0 ? "" : "\nDo NOT repeat or closely resemble these existing questions:\n" +
            string.Join("\n", existing.OrderBy(_ => Random.Shared.Next()).Take(12).Select(q => "- " + (q.questionText.Length > 110 ? q.questionText[..110] : q.questionText)));

        var user = $@"Write {n} different multiple-choice questions for the domain: ""{domain}"".
STRICT RULES:
- Each has exactly 4 options and exactly one correct option; correctIndex is its 0-based index.
- Each tests a DIFFERENT specific point; vary the difficulty from straightforward to demanding.
- Real understanding, not trivia; plausible wrong options; never ""all of the above"" or ""both A and B"".
- explanation: one sentence on why the correct answer is right.{avoid}

Return JSON:
{{ ""questions"": [ {{ ""questionText"": ""..."", ""options"": [""..."", ""..."", ""..."", ""...""], ""correctIndex"": 2, ""explanation"": ""..."" }} ] }}";

        using var doc = await ModelJsonAsync(system, user, 0.8, factory, config);
        var list = new List<RawQuestion>();
        if (!doc.RootElement.TryGetProperty("questions", out var arr) || arr.ValueKind != JsonValueKind.Array) return list;
        foreach (var el in arr.EnumerateArray())
        {
            try
            {
                var opts = el.GetProperty("options").EnumerateArray().Select(o => o.GetString() ?? "").ToList();
                list.Add(new RawQuestion(el.GetProperty("questionText").GetString() ?? "", opts, el.GetProperty("correctIndex").GetInt32(),
                    el.TryGetProperty("explanation", out var ex) ? ex.GetString() : "", null));
            }
            catch { /* skip a malformed item */ }
        }
        return list;
    }

    // Independent solve-and-compare: the checker sees the question and options but NOT the marked
    // answer, works it out itself, and any question it disagrees with (or isn't sure about) is dropped.
    private static async Task<List<RawQuestion>> VerifyAsync(ExamInfo e, List<RawQuestion> qs, IHttpClientFactory factory, IConfiguration config, ILogger logger)
    {
        try
        {
            var sb = new StringBuilder();
            for (var i = 0; i < qs.Count; i++)
                sb.AppendLine($"Q{i}: {qs[i].questionText}\n" + string.Join("\n", qs[i].options.Select((o, j) => $"  {(char)('A' + j)}. {o}")));

            var system = "You are a meticulous exam marker. For each multiple-choice question, work out the correct answer yourself, step by step, from first principles. Return ONLY valid JSON.";
            var user = $@"Exam: {e.Name}. Solve each question independently.
{sb}
Return JSON: {{ ""answers"": [ {{ ""i"": 0, ""correctIndex"": 2, ""confident"": true }} ] }}  (correctIndex is 0-based; confident=false if the question is ambiguous or has no single correct option).";
            using var doc = await ModelJsonAsync(system, user, 0.1, factory, config);
            var byIndex = new Dictionary<int, (int idx, bool conf)>();
            foreach (var a in doc.RootElement.GetProperty("answers").EnumerateArray())
                byIndex[a.GetProperty("i").GetInt32()] = (a.GetProperty("correctIndex").GetInt32(), !a.TryGetProperty("confident", out var c) || c.GetBoolean());

            var kept = qs.Where((q, i) => byIndex.TryGetValue(i, out var a) && a.conf && a.idx == q.correctIndex).ToList();
            logger.LogInformation("Exam bank verification {Exam}: kept {Kept}/{Total}", e.Name, kept.Count, qs.Count);
            return kept;
        }
        catch (Exception ex)
        {
            // If verification itself fails we must not serve unchecked maths — drop the batch.
            logger.LogError(ex, "Exam question verification failed for {Exam}; discarding batch", e.Name);
            return new List<RawQuestion>();
        }
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

    // ── Shapes ───────────────────────────────────────────────────────────────────────────────────

    private sealed record DomainInfo(string Name, int WeightPct);
    private sealed record RawQuestion(string questionText, List<string> options, int correctIndex, string? explanation, string? hash);

    private sealed class ExamInfo
    {
        public string Id = "", Name = "", Category = "", Region = "", Board = "", Subject = "", Vendor = "", ExamCode = "";
        public List<DomainInfo> Domains = new();
        public bool NeedsVerification => Category is "gcse" or "a-level" or "ap" or "admissions" && StemNeeds.IsMatch($"{Subject} {Name}");

        public static ExamInfo From(JsonElement e)
        {
            string S(string p) => e.TryGetProperty(p, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";
            var info = new ExamInfo { Id = S("id"), Name = S("name"), Category = S("category"), Region = S("region"), Board = S("board"), Subject = S("subject"), Vendor = S("vendor"), ExamCode = S("examCode") };
            if (e.TryGetProperty("domains", out var d) && d.ValueKind == JsonValueKind.Array)
                foreach (var x in d.EnumerateArray())
                    info.Domains.Add(new DomainInfo(x.GetProperty("name").GetString() ?? "", x.TryGetProperty("weightPct", out var w) && w.ValueKind == JsonValueKind.Number ? w.GetInt32() : 0));
            return info;
        }
    }

    public record QuestionsRequest(int? Count);
    public record ReportRequest(string? Reason);
    public record ResolveRequest(string Action);
}

public record ReportNote(string reason, string at);

public record BankQuestion(
    string id,
    string examId,
    string domain,
    string questionText,
    List<string> options,
    int correctIndex,
    string explanation,
    string hash,
    string createdAt,
    bool verified,
    int servedCount = 0,
    int reportCount = 0,
    List<string>? reporters = null,
    List<ReportNote>? reports = null,
    string status = "active");
