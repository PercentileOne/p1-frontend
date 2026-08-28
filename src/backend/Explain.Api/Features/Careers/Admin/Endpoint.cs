using Explain.Api.Common;

namespace Explain.Api.Features.Careers.Admin;

/// <summary>
/// Admin-only proxy onto the careers-agent Function App's missing-career-report queue
/// (src/agents/P1.CareersAgent — MissingCareerFunction). Those two endpoints require a
/// Functions key; this proxy holds that key server-side (CareersAgent:AdminKey config)
/// so it never ships to the admin-portal browser bundle — same rule as every other
/// third-party/internal secret in this codebase. Read-only career search/by-category/
/// categories stay Anonymous on the agent itself and are called directly by every portal
/// (including admin-portal), so they don't need a proxy here.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/admin/careers/missing-reports", async (string? status, IHttpClientFactory factory, IConfiguration config) =>
        {
            var (baseUrl, key) = GetAgentConfig(config);
            var client = factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-functions-key", key);

            var qs = string.IsNullOrWhiteSpace(status) ? "" : $"?status={Uri.EscapeDataString(status)}";
            var res = await client.GetAsync($"{baseUrl}/careers/missing-reports{qs}");
            var body = await res.Content.ReadAsStringAsync();
            return Results.Content(body, "application/json", statusCode: (int)res.StatusCode);
        })
        .WithName("ListMissingCareerReports").WithTags("Careers")
        .RequireAuthorization(Permissions.ManageCareers);

        app.MapPost("/api/admin/careers/missing-reports/{id}/status", async (string id, UpdateStatusRequest req, IHttpClientFactory factory, IConfiguration config) =>
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
            var res = await client.PostAsync($"{baseUrl}/careers/missing-reports/{Uri.EscapeDataString(id)}/status", content);

            if (res.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return Results.NotFound(new { error = "Report not found." });
            }
            return Results.StatusCode((int)res.StatusCode);
        })
        .WithName("UpdateMissingCareerReportStatus").WithTags("Careers")
        .RequireAuthorization(Permissions.ManageCareers);
    }

    private static (string BaseUrl, string Key) GetAgentConfig(IConfiguration config)
    {
        var baseUrl = config["CareersAgent:BaseUrl"]?.TrimEnd('/')
            ?? throw new InvalidOperationException("CareersAgent:BaseUrl not configured");
        var key = config["CareersAgent:AdminKey"]
            ?? throw new InvalidOperationException("CareersAgent:AdminKey not configured");
        return (baseUrl, key);
    }

    public record UpdateStatusRequest(string Status);
}
