using System.Linq;
using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using P1.ExamCatalogAgent.Services;

namespace P1.ExamCatalogAgent.Functions;

// Report/list/resolve missing exam/certification names. Report stays Anonymous — called from the
// public candidate picker (examCatalogApi.ts's reportMissingExam) whenever someone can't find
// what they're looking for. List/status-update are admin actions, gated by a function key —
// Explain.Api's /api/admin/exam-catalog endpoints hold that key server-side, mirroring
// MissingCareerFunction.cs's exact same reasoning.
public class MissingExamFunction(ExamCatalogReportService reports)
{
    private static readonly JsonSerializerOptions _json = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    [Function("ReportMissingExam")]
    public async Task<HttpResponseData> Report(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "examcatalog/report-missing")] HttpRequestData req,
        FunctionContext context)
    {
        var logger = context.GetLogger<MissingExamFunction>();
        ReportMissingRequest? body;
        try
        {
            body = await JsonSerializer.DeserializeAsync<ReportMissingRequest>(req.Body, _json);
        }
        catch (JsonException)
        {
            return await BadRequest(req, "Invalid JSON body.");
        }

        var name = body?.Name?.Trim() ?? string.Empty;
        if (name.Length < 2)
        {
            return await BadRequest(req, "name is required.");
        }
        if (LooksMalformed(name))
        {
            logger.LogInformation("Missing exam report rejected as malformed: {Name}", name);
            return await BadRequest(req, "name does not look like a plausible exam or certification.");
        }

        var category = string.IsNullOrWhiteSpace(body?.Category) ? "certification" : body!.Category!;
        await reports.ReportAsync(name, category);
        logger.LogInformation("Missing exam reported: {Name} [{Category}]", name, category);

        return req.CreateResponse(HttpStatusCode.Accepted);
    }

    [Function("ListMissingExamReports")]
    public async Task<HttpResponseData> List(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "examcatalog/missing-reports")] HttpRequestData req,
        FunctionContext context)
    {
        var status = req.Query["status"];
        var data = await reports.ListAsync(string.IsNullOrWhiteSpace(status) ? null : status);
        return await OkJson(req, data);
    }

    [Function("UpdateMissingExamReportStatus")]
    public async Task<HttpResponseData> UpdateStatus(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "examcatalog/missing-reports/{id}/status")] HttpRequestData req,
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

    // Same free, zero-cost gate as MissingCareerFunction.cs's LooksMalformed, adapted for
    // exam/cert names (which lean on more punctuation than job titles do — "AZ-104", "A-Level",
    // "PMP®" — so this stays lenient about hyphens/slashes/ampersands/parens, same spirit).
    private static bool LooksMalformed(string name)
    {
        if (name.Length > 100) return true;
        if (!name.Any(char.IsLetterOrDigit)) return true;

        var plausibleish = name.Count(c => char.IsLetterOrDigit(c) || c is ' ' or '-' or '&' or '/' or '\'' or '(' or ')' or '.');
        if ((double)plausibleish / name.Length < 0.7) return true;

        for (var i = 0; i + 3 < name.Length; i++)
        {
            if (name[i] == name[i + 1] && name[i] == name[i + 2] && name[i] == name[i + 3]) return true;
        }

        return false;
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

    private record ReportMissingRequest(string? Name, string? Category);
    private record UpdateStatusRequest(string Status);
}
