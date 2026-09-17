using Explain.Api.Common;

namespace Explain.Api.Features.ExamCatalog.Admin;

/// <summary>
/// Admin-only proxy onto the exam-catalog-agent Function App's missing-exam-report queue and
/// add/edit actions (src/agents/P1.ExamCatalogAgent). Same shape as Features/Careers/Admin/
/// Endpoint.cs for the exact same reason: those endpoints require a Functions key, and this
/// proxy holds that key server-side (ExamCatalogAgent:AdminKey config) so it never ships to the
/// admin-portal browser bundle. Read-only search/categories/by-id stay Anonymous on the agent
/// itself and are called directly by the candidate portal, so they don't need a proxy here.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/admin/exam-catalog/missing-reports", async (string? status, IHttpClientFactory factory, IConfiguration config) =>
        {
            var (baseUrl, key) = GetAgentConfig(config);
            var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-functions-key", key);

            var qs = string.IsNullOrWhiteSpace(status) ? "" : $"?status={Uri.EscapeDataString(status)}";
            var res = await client.GetAsync($"{baseUrl}/examcatalog/missing-reports{qs}");
            var body = await res.Content.ReadAsStringAsync();
            return Results.Content(body, "application/json", statusCode: (int)res.StatusCode);
        })
        .WithName("ListMissingExamReports").WithTags("ExamCatalog")
        .RequireAuthorization(Permissions.ManageExamCatalog);

        app.MapPost("/api/admin/exam-catalog", async (AddExamRequest req, IHttpClientFactory factory, IConfiguration config) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name) || req.Name.Trim().Length < 2)
            {
                return Results.BadRequest(new { error = "name is required." });
            }
            if (string.IsNullOrWhiteSpace(req.Category) || req.Category.Trim().Length < 2)
            {
                return Results.BadRequest(new { error = "category is required." });
            }

            var (baseUrl, key) = GetAgentConfig(config);
            var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-functions-key", key);

            using var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new
            {
                name = req.Name.Trim(),
                category = req.Category.Trim(),
                vendor = req.Vendor?.Trim() ?? "",
                examCode = req.ExamCode?.Trim() ?? "",
                aliases = req.Aliases ?? [],
                domains = req.Domains ?? [],
                passScore = req.PassScore ?? 0,
                maxScore = req.MaxScore ?? 0,
            }), System.Text.Encoding.UTF8, "application/json");

            var res = await client.PostAsync($"{baseUrl}/examcatalog/add", content);
            var body = await res.Content.ReadAsStringAsync();
            return Results.Content(body, "application/json", statusCode: (int)res.StatusCode);
        })
        .WithName("AddExamCatalogEntry").WithTags("ExamCatalog")
        .RequireAuthorization(Permissions.ManageExamCatalog);

        app.MapPost("/api/admin/exam-catalog/{id}/edit", async (string id, EditExamRequest req, IHttpClientFactory factory, IConfiguration config) =>
        {
            var (baseUrl, key) = GetAgentConfig(config);
            var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-functions-key", key);

            using var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new
            {
                name = req.Name?.Trim(),
                category = req.Category?.Trim(),
                vendor = req.Vendor,
                examCode = req.ExamCode,
                aliases = req.Aliases,
                domains = req.Domains,
                passScore = req.PassScore,
                maxScore = req.MaxScore,
            }), System.Text.Encoding.UTF8, "application/json");

            var res = await client.PostAsync($"{baseUrl}/examcatalog/{Uri.EscapeDataString(id)}/edit", content);
            var body = await res.Content.ReadAsStringAsync();
            return Results.Content(body, "application/json", statusCode: (int)res.StatusCode);
        })
        .WithName("EditExamCatalogEntry").WithTags("ExamCatalog")
        .RequireAuthorization(Permissions.ManageExamCatalog);

        app.MapPost("/api/admin/exam-catalog/missing-reports/{id}/status", async (string id, UpdateStatusRequest req, IHttpClientFactory factory, IConfiguration config) =>
        {
            if (req.Status is not ("pending" or "resolved" or "dismissed"))
            {
                return Results.BadRequest(new { error = "status must be one of: pending, resolved, dismissed." });
            }

            var (baseUrl, key) = GetAgentConfig(config);
            var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-functions-key", key);

            using var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new { status = req.Status }),
                System.Text.Encoding.UTF8, "application/json");
            var res = await client.PostAsync($"{baseUrl}/examcatalog/missing-reports/{Uri.EscapeDataString(id)}/status", content);

            if (res.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return Results.NotFound(new { error = "Report not found." });
            }
            return Results.StatusCode((int)res.StatusCode);
        })
        .WithName("UpdateMissingExamReportStatus").WithTags("ExamCatalog")
        .RequireAuthorization(Permissions.ManageExamCatalog);
    }

    private static (string BaseUrl, string Key) GetAgentConfig(IConfiguration config)
    {
        var baseUrl = config["ExamCatalogAgent:BaseUrl"]?.TrimEnd('/')
            ?? throw new InvalidOperationException("ExamCatalogAgent:BaseUrl not configured");
        var key = config["ExamCatalogAgent:AdminKey"]
            ?? throw new InvalidOperationException("ExamCatalogAgent:AdminKey not configured");
        return (baseUrl, key);
    }

    public record UpdateStatusRequest(string Status);
    public record DomainWeight(string Name, int WeightPct);
    public record AddExamRequest(string Name, string Category, string? Vendor, string? ExamCode, List<string>? Aliases, List<DomainWeight>? Domains, int? PassScore, int? MaxScore);
    public record EditExamRequest(string? Name, string? Category, string? Vendor, string? ExamCode, List<string>? Aliases, List<DomainWeight>? Domains, int? PassScore, int? MaxScore);
}
