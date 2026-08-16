using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using P1.CareersAgent.Services;
using System.Net;
using System.Text.Json;

namespace P1.CareersAgent.Functions;

public class CareerSearchFunction(CosmosCareerService cosmos)
{
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    // GET /api/careers/search?q=plumber&top=12
    [Function("CareerSearch")]
    public async Task<HttpResponseData> Search(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "careers/search")] HttpRequestData req,
        FunctionContext context)
    {
        var log = context.GetLogger<CareerSearchFunction>();
        var q   = req.Query["q"] ?? string.Empty;

        if (q.Length < 2)
            return await BadRequest(req, "Query must be at least 2 characters.");

        int.TryParse(req.Query["top"], out var top);
        if (top <= 0) top = 12;

        log.LogInformation("Career search: q={Q} top={Top}", q, top);

        var results = await cosmos.SearchAsync(q, top);
        return await OkJson(req, results);
    }

    // GET /api/careers/by-category?category=Technology&top=20
    [Function("CareersByCategory")]
    public async Task<HttpResponseData> ByCategory(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "careers/by-category")] HttpRequestData req,
        FunctionContext context)
    {
        var log      = context.GetLogger<CareerSearchFunction>();
        var category = req.Query["category"] ?? string.Empty;

        if (string.IsNullOrWhiteSpace(category))
            return await BadRequest(req, "category parameter is required.");

        int.TryParse(req.Query["top"], out var top);
        if (top <= 0) top = 20;

        log.LogInformation("Careers by category: {Category} top={Top}", category, top);

        var results = await cosmos.GetByCategoryAsync(category, top);
        return await OkJson(req, results);
    }

    // GET /api/careers/categories
    [Function("CareerCategories")]
    public async Task<HttpResponseData> Categories(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "careers/categories")] HttpRequestData req,
        FunctionContext context)
    {
        var log = context.GetLogger<CareerSearchFunction>();
        log.LogInformation("Fetching career categories");

        var results = await cosmos.GetCategoryCountsAsync();
        return await OkJson(req, results);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static async Task<HttpResponseData> OkJson(HttpRequestData req, object data)
    {
        var res = req.CreateResponse(HttpStatusCode.OK);
        res.Headers.Add("Content-Type", "application/json");
        res.Headers.Add("Access-Control-Allow-Origin", "*");
        await res.WriteStringAsync(JsonSerializer.Serialize(data, _json));
        return res;
    }

    private static async Task<HttpResponseData> BadRequest(HttpRequestData req, string message)
    {
        var res = req.CreateResponse(HttpStatusCode.BadRequest);
        res.Headers.Add("Content-Type", "application/json");
        res.Headers.Add("Access-Control-Allow-Origin", "*");
        await res.WriteStringAsync(JsonSerializer.Serialize(new { error = message }, _json));
        return res;
    }
}
