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
    private const int DailyCapAnonymous = 5;
    // Share links need to point at the portal the record was actually saved from — a candidate
    // sharing their own "What Am I Worth?" analysis needs a candidate.theinterviewchair.com
    // link, not a recruiter one. Domain per Alerts/Endpoint.cs's own recruiter-link convention
    // and Interviews/Endpoint.cs's own ShareBaseUrl for the candidate side.
    private const string RecruiterPortalUrl = "https://recruiter.interviewme.global";
    private const string CandidatePortalUrl = "https://candidate.theinterviewchair.com";

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

            // TEMP (Francis, 2026-09-18): cap enforcement disabled while he does heavy manual
            // testing — still incrementing the usage counter below so the history isn't lost,
            // just not blocking on it. Restore by uncommenting the line below.
            var (allowed, _) = await CheckAndIncrementDailyUsageAsync(rateLimitKey, cap, cosmos);
            _ = allowed;
            // if (!allowed) return CappedResponse(cap);

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

        // POST /api/cv-analysis/history — explicit "Save to List" action from the recruiter
        // portal (Francis, 2026-09-18): the live analysis itself is never persisted automatically
        // — only when a recruiter reviews it and decides it's worth keeping. Body carries the
        // already-computed AnalysisResult + roleMatches (the frontend already has both from the
        // live call, no need to redo the Model Router or Careers Agent calls here).
        app.MapPost("/api/cv-analysis/history", async (SaveHistoryRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var ownerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Results.Unauthorized();

            var record = new CvAnalysisHistoryRecord(
                Guid.NewGuid().ToString(),
                ownerId,
                req.CandidateName,
                DateTimeOffset.UtcNow.ToString("O"),
                req.Analysis,
                req.RoleMatches,
                portal: req.Portal == "candidate" ? "candidate" : "recruiter");

            var container = cosmos.GetContainer("cvAnalysisHistory");
            await container.CreateItemAsync(record, new PartitionKey(ownerId));
            return Results.Ok(record);
        }).RequireAuthorization();

        // GET /api/cv-analysis/history — every saved analysis for the current recruiter, newest
        // first. Same shape as Interviews/Endpoint.cs's GET /api/interviews (query-by-partition,
        // full records — volume here is nowhere near enough to warrant a lightweight-summary
        // projection like that endpoint uses).
        app.MapGet("/api/cv-analysis/history", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var ownerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("cvAnalysisHistory");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.ownerId = @oid")
                .WithParameter("@oid", ownerId);
            var records = new List<CvAnalysisHistoryRecord>();
            using var feed = container.GetItemQueryIterator<CvAnalysisHistoryRecord>(
                query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(ownerId) });
            while (feed.HasMoreResults)
                records.AddRange(await feed.ReadNextAsync());

            return Results.Ok(records.OrderByDescending(r => r.createdAt));
        }).RequireAuthorization();

        // DELETE /api/cv-analysis/history/{id} — DeleteItemAsync scoped to the caller's own
        // partition (ownerId from the JWT, not a route param) means there's no separate ownership
        // check to get wrong, same as CareerCoach/Endpoint.cs's thread delete.
        app.MapDelete("/api/cv-analysis/history/{id}", async (string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var ownerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("cvAnalysisHistory");
            try
            {
                await container.DeleteItemAsync<CvAnalysisHistoryRecord>(id, new PartitionKey(ownerId));
                return Results.Ok();
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }
        }).RequireAuthorization();

        // POST /api/cv-analysis/history/{id}/share — "send this to a colleague in another
        // department" (Francis, 2026-09-18): mints a public, no-login link to a saved analysis.
        // Idempotent — reuses an already-issued token rather than minting a fresh one each call,
        // same reasoning as Interviews/Endpoint.cs's own /share route (a link already handed out
        // should keep working).
        app.MapPost("/api/cv-analysis/history/{id}/share", async (string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var ownerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("cvAnalysisHistory");
            CvAnalysisHistoryRecord record;
            try { record = await container.ReadItemAsync<CvAnalysisHistoryRecord>(id, new PartitionKey(ownerId)); }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return Results.NotFound(); }

            var shareToken = record.isShared && !string.IsNullOrEmpty(record.shareToken)
                ? record.shareToken
                : GenerateShareToken();
            var updated = record with { isShared = true, shareToken = shareToken };
            await container.UpsertItemAsync(updated, new PartitionKey(ownerId));

            var portalUrl = record.portal == "candidate" ? CandidatePortalUrl : RecruiterPortalUrl;
            var shareUrl = $"{portalUrl}/shared/cv-analysis/{shareToken}";
            return Results.Ok(new { shareToken, shareUrl });
        }).RequireAuthorization();

        // POST /api/cv-analysis/history/{id}/unshare — revokes the link (keeps the token itself,
        // so re-sharing later reactivates the same link rather than minting a new one).
        app.MapPost("/api/cv-analysis/history/{id}/unshare", async (string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var ownerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("cvAnalysisHistory");
            CvAnalysisHistoryRecord record;
            try { record = await container.ReadItemAsync<CvAnalysisHistoryRecord>(id, new PartitionKey(ownerId)); }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return Results.NotFound(); }

            if (record.isShared)
                await container.UpsertItemAsync(record with { isShared = false }, new PartitionKey(ownerId));
            return Results.Ok(new { isShared = false });
        }).RequireAuthorization();

        // GET /api/cv-analysis/history/shared/{shareToken} — public view, no login. Cross-partition
        // query by token (same shape as Interviews/Endpoint.cs's own GET .../shared/{shareToken} —
        // there's no ownerId to scope by from a bare token).
        app.MapGet("/api/cv-analysis/history/shared/{shareToken}", async (string shareToken, CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("cvAnalysisHistory");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.shareToken = @token AND c.isShared = true")
                .WithParameter("@token", shareToken);
            using var feed = container.GetItemQueryIterator<CvAnalysisHistoryRecord>(query);
            if (feed.HasMoreResults)
            {
                var page = await feed.ReadNextAsync();
                var record = page.FirstOrDefault();
                if (record is not null) return Results.Ok(record);
            }
            return Results.NotFound();
        }).AllowAnonymous();
    }

    // Mirrors Interviews/Endpoint.cs's own GenerateShareToken exactly.
    private static string GenerateShareToken()
    {
        const string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var bytes = System.Security.Cryptography.RandomNumberGenerator.GetBytes(10);
        return new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
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
- That careers database has broad, common titles, not every hyper-specific executive variant. For senior/niche profiles, include a genuine MIX: some specific titles that match the CV precisely, AND at least 2-3 broader, more commonly-listed equivalents (e.g. alongside ""Global Head of Equity Trading Technology"", also suggest something like ""Chief Technology Officer"" or ""Head of Technology"") — so there's a real chance of matching a broad general database even when the CV itself is extremely senior or narrow.
- Never invent salary figures yourself — that is handled separately, from real data, after this call returns. Just suggest the roles.
- Return ONLY valid JSON — no markdown, no explanation.";

        var userPrompt = $@"Analyse this CV:

{cvText[..Math.Min(cvText.Length, 6000)]}

Return this exact JSON:
{{
  ""candidateName"": ""the CV owner's full name if clearly stated in the CV, otherwise null"",
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
    [property: JsonPropertyName("candidateName")] string? CandidateName,
    [property: JsonPropertyName("skills")] List<SkillLevel> Skills,
    [property: JsonPropertyName("suggestedRoles")] List<string> SuggestedRoles,
    [property: JsonPropertyName("strengths")] List<string> Strengths,
    [property: JsonPropertyName("weaknesses")] List<string> Weaknesses,
    [property: JsonPropertyName("inconsistencies")] List<string> Inconsistencies,
    [property: JsonPropertyName("narrativeScript")] string NarrativeScript);

public record UsageDoc(string id, string rateLimitKey, int count);

// Persisted "Save to List" record (recruiter portal only) — roleMatches is a small snapshot
// (not the full live Career object) so a saved record's roles table still renders correctly even
// if the Careers Agent catalog changes later, and so viewing history never needs a fresh
// Careers Agent round trip.
public record SavedRoleMatch(
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("careerId")] string CareerId,
    [property: JsonPropertyName("careerTitle")] string CareerTitle,
    [property: JsonPropertyName("salaryUkStarting")] int SalaryUkStarting,
    [property: JsonPropertyName("salaryUkExpert")] int SalaryUkExpert);

public record SaveHistoryRequest(
    [property: JsonPropertyName("candidateName")] string? CandidateName,
    [property: JsonPropertyName("analysis")] AnalysisResult Analysis,
    [property: JsonPropertyName("roleMatches")] List<SavedRoleMatch> RoleMatches,
    // "recruiter" (default) or "candidate" — which portal this was saved from, so a share link
    // points at the right live domain. See Endpoint.cs's CandidatePortalUrl/RecruiterPortalUrl.
    [property: JsonPropertyName("portal")] string? Portal = null);

public record CvAnalysisHistoryRecord(
    string id,
    string ownerId,
    string? candidateName,
    string createdAt,
    AnalysisResult analysis,
    List<SavedRoleMatch> roleMatches,
    string portal = "recruiter",
    bool isShared = false,
    string? shareToken = null);
