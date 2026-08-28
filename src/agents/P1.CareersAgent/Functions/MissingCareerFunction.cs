using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using P1.CareersAgent.Services;

namespace P1.CareersAgent.Functions;

// Report/list/resolve missing career titles. Report stays Anonymous — it's called from
// the public candidate intake screen (careersApi.ts's reportMissingCareerTitle, fire-and-
// forget) whenever someone types a job title with no database match. List/status-update
// are admin actions, so they require a function key — Explain.Api's /api/admin/careers
// endpoints hold that key server-side and are the only intended caller, matching this
// codebase's rule that no secret (including a Functions key) ships to a browser bundle.
public class MissingCareerFunction(MissingCareerReportService reports)
{
    private static readonly JsonSerializerOptions _json = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [Function("ReportMissingCareer")]
    public async Task<HttpResponseData> Report(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "careers/report-missing")] HttpRequestData req,
        FunctionContext context)
    {
        var logger = context.GetLogger<MissingCareerFunction>();
        ReportMissingRequest? body;
        try
        {
            body = await JsonSerializer.DeserializeAsync<ReportMissingRequest>(req.Body, _json);
        }
        catch (JsonException)
        {
            return await BadRequest(req, "Invalid JSON body.");
        }

        var title = body?.Title?.Trim() ?? string.Empty;
        if (title.Length < 2)
        {
            return await BadRequest(req, "title is required.");
        }

        var source = string.IsNullOrWhiteSpace(body?.Source) ? "unknown" : body!.Source;
        await reports.ReportAsync(title, source);
        logger.LogInformation("Missing career reported: {Title} (source: {Source})", title, source);

        return req.CreateResponse(HttpStatusCode.Accepted);
    }

    [Function("ListMissingCareers")]
    public async Task<HttpResponseData> List(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "careers/missing-reports")] HttpRequestData req,
        FunctionContext context)
    {
        var status = req.Query["status"];
        var data = await reports.ListAsync(string.IsNullOrWhiteSpace(status) ? null : status);
        return await OkJson(req, data);
    }

    [Function("UpdateMissingCareerStatus")]
    public async Task<HttpResponseData> UpdateStatus(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "careers/missing-reports/{id}/status")] HttpRequestData req,
        FunctionContext context, string id)
    {
        UpdateStatusRequest? body;
        try
        {
            body = await JsonSerializer.DeserializeAsync<UpdateStatusRequest>(req.Body, _json);
        }
        catch (JsonException)
        {
            return await BadRequest(req, "Invalid JSON body.");
        }

        if (body?.Status is not ("pending" or "resolved" or "dismissed"))
        {
            return await BadRequest(req, "status must be one of: pending, resolved, dismissed.");
        }

        var found = await reports.UpdateStatusAsync(id, body.Status);
        if (!found)
        {
            return req.CreateResponse(HttpStatusCode.NotFound);
        }

        return req.CreateResponse(HttpStatusCode.NoContent);
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

    private record ReportMissingRequest(string? Title, string? Source, string? ReportedAt);
    private record UpdateStatusRequest(string Status);
}
