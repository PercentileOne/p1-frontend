using System.Text;
using System.Text.Json;

namespace Explain.Api.Features.NameGreetings;

/// <summary>
/// Talks to D-ID's talking-head video API. Mirrors src/recruiter-portal/api/did-talk/index.js's
/// exact request shape (a proven, already-working reference in this monorepo) rather than
/// re-deriving the request format from D-ID's own docs.
/// </summary>
public class DidGenerationService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<DidGenerationService> logger)
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(4);
    private static readonly TimeSpan PollTimeout = TimeSpan.FromSeconds(90);

    public async Task<(bool Success, string? VideoUrl, string? Error)> GenerateAsync(string script, CancellationToken ct)
    {
        var apiKey = config["DID:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return (false, null, "D-ID is not configured.");

        var client = httpClientFactory.CreateClient("DID");
        var authHeader = "Basic " + Convert.ToBase64String(Encoding.UTF8.GetBytes(apiKey));
        var presenterUrl = config["DID:PresenterUrl"] ?? "https://recruiter.explain.global/images/james.png";
        var voiceId = config["DID:VoiceId"] ?? "en-GB-RyanNeural";

        try
        {
            var talkId = await SubmitTalkAsync(client, authHeader, presenterUrl, voiceId, script, ct);
            if (talkId is null) return (false, null, "D-ID submission failed.");

            return await PollUntilDoneAsync(client, authHeader, talkId, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "D-ID generation failed");
            return (false, null, ex.Message);
        }
    }

    private async Task<string?> SubmitTalkAsync(HttpClient client, string authHeader, string presenterUrl, string voiceId, string script, CancellationToken ct)
    {
        var payload = new
        {
            source_url = presenterUrl,
            script = new { type = "text", input = script, provider = new { type = "microsoft", voice_id = voiceId } },
            // stitch: true — without it, D-ID crops tight to just the detected face
            // (confirmed live, 2026-08-30: 512x512 square output instead of the source
            // photo's real 1280x852 framing), so James appeared zoomed in far more than
            // Sarah/his own static photo. stitch:true preserves the source photo's full
            // composition instead of cropping down to a headshot.
            config = new { fluent = true, pad_audio = 0, stitch = true },
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, "/talks");
        req.Headers.TryAddWithoutValidation("Authorization", authHeader);
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        using var res = await client.SendAsync(req, ct);
        var body = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
        {
            logger.LogWarning("D-ID /talks failed: {Status} {Body}", res.StatusCode, body);
            return null;
        }

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
    }

    private async Task<(bool, string?, string?)> PollUntilDoneAsync(HttpClient client, string authHeader, string talkId, CancellationToken ct)
    {
        var deadline = DateTimeOffset.UtcNow + PollTimeout;
        while (DateTimeOffset.UtcNow < deadline)
        {
            await Task.Delay(PollInterval, ct);

            using var req = new HttpRequestMessage(HttpMethod.Get, $"/talks/{talkId}");
            req.Headers.TryAddWithoutValidation("Authorization", authHeader);
            using var res = await client.SendAsync(req, ct);
            var body = await res.Content.ReadAsStringAsync(ct);
            if (!res.IsSuccessStatusCode) continue;

            using var doc = JsonDocument.Parse(body);
            var status = doc.RootElement.TryGetProperty("status", out var s) ? s.GetString() : null;
            if (status == "done" && doc.RootElement.TryGetProperty("result_url", out var url))
                return (true, url.GetString(), null);
            if (status == "error")
                return (false, null, "D-ID reported a render error.");
        }
        return (false, null, "D-ID generation timed out.");
    }
}
