using System.Text.Json;

namespace Explain.Api.Features.Spatius;

/// <summary>
/// Server-side access to Spatius (real-time avatar renderer). The API key lives ONLY here and in Azure app settings
/// (Spatius:ApiKey, Spatius:AppId, optional Spatius:ConsoleHost) — the browser only ever receives a short-lived session token (CLAUDE.md section 0).
/// Shared by the admin test endpoint (Features/Spatius/Endpoint.cs) and the public /try demo (Features/TryOut).
/// </summary>
public static class SpatiusClient
{
    public static bool IsConfigured(IConfiguration config) =>
        !string.IsNullOrWhiteSpace(config["Spatius:ApiKey"]) && !string.IsNullOrWhiteSpace(config["Spatius:AppId"]);

    public record TokenResult(string? SessionToken, string? AppId, int FailureStatus, string? Error)
    {
        public bool Ok => SessionToken is not null;
    }

    /// <summary>Mints a session token valid for <paramref name="lifetime"/> (Spatius allows up to 24 hours; keep it short).</summary>
    public static async Task<TokenResult> MintTokenAsync(IHttpClientFactory httpFactory, IConfiguration config, ILogger logger, TimeSpan lifetime, CancellationToken ct)
    {
        var apiKey = config["Spatius:ApiKey"];
        var appId = config["Spatius:AppId"];
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(appId))
            return new TokenResult(null, null, 503, "Spatius isn't configured (set Spatius:ApiKey and Spatius:AppId).");

        // Host comes from config only (never from a request) — the docs' default is the US-west console.
        var host = config["Spatius:ConsoleHost"] ?? "console.us-west.spatius.ai";
        using var req = new HttpRequestMessage(HttpMethod.Post, $"https://{host}/v1/console/session-tokens");
        req.Headers.Add("X-API-Key", apiKey);
        req.Content = JsonContent.Create(new { expireAt = DateTimeOffset.UtcNow.Add(lifetime).ToUnixTimeSeconds() });

        try
        {
            using var resp = await httpFactory.CreateClient().SendAsync(req, ct);
            if (!resp.IsSuccessStatusCode)
            {
                logger.LogWarning("Spatius session-token request failed: {Status}", (int)resp.StatusCode);
                return new TokenResult(null, null, 502, "Spatius rejected the token request.");
            }
            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
            if (!doc.RootElement.TryGetProperty("sessionToken", out var el) || el.GetString() is not { Length: > 0 } token)
                return new TokenResult(null, null, 502, "Spatius returned no session token.");
            return new TokenResult(token, appId, 200, null);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning("Spatius session-token request errored: {Message}", ex.Message);
            return new TokenResult(null, null, 502, "Couldn't reach Spatius.");
        }
    }
}
