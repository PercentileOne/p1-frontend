using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using P1.ExamCatalogAgent.Services;
using System.Net;
using System.Text.Json;

namespace P1.ExamCatalogAgent.Functions;

public class ExamCatalogSearchFunction(CosmosExamCatalogService cosmos)
{
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    // GET /api/examcatalog/search?q=azure&category=certification&top=12
    [Function("ExamCatalogSearch")]
    public async Task<HttpResponseData> Search(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "examcatalog/search")] HttpRequestData req,
        FunctionContext context)
    {
        var log = context.GetLogger<ExamCatalogSearchFunction>();
        var q = req.Query["q"] ?? string.Empty;

        if (q.Length < 2)
            return await BadRequest(req, "Query must be at least 2 characters.");

        var category = req.Query["category"];
        int.TryParse(req.Query["top"], out var top);
        if (top <= 0) top = 12;

        log.LogInformation("Exam catalog search: q={Q} category={Category} top={Top}", q, category, top);

        var results = await cosmos.SearchAsync(q, category, top);
        return await OkJson(req, results);
    }

    // GET /api/examcatalog/categories — powers the intake picker's category dropdown, so a
    // brand-new category (Francis's own example: "XYZ Test") shows up the moment one entry
    // exists in it, no frontend deploy needed.
    [Function("ExamCatalogCategories")]
    public async Task<HttpResponseData> Categories(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "examcatalog/categories")] HttpRequestData req,
        FunctionContext context)
    {
        var log = context.GetLogger<ExamCatalogSearchFunction>();
        log.LogInformation("Fetching exam catalog categories");

        var results = await cosmos.CategoriesAsync();
        return await OkJson(req, results);
    }

    // GET /api/examcatalog/entry/{id} — full record, including domains/passScore/maxScore, which
    // search-result summaries don't need to be trimmed for. CertExamRoomPage.tsx needs this to
    // generate questions and score the attempt. Deliberately NOT a bare "examcatalog/{id}" route
    // — keeps it unambiguous alongside the other literal-first-segment routes under examcatalog/
    // (search, categories, add, report-missing) rather than relying on routing precedence rules.
    [Function("ExamCatalogById")]
    public async Task<HttpResponseData> GetById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "examcatalog/entry/{id}")] HttpRequestData req,
        FunctionContext context, string id)
    {
        var entry = await cosmos.GetByIdAsync(id);
        if (entry is null) return req.CreateResponse(HttpStatusCode.NotFound);
        return await OkJson(req, entry);
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
}
