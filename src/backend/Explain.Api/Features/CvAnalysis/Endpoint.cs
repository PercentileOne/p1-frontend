using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.CvAnalysis;

/// <summary>
/// CV/Salary Analyzer (Francis, 2026-09-18) — upload a CV, get back which real roles it's
/// suited for, a skills strength breakdown, and a genuinely AI-written spoken walkthrough
/// covering strengths, weaknesses, and any real inconsistencies found. This endpoint only
/// suggests role TITLES — it deliberately never invents salary figures itself; the frontend
/// matches each suggested title against the real, already-live Careers Agent database
/// (careersApi.ts's own searchCareers, same anonymous-from-the-browser call CareersPanel.tsx
/// already makes) so every salary number shown is real, not an AI guess.
///
/// Same backend-orchestrated Model Router pattern CareerCoach/Endpoint.cs already established
/// (see that file's own top comment for the full reasoning) — this makes a real, uncached AI
/// call per submission, and the product-page version of this feature is anonymous/public, so a
/// frontend-calls-ai-proxy-directly pattern would have no way to enforce a spend cap.
/// </summary>
public static class Endpoint
{
    // Same "generous enough for genuine use, tight enough to bound worst-case spend" reasoning
    // as CareerCoach's own DailyMessageCap. A real signed-in account is a meaningfully higher
    // bar against abuse than a bare IP address, hence the split.
    private const int DailyCapAuthenticated = 20;
    private const int DailyCapAnonymous = 50; // TEMP (2026-09-18): raised to verify the new "What's Hot" section — revert to 5 once confirmed.

    public static void Map(WebApplication app)
    {
        // Deliberately no .RequireAuthorization() — this must work for the anonymous
        // product-page version too. When a valid JWT IS present (candidate/recruiter portal),
        // the auth middleware still populates ctx.User even without RequireAuthorization
        // forcing it, so FindFirst("sub") below reads a real identity whenever there is one.
        app.MapPost("/api/cv-analysis", async (
            Request req, HttpContext ctx, CosmosService cosmos,
            IHttpClientFactory factory, IConfiguration config, ILogger<Program> logger) =>
        {
            if (string.IsNullOrWhiteSpace(req.CvText) || req.CvText.Trim().Length < 100)
                return Results.BadRequest(new { error = "That doesn't look like a full CV — please upload a real CV file." });

            var candidateId = ctx.User.FindFirst("sub")?.Value;
            var isAuthenticated = !string.IsNullOrEmpty(candidateId);
            // Azure App Service's ForwardedHeaders config (Program.cs) already resolves this to
            // the real visitor IP, not the front-end proxy's — same pattern Login/Endpoint.cs
            // and Events/Endpoint.cs already use for the same reason.
            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var rateLimitKey = isAuthenticated ? candidateId! : $"ip:{ip}";
            var cap = isAuthenticated ? DailyCapAuthenticated : DailyCapAnonymous;

            var (allowed, _) = await CheckAndIncrementDailyUsageAsync(rateLimitKey, cap, cosmos);
            if (!allowed) return CappedResponse(cap);

            AnalysisResult result;
            try { result = await CallAnalysisModelAsync(req.CvText.Trim(), req.Audience ?? "self", factory, config); }
            catch (Exception ex)
            {
                logger.LogError(ex, "CV Analysis: model call failed");
                // { error } shape, not Results.Problem's ProblemDetails { detail } shape — the
                // frontend (cvAnalysisApi.ts) only reads .error, matching the BadRequest above.
                return Results.Json(new { error = "CV analysis is temporarily unavailable — please try again in a moment." }, statusCode: 502);
            }

            return Results.Ok(result);
        });
    }

    private static IResult CappedResponse(int cap) =>
        Results.Json(new
        {
            capped = true,
            message = $"You've reached today's limit ({cap} {(cap == DailyCapAnonymous ? "free " : "")}analyses) — come back tomorrow{(cap == DailyCapAnonymous ? ", or sign in for a higher daily limit" : "")}.",
        }, statusCode: (int)HttpStatusCode.TooManyRequests);

    // Same atomic-in-the-common-case increment CareerCoach/Endpoint.cs's own
    // CheckAndIncrementDailyUsageAsync already uses — see that file's comment for the full
    // reasoning on the Conflict-retry fallback.
    private static async Task<(bool allowed, int count)> CheckAndIncrementDailyUsageAsync(string key, int cap, CosmosService cosmos)
    {
        var container = cosmos.GetContainer("cvAnalysisUsage");
        var docId = $"{key}:{DateTimeOffset.UtcNow:yyyy-MM-dd}";

        try
        {
            var patched = await container.PatchItemAsync<UsageDoc>(
                docId,
                new PartitionKey(key),
                [PatchOperation.Increment("/count", 1)]);
            var count = patched.Resource.count;
            return (count <= cap, count);
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            try
            {
                await container.CreateItemAsync(new UsageDoc(docId, key, 1), new PartitionKey(key));
                return (true, 1);
            }
            catch (CosmosException createEx) when (createEx.StatusCode == HttpStatusCode.Conflict)
            {
                var patched = await container.PatchItemAsync<UsageDoc>(
                    docId,
                    new PartitionKey(key),
                    [PatchOperation.Increment("/count", 1)]);
                return (patched.Resource.count <= cap, patched.Resource.count);
            }
        }
    }

    private static async Task<AnalysisResult> CallAnalysisModelAsync(string cvText, string audience, IHttpClientFactory factory, IConfiguration config)
    {
        var apiKey = config["ModelRouter:ApiKey"] ?? throw new InvalidOperationException("ModelRouter:ApiKey not configured");
        var endpoint = config["ModelRouter:Endpoint"] ?? throw new InvalidOperationException("ModelRouter:Endpoint not configured");

        // "candidate" = a recruiter analysing someone ELSE's CV (Features/CvAnalysis is shared
        // by all three surfaces — candidate portal, recruiter portal, and the public product
        // page — recruiter-portal is the only caller that ever sends this). Third-person,
        // hiring-fit framing vs. the default second-person, coaching framing everyone else gets.
        var audienceFraming = audience == "candidate"
            ? "You are analysing this CV ON BEHALF OF A RECRUITER who is evaluating whether to put this candidate forward for roles. Write the narrative in the THIRD PERSON (\"This candidate...\", \"Their experience shows...\"), framed as a hiring-fit assessment — call out anything that would matter to a hiring decision, including weaknesses as genuine hiring-risk considerations, not just gentle self-improvement tips."
            : "You are analysing this CV directly FOR THE PERSON WHO WROTE IT. Write the narrative in the SECOND PERSON (\"You've got...\", \"Your experience shows...\"), warm and encouraging but honest — like a good career coach, not a corporate reviewer.";

        var systemPrompt = $@"You are an expert, genuinely intelligent CV analyst for TheInterviewChair.com. {audienceFraming}

CRITICAL RULES:
- Only report strengths, weaknesses, and inconsistencies that are ACTUALLY PRESENT in the CV text below — never invent one to seem thorough. An inconsistency must be something a sharp human reviewer would genuinely notice (an unexplained employment gap, a seniority claim that doesn't match the years described, a skill claimed with more years than the technology has plausibly existed, mismatched dates). If there are genuinely none, return an empty array — don't stretch to find one.
- Suggested role titles must be phrased the way real job boards phrase them (e.g. ""Senior Backend Engineer"", not ""someone who codes""), since they get matched against a real careers database afterward — vague or invented titles won't match anything real.
- Never invent salary figures yourself — that is handled separately, from real data, after this call returns. Just suggest the roles.
- Return ONLY valid JSON — no markdown, no explanation.";

        var userPrompt = $@"Analyse this CV:

{cvText[..Math.Min(cvText.Length, 6000)]}

Return this exact JSON:
{{
  ""skills"": [ {{ ""name"": ""..."", ""level"": <1-10 integer, your honest estimate of proficiency/seniority in this skill from the CV's own evidence>, ""yearsNote"": ""short note, e.g. '10 years' or 'Recently learned'"" }} ],
  ""suggestedRoles"": [""Real job-board-style title"", ""...""],
  ""strengths"": [""genuine strength, specific to this CV""],
  ""weaknesses"": [""genuine gap or weakness, specific to this CV""],
  ""inconsistencies"": [""only if genuinely present""],
  ""narrativeScript"": ""A warm, natural, SPOKEN-ALOUD walkthrough (150-250 words) covering the strengths, weaknesses, and inconsistencies above in flowing prose — no bullet points, no lists, exactly how a real career coach would talk through someone's CV out loud.""
}}

List 6-10 skills (a genuine mix, not padded to hit a number), 5-8 suggested role titles, 2-4 strengths, 1-3 weaknesses, 0-3 inconsistencies (genuinely only if present).";

        var body = JsonSerializer.Serialize(new
        {
            model = "model-router",
            temperature = 0.6,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt },
            },
        });

        var client = factory.CreateClient();
        using var msg = new HttpRequestMessage(HttpMethod.Post, $"{endpoint.TrimEnd('/')}/openai/v1/chat/completions");
        msg.Headers.Add("api-key", apiKey);
        msg.Content = new StringContent(body, Encoding.UTF8, "application/json");

        using var resp = await client.SendAsync(msg);
        var responseBody = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"Model Router returned {resp.StatusCode}: {responseBody}");

        using var doc = JsonDocument.Parse(responseBody);
        var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString()
            ?? throw new InvalidOperationException("Empty model response");

        return JsonSerializer.Deserialize<AnalysisResult>(content, JsonOpts)
            ?? throw new InvalidOperationException("Failed to deserialise analysis response");
    }

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };
}

public record Request(string CvText, string? Audience);

public record SkillLevel(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("level")] int Level,
    [property: JsonPropertyName("yearsNote")] string? YearsNote);

public record AnalysisResult(
    [property: JsonPropertyName("skills")] List<SkillLevel> Skills,
    [property: JsonPropertyName("suggestedRoles")] List<string> SuggestedRoles,
    [property: JsonPropertyName("strengths")] List<string> Strengths,
    [property: JsonPropertyName("weaknesses")] List<string> Weaknesses,
    [property: JsonPropertyName("inconsistencies")] List<string> Inconsistencies,
    [property: JsonPropertyName("narrativeScript")] string NarrativeScript);

public record UsageDoc(string id, string rateLimitKey, int count);
