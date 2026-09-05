using Microsoft.Extensions.Configuration;
using P1.CareersAgent.Models;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace P1.CareersAgent.Services;

public class OpenAiEnricher(IConfiguration config, IHttpClientFactory httpFactory)
{
    // Was a direct OpenAI call with its own key — now routes through Explain.Api's shared
    // /api/ai-proxy (Azure AI Foundry Model Router), same path Learn and interview scoring use,
    // so this agent gets the router's auto-failover too and no longer needs its own OpenAI key.
    private readonly string _explainApiUrl = (config["ExplainApiUrl"] ?? "https://api.explain.global").TrimEnd('/');

    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    // ── Salary-only update (cheap, weekly) ─────────────────────────────────────

    public async Task<(SalaryData salary, ContractRateData? contractRate, WorkforceData workforce, string updatedDate)>
        UpdateSalaryAsync(CareerDocument career, ILogger log)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'");
        var prompt =
            "Update salary and workforce data for: " + career.Title + " (" + career.Category + ")\n" +
            "Return JSON only, no markdown:\n" +
            "{\n" +
            "  \"salary\": {\n" +
            "    \"uk\": {\"starting\":0,\"mid\":0,\"senior\":0,\"expert\":0,\"currency\":\"GBP\"},\n" +
            "    \"us\": {\"starting\":0,\"mid\":0,\"senior\":0,\"expert\":0,\"currency\":\"USD\"}\n" +
            "  },\n" +
            "  \"contractRate\": null OR {\n" +
            "    \"uk\": {\"junior\":0,\"mid\":0,\"senior\":0,\"expert\":0,\"currency\":\"GBP\"},\n" +
            "    \"us\": {\"junior\":0,\"mid\":0,\"senior\":0,\"expert\":0,\"currency\":\"USD\"}\n" +
            "  },\n" +
            "  \"workforce\": {\n" +
            "    \"uk\": {\"employed\":0,\"studying\":0,\"growthPct5yr\":0.0,\"growthTrend\":\"stable\",\"vacancies\":0},\n" +
            "    \"us\": {\"employed\":0,\"studying\":0,\"growthPct5yr\":0.0,\"growthTrend\":\"stable\",\"vacancies\":0}\n" +
            "  }\n" +
            "}\n" +
            "\"contractRate\" is DAY RATES (not annual), for freelance/interim/contract work in this career — " +
            "only include it if that's actually a normal way this career is engaged (e.g. IT contractors, " +
            "interim managers, locums); return null for careers that are essentially permanent-only (e.g. " +
            "Nurse, Football Manager, Teacher).\n" +
            "Use current realistic figures as of " + today + ".";

        var response = await CallGptAsync(prompt, log);
        var node = JsonNode.Parse(response)!;

        var salary       = node["salary"]!.Deserialize<SalaryData>(_json)!;
        var contractRate = node["contractRate"] is JsonNode crNode ? crNode.Deserialize<ContractRateData>(_json) : null;
        var workforce    = node["workforce"]!.Deserialize<WorkforceData>(_json)!;

        return (salary, contractRate, workforce, timestamp);
    }

    // ── Full enrichment (new or low-confidence careers) ─────────────────────────

    public async Task<CareerDocument?> EnrichCareerAsync(string title, string category, string subcategory, ILogger log)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'");
        var id    = title.ToLowerInvariant()
                         .Replace(' ', '-')
                         .Replace("/", "-")
                         .Replace("'", "");

        var prompt =
            "Generate a complete career profile for: " + title + " (" + category + " / " + subcategory + ")\n" +
            "Return a JSON object with this exact schema (no markdown):\n" +
            "{\n" +
            "  \"id\": \"" + id + "\",\n" +
            "  \"title\": \"" + title + "\",\n" +
            "  \"aliases\": [],\n" +
            "  \"category\": \"" + category + "\",\n" +
            "  \"subcategory\": \"" + subcategory + "\",\n" +
            "  \"tags\": [],\n" +
            "  \"soc_uk\": null,\n" +
            "  \"onet_us\": null,\n" +
            "  \"salary\": {\n" +
            "    \"uk\": {\"starting\":0,\"mid\":0,\"senior\":0,\"expert\":0,\"currency\":\"GBP\"},\n" +
            "    \"us\": {\"starting\":0,\"mid\":0,\"senior\":0,\"expert\":0,\"currency\":\"USD\"}\n" +
            "  },\n" +
            "  \"contractRate\": null OR {\n" +
            "    \"uk\": {\"junior\":0,\"mid\":0,\"senior\":0,\"expert\":0,\"currency\":\"GBP\"},\n" +
            "    \"us\": {\"junior\":0,\"mid\":0,\"senior\":0,\"expert\":0,\"currency\":\"USD\"}\n" +
            "  },\n" +
            "  \"workforce\": {\n" +
            "    \"uk\": {\"employed\":0,\"studying\":0,\"growthPct5yr\":0.0,\"growthTrend\":\"stable\",\"vacancies\":0},\n" +
            "    \"us\": {\"employed\":0,\"studying\":0,\"growthPct5yr\":0.0,\"growthTrend\":\"stable\",\"vacancies\":0}\n" +
            "  },\n" +
            "  \"demand\": {\"uk\":0,\"us\":0,\"automationRisk\":0,\"futureScore\":0,\"trend\":\"stable\"},\n" +
            "  \"lifestyle\": {\"environment\":\"Office\",\"stress\":0,\"energy\":0,\"collaboration\":0,\"remoteScore\":0,\"typicalHours\":\"9-5\"},\n" +
            "  \"identity\": {\"summary\":\"\",\"traits\":[],\"strengths\":[],\"weaknesses\":[]},\n" +
            "  \"pathway\": {\"entryRequirements\":[],\"qualifications\":[],\"skills\":[],\"timeToJunior\":\"\",\"timeToMid\":\"\",\"timeToSenior\":\"\",\"timeToExpert\":\"\",\"learningPath\":[]},\n" +
            "  \"salaryLastUpdated\": \"" + today + "\",\n" +
            "  \"lastUpdated\": \"" + timestamp + "\",\n" +
            "  \"source\": \"agent-v1\",\n" +
            "  \"confidence\": 0.85\n" +
            "}\n" +
            "All scores 0-100. Salary = realistic annual GBP/USD. " +
            "\"contractRate\" is DAY RATES (not annual) for freelance/interim/contract work — only include " +
            "it if that's actually a normal way this career is engaged (e.g. IT contractors, interim " +
            "managers, locums); return null for essentially permanent-only careers (e.g. Nurse, Teacher).";

        var response = await CallGptAsync(prompt, log);

        try
        {
            return JsonSerializer.Deserialize<CareerDocument>(response, _json);
        }
        catch (Exception ex)
        {
            log.LogWarning("Failed to deserialise career '{Title}': {Error}", title, ex.Message);
            return null;
        }
    }

    // ── Discover new careers not yet in Cosmos ─────────────────────────────────

    public async Task<List<(string Title, string Category, string Subcategory)>>
        DiscoverNewCareersAsync(ISet<string> existingTitles, List<string> thinCategories, ILogger log)
    {
        var sample  = string.Join(", ", existingTitles.Take(30));
        var thinHint = thinCategories.Count > 0
            ? $"PRIORITY: these categories are underrepresented and need more careers — {string.Join(", ", thinCategories)}. " +
              "At least 30 of your 50 suggestions must belong to these categories.\n"
            : "";
        var prompt  =
            "You are a career data expert. List 50 real job titles that exist in the UK and/or USA " +
            "that are NOT in this existing database of " + existingTitles.Count + " careers.\n" +
            thinHint +
            "Also include: niche specialist roles, emerging tech roles, healthcare sub-specialties, " +
            "trades, creative industries, and everyday service jobs not yet covered.\n" +
            "Return JSON only: {\"careers\":[{\"title\":\"\",\"category\":\"\",\"subcategory\":\"\"}]}\n" +
            "Do not repeat titles similar to: " + sample + " ...";

        var response = await CallGptAsync(prompt, log);

        try
        {
            var node    = JsonNode.Parse(response)!;
            var careers = node["careers"]!.AsArray();
            var results = new List<(string, string, string)>();

            foreach (var item in careers)
            {
                var title    = item?["title"]?.GetValue<string>() ?? "";
                var category = item?["category"]?.GetValue<string>() ?? "General";
                var sub      = item?["subcategory"]?.GetValue<string>() ?? "";

                if (!string.IsNullOrWhiteSpace(title) && !existingTitles.Contains(title))
                    results.Add((title, category, sub));
            }

            return results;
        }
        catch (Exception ex)
        {
            log.LogWarning("Discovery parse failed: {Error}", ex.Message);
            return [];
        }
    }

    // ── Missing-report plausibility check (cheap, once per distinct title) ─────

    public async Task<(bool Plausible, string Reason)> ClassifyJobTitleAsync(string title, ILogger log)
    {
        var prompt =
            "Is \"" + title + "\" a plausible real-world job title? Any country, any industry, any " +
            "seniority — including niche, trade, creative, or very specific roles. Be lenient: only say " +
            "false for obvious gibberish, keyboard mashing, test input, an insult, or plain non-job text " +
            "(e.g. a sentence, a place name with no role attached).\n" +
            "Return JSON only: {\"plausible\": true or false, \"reason\": \"<one short sentence, under 12 words>\"}";

        try
        {
            var response = await CallGptAsync(prompt, log);
            var node = JsonNode.Parse(response);
            var plausible = node?["plausible"]?.GetValue<bool>() ?? true;
            var reason = node?["reason"]?.GetValue<string>() ?? "";
            return (plausible, reason);
        }
        catch (Exception ex)
        {
            // Fail open — an AI/network hiccup should never make a real candidate report
            // vanish silently, which is the exact bug this whole feature exists to fix.
            log.LogWarning("Plausibility check failed for '{Title}': {Error}", title, ex.Message);
            return (true, "");
        }
    }

    // ── Category suggestion for the admin "Suggest" link ────────────────────────

    public async Task<(string Category, string Subcategory)> SuggestCategoryAsync(string title, IEnumerable<string> existingCategories, ILogger log)
    {
        var categoryList = string.Join(", ", existingCategories);
        var prompt =
            "Classify this job title into a career category and subcategory: \"" + title + "\"\n" +
            "Existing categories already in use in the database: " + categoryList + "\n" +
            "Strongly prefer reusing one of these existing categories if it genuinely fits — do not invent a " +
            "near-duplicate of one that already exists (e.g. \"Tech\" when \"Technology\" already exists). " +
            "Only propose a new category if the title truly doesn't fit any of the above.\n" +
            "Return JSON only: {\"category\": \"...\", \"subcategory\": \"...\"}";

        try
        {
            var response = await CallGptAsync(prompt, log);
            var node = JsonNode.Parse(response);
            var category = node?["category"]?.GetValue<string>() ?? "General";
            var subcategory = node?["subcategory"]?.GetValue<string>() ?? "";
            return (category, subcategory);
        }
        catch (Exception ex)
        {
            log.LogWarning("Category suggestion failed for '{Title}': {Error}", title, ex.Message);
            return ("General", "");
        }
    }

    // ── Shared GPT call ────────────────────────────────────────────────────────

    private async Task<string> CallGptAsync(string userPrompt, ILogger log)
    {
        var client = httpFactory.CreateClient();

        // model is rewritten to the Model Router's deployment name by ai-proxy itself —
        // sent as "gpt-4o-mini" here only for consistency with every other caller of this
        // endpoint (aiScoring.ts etc.), none of which need to change what they send either.
        var body = JsonSerializer.Serialize(new
        {
            model = "gpt-4o-mini",
            temperature = 0.2,
            response_format = new { type = "json_object" },
            messages = new[]
            {
                new { role = "system", content = "You are a career data expert. Return valid JSON only." },
                new { role = "user",   content = userPrompt }
            }
        });

        var response = await client.PostAsync(
            $"{_explainApiUrl}/api/ai-proxy",
            new StringContent(body, Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            log.LogError("ai-proxy {Status}: {Error}", response.StatusCode, err);
            throw new HttpRequestException($"ai-proxy {response.StatusCode}");
        }

        var json = await response.Content.ReadAsStringAsync();
        var node = JsonNode.Parse(json)!;
        return node["choices"]![0]!["message"]!["content"]!.GetValue<string>();
    }
}
