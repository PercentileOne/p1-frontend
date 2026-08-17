using Microsoft.Extensions.Configuration;
using P1.CareersAgent.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace P1.CareersAgent.Services;

public class OpenAiEnricher(IConfiguration config, IHttpClientFactory httpFactory)
{
    private readonly string _apiKey = config["OpenAiApiKey"]
        ?? throw new InvalidOperationException("OpenAiApiKey not configured");

    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    // ── Salary-only update (cheap, weekly) ─────────────────────────────────────

    public async Task<(SalaryData salary, WorkforceData workforce, string updatedDate)>
        UpdateSalaryAsync(CareerDocument career, ILogger log)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var prompt =
            "Update salary and workforce data for: " + career.Title + " (" + career.Category + ")\n" +
            "Return JSON only, no markdown:\n" +
            "{\n" +
            "  \"salary\": {\n" +
            "    \"uk\": {\"starting\":0,\"mid\":0,\"senior\":0,\"expert\":0,\"currency\":\"GBP\"},\n" +
            "    \"us\": {\"starting\":0,\"mid\":0,\"senior\":0,\"expert\":0,\"currency\":\"USD\"}\n" +
            "  },\n" +
            "  \"workforce\": {\n" +
            "    \"uk\": {\"employed\":0,\"studying\":0,\"growthPct5yr\":0.0,\"growthTrend\":\"stable\",\"vacancies\":0},\n" +
            "    \"us\": {\"employed\":0,\"studying\":0,\"growthPct5yr\":0.0,\"growthTrend\":\"stable\",\"vacancies\":0}\n" +
            "  }\n" +
            "}\n" +
            "Use current realistic figures as of " + today + ".";

        var response = await CallGptAsync(prompt, log);
        var node = JsonNode.Parse(response)!;

        var salary    = node["salary"]!.Deserialize<SalaryData>(_json)!;
        var workforce = node["workforce"]!.Deserialize<WorkforceData>(_json)!;

        return (salary, workforce, today);
    }

    // ── Full enrichment (new or low-confidence careers) ─────────────────────────

    public async Task<CareerDocument?> EnrichCareerAsync(string title, string category, string subcategory, ILogger log)
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
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
            "  \"workforce\": {\n" +
            "    \"uk\": {\"employed\":0,\"studying\":0,\"growthPct5yr\":0.0,\"growthTrend\":\"stable\",\"vacancies\":0},\n" +
            "    \"us\": {\"employed\":0,\"studying\":0,\"growthPct5yr\":0.0,\"growthTrend\":\"stable\",\"vacancies\":0}\n" +
            "  },\n" +
            "  \"demand\": {\"uk\":0,\"us\":0,\"automationRisk\":0,\"futureScore\":0,\"trend\":\"stable\"},\n" +
            "  \"lifestyle\": {\"environment\":\"Office\",\"stress\":0,\"energy\":0,\"collaboration\":0,\"remoteScore\":0,\"typicalHours\":\"9-5\"},\n" +
            "  \"identity\": {\"summary\":\"\",\"traits\":[],\"strengths\":[],\"weaknesses\":[]},\n" +
            "  \"pathway\": {\"entryRequirements\":[],\"qualifications\":[],\"skills\":[],\"timeToJunior\":\"\",\"timeToMid\":\"\",\"timeToSenior\":\"\",\"timeToExpert\":\"\",\"learningPath\":[]},\n" +
            "  \"salaryLastUpdated\": \"" + today + "\",\n" +
            "  \"lastUpdated\": \"" + today + "\",\n" +
            "  \"source\": \"agent-v1\",\n" +
            "  \"confidence\": 0.85\n" +
            "}\n" +
            "All scores 0-100. Salary = realistic annual GBP/USD.";

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

    // ── Shared GPT call ────────────────────────────────────────────────────────

    private async Task<string> CallGptAsync(string userPrompt, ILogger log)
    {
        var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _apiKey);

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
            "https://api.openai.com/v1/chat/completions",
            new StringContent(body, Encoding.UTF8, "application/json"));

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            log.LogError("OpenAI {Status}: {Error}", response.StatusCode, err);
            throw new HttpRequestException($"OpenAI {response.StatusCode}");
        }

        var json = await response.Content.ReadAsStringAsync();
        var node = JsonNode.Parse(json)!;
        return node["choices"]![0]!["message"]!["content"]!.GetValue<string>();
    }
}
