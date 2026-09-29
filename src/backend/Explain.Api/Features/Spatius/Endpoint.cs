using Explain.Api.Common;

namespace Explain.Api.Features.Spatius;

/// <summary>
/// Evaluation harness for Spatius (Francis 2026-09-29 — see the /dev/spatius-test page). The browser SDK needs a short-lived session token;
/// minting one needs our API key, which must NEVER reach the browser (CLAUDE.md section 0), so this endpoint mints it server-side.
/// Admin-only because every token is a billable session. The public /try demo has its own ticket-guarded endpoint (Features/TryOut).
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/dev/spatius/session-token", async (IHttpClientFactory httpFactory, IConfiguration config, ILoggerFactory logs, CancellationToken ct) =>
        {
            // 30 minutes is plenty for a look-see and keeps a leaked token short-lived.
            var r = await SpatiusClient.MintTokenAsync(httpFactory, config, logs.CreateLogger("Spatius"), TimeSpan.FromMinutes(30), ct);
            return r.Ok
                ? Results.Ok(new { sessionToken = r.SessionToken, appId = r.AppId })
                : Results.Json(new { error = r.Error }, statusCode: r.FailureStatus);
        })
        .WithName("SpatiusSessionToken").WithTags("Dev")
        .RequireAuthorization(Permissions.ViewSystemSettings);
    }
}
