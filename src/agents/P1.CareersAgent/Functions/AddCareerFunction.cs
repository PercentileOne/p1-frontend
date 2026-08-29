using System.Linq;
using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using P1.CareersAgent.Services;

namespace P1.CareersAgent.Functions;

// Admin-only "New Career" action — same enrichment call MonthlyDiscoveryFunction uses for
// the automated sweep, just triggered on demand for one title instead of 50 at a time.
// Function-key gated like MissingCareerFunction's admin endpoints; Explain.Api's
// /api/admin/careers proxy is the only intended caller.
public class AddCareerFunction(CosmosCareerService cosmos, OpenAiEnricher enricher)
{
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [Function("AddCareer")]
    public async Task<HttpResponseData> Add(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "careers/add")] HttpRequestData req,
        FunctionContext context)
    {
        var log = context.GetLogger<AddCareerFunction>();
        AddRequest? body;
        try
        {
            body = await JsonSerializer.DeserializeAsync<AddRequest>(req.Body, _json);
        }
        catch (JsonException)
        {
            return await BadRequest(req, "Invalid JSON body.");
        }

        var title = body?.Title?.Trim() ?? string.Empty;
        var category = body?.Category?.Trim() ?? string.Empty;
        var subcategory = body?.Subcategory?.Trim() ?? string.Empty;

        if (title.Length < 2) return await BadRequest(req, "title is required.");
        if (category.Length < 2) return await BadRequest(req, "category is required.");

        log.LogInformation("Admin add career: {Title} [{Category}]", title, category);

        var career = await enricher.EnrichCareerAsync(title, category, subcategory, log);
        if (career is null)
        {
            return await BadRequest(req, "Enrichment failed — could not generate a career profile for that title.");
        }

        await cosmos.UpsertAsync(career);
        log.LogInformation("Career added: {Title} [{Category}]", career.Title, career.Category);

        return await OkJson(req, career);
    }

    // Admin-only "Suggest" link on the New Career / Resolve Report forms — classifies a
    // title against the categories already in use rather than letting the AI invent a
    // near-duplicate (e.g. "Tech" alongside an existing "Technology").
    [Function("SuggestCareerCategory")]
    public async Task<HttpResponseData> SuggestCategory(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "careers/suggest-category")] HttpRequestData req,
        FunctionContext context)
    {
        var log = context.GetLogger<AddCareerFunction>();
        SuggestRequest? body;
        try
        {
            body = await JsonSerializer.DeserializeAsync<SuggestRequest>(req.Body, _json);
        }
        catch (JsonException)
        {
            return await BadRequest(req, "Invalid JSON body.");
        }

        var title = body?.Title?.Trim() ?? string.Empty;
        if (title.Length < 2) return await BadRequest(req, "title is required.");

        var existingCategories = await cosmos.GetCategoryCountsAsync();
        var (category, subcategory) = await enricher.SuggestCategoryAsync(title, existingCategories.Select(c => c.Category), log);

        return await OkJson(req, new { category, subcategory });
    }

    private static async Task<HttpResponseData> OkJson(HttpRequestData req, object data)
    {
        var res = req.CreateResponse(HttpStatusCode.OK);
        res.Headers.Add("Content-Type", "application/json");
        await res.WriteStringAsync(JsonSerializer.Serialize(data, _json));
        return res;
    }

    private static async Task<HttpResponseData> BadRequest(HttpRequestData req, string message)
    {
        var res = req.CreateResponse(HttpStatusCode.BadRequest);
        res.Headers.Add("Content-Type", "application/json");
        await res.WriteStringAsync(JsonSerializer.Serialize(new { error = message }, _json));
        return res;
    }

    private record AddRequest(string? Title, string? Category, string? Subcategory);
    private record SuggestRequest(string? Title);
}
