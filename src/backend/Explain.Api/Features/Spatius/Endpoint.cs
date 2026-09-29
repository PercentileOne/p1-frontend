using System.Text.Json;
using Explain.Api.Common;

namespace Explain.Api.Features.Spatius;

/// <summary>
/// Evaluation harness for Spatius (real-time avatar renderer, Francis 2026-09-29 — a possible cheaper
/// replacement for HeyGen LiveAvatar; see the /dev/spatius-test page). The browser SDK needs a short-lived
/// session token; minting one needs our API key, which must NEVER reach the browser (CLAUDE.md section 0), so
/// this endpoint mints it server-side. Admin-only because every token is a billable session.
/// Config (Azure app settings / local user-secrets): Spatius:ApiKey, Spatius:AppId, optional Spatius:ConsoleHost.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/dev/spatius/session-token", async (IHttpClientFactory httpFactory, IConfiguration config, ILoggerFactory logs, CancellationToken ct) =>
        {
            var apiKey = config["Spatius:ApiKey"];
            var appId = config["Spatius:AppId"];
            if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(appId))
                return Results.Json(new { error = "Spatius isn't configured (set Spatius:ApiKey and Spatius:AppId)." }, statusCode: 503);

            // Host comes from config only (never the request) — the doc's default is the US-west console.
            var host = config["Spatius:ConsoleHost"] ?? "console.us-west.spatius.ai";
            using var req = new HttpRequestMessage(HttpMethod.Post, $"https://{host}/v1/console/session-tokens");
            req.Headers.Add("X-API-Key", apiKey);
            // 30 minutes is plenty for a look-see and keeps a leaked token short-lived (the API allows up to 24h).
            req.Content = JsonContent.Create(new { expireAt = DateTimeOffset.UtcNow.AddMinutes(30).ToUnixTimeSeconds() });

            var http = httpFactory.CreateClient();
            using var resp = await http.SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
            {
                logs.CreateLogger("Spatius").LogWarning("Spatius session-token request failed: {Status}", (int)resp.StatusCode);
                return Results.Json(new { error = "Spatius rejected the token request.", status = (int)resp.StatusCode }, statusCode: 502);
            }

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
            if (!doc.RootElement.TryGetProperty("sessionToken", out var tokenEl) || tokenEl.GetString() is not { Length: > 0 } token)
                return Results.Json(new { error = "Spatius returned no session token." }, statusCode: 502);

            return Results.Ok(new { sessionToken = token, appId });
        })
        .WithName("SpatiusSessionToken").WithTags("Dev")
        .RequireAuthorization(Permissions.ViewSystemSettings);
    }
}
