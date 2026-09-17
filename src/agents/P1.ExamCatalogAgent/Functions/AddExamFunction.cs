using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using P1.ExamCatalogAgent.Models;
using P1.ExamCatalogAgent.Services;

namespace P1.ExamCatalogAgent.Functions;

// Admin-only add/edit actions. Function-key gated like MissingExamFunction's admin endpoints;
// Explain.Api's /api/admin/exam-catalog proxy is the only intended caller. Unlike
// AddCareerFunction.cs, there's no AI enrichment call here yet (Phase 2 adds one) — the caller
// supplies the full record directly, since exam/cert domain breakdowns and pass marks need a
// real source (an official syllabus page), not an AI guess.
public class AddExamFunction(CosmosExamCatalogService cosmos)
{
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [Function("AddExam")]
    public async Task<HttpResponseData> Add(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "examcatalog/add")] HttpRequestData req,
        FunctionContext context)
    {
        var log = context.GetLogger<AddExamFunction>();
        AddRequest? body;
        try
        {
            body = await JsonSerializer.DeserializeAsync<AddRequest>(req.Body, _json);
        }
        catch (JsonException)
        {
            return await BadRequest(req, "Invalid JSON body.");
        }

        var name = body?.Name?.Trim() ?? string.Empty;
        var category = body?.Category?.Trim() ?? string.Empty;
        if (name.Length < 2) return await BadRequest(req, "name is required.");
        if (category.Length < 2) return await BadRequest(req, "category is required.");

        var entry = new ExamCatalogEntry
        {
            Id = Guid.NewGuid().ToString(),
            Name = name,
            Category = category,
            Vendor = body?.Vendor?.Trim() ?? "",
            ExamCode = body?.ExamCode?.Trim() ?? "",
            Aliases = body?.Aliases ?? [],
            Domains = body?.Domains?.Select(d => new DomainWeight { Name = d.Name, WeightPct = d.WeightPct }).ToList() ?? [],
            PassScore = body?.PassScore ?? 0,
            MaxScore = body?.MaxScore ?? 0,
            Source = "admin",
            CreatedAt = DateTime.UtcNow.ToString("o"),
        };

        await cosmos.UpsertAsync(entry);
        log.LogInformation("Exam catalog entry added: {Name} [{Category}]", entry.Name, entry.Category);

        return await OkJson(req, entry);
    }

    // Keeps the same document id even when the name changes (id is an internal key, never shown
    // to candidates — search matches on name/aliases/examCode, not id). Category changes need a
    // real move since it's the Cosmos partition key: delete under the old partition, upsert under
    // the new one, same id either way — mirrors EditCareer's exact reasoning.
    [Function("EditExam")]
    public async Task<HttpResponseData> Edit(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "examcatalog/{id}/edit")] HttpRequestData req,
        FunctionContext context, string id)
    {
        var log = context.GetLogger<AddExamFunction>();
        EditRequest? body;
        try
        {
            body = await JsonSerializer.DeserializeAsync<EditRequest>(req.Body, _json);
        }
        catch (JsonException)
        {
            return await BadRequest(req, "Invalid JSON body.");
        }

        var existing = await cosmos.GetByIdAsync(id);
        if (existing is null)
        {
            return req.CreateResponse(HttpStatusCode.NotFound);
        }

        if (!string.IsNullOrWhiteSpace(body?.Name)) existing.Name = body.Name.Trim();

        var newCategory = body?.Category?.Trim();
        var oldCategory = existing.Category;
        var categoryChanged = !string.IsNullOrWhiteSpace(newCategory) && newCategory != oldCategory;
        if (!string.IsNullOrWhiteSpace(newCategory)) existing.Category = newCategory;

        if (body?.Vendor is not null) existing.Vendor = body.Vendor.Trim();
        if (body?.ExamCode is not null) existing.ExamCode = body.ExamCode.Trim();
        if (body?.Aliases is not null) existing.Aliases = body.Aliases;
        if (body?.Domains is not null) existing.Domains = body.Domains.Select(d => new DomainWeight { Name = d.Name, WeightPct = d.WeightPct }).ToList();
        if (body?.PassScore is not null) existing.PassScore = body.PassScore.Value;
        if (body?.MaxScore is not null) existing.MaxScore = body.MaxScore.Value;

        if (categoryChanged)
        {
            await cosmos.DeleteAsync(id, oldCategory);
        }
        await cosmos.UpsertAsync(existing);

        log.LogInformation("Exam catalog entry edited: {Id} → {Name} [{Category}]", id, existing.Name, existing.Category);
        return await OkJson(req, existing);
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

    private record DomainWeightRequest(string Name, int WeightPct);
    private record AddRequest(string? Name, string? Category, string? Vendor, string? ExamCode, List<string>? Aliases, List<DomainWeightRequest>? Domains, int? PassScore, int? MaxScore);
    private record EditRequest(string? Name, string? Category, string? Vendor, string? ExamCode, List<string>? Aliases, List<DomainWeightRequest>? Domains, int? PassScore, int? MaxScore);
}
