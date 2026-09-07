using System.Net.Http.Json;
using System.Text.Json;
using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Interviews.AvatarSession;

// Mints a short-lived LiveAvatar session token server-side, the same shape as SpeakVoiceHandler's
// relationship to ElevenLabs — the real X-API-KEY never leaves this handler; the frontend only
// ever sees the returned session_token, which LiveAvatar's own docs confirm is the correct
// credential for the WebSocket/session-start calls that follow (X-API-KEY on /sessions/token,
// Bearer session_token on everything after).
//
// Request shape verified directly against the live API before writing this handler — LiveAvatar
// defaults to validating the FULL-mode schema (avatar_persona/voice_agent required) unless
// "mode": "LITE" is present, which isn't documented anywhere in the installed skill.
public class AvatarSessionHandler(
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<AvatarSessionHandler> logger)
    : IRequestHandler<AvatarSessionCommand, Result<AvatarSessionDto>>
{
    public async Task<Result<AvatarSessionDto>> Handle(AvatarSessionCommand cmd, CancellationToken ct)
    {
        var apiKey = config["LiveAvatar:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return Result<AvatarSessionDto>.Failure("Avatar session isn't configured.", 500);

        // Sandbox stays the default until real Sarah/James avatars exist in the LiveAvatar
        // dashboard and LiveAvatar:AvatarId / LiveAvatar:Sandbox get set for production — this
        // is a one-line config change, not a code change, when that day comes.
        var isSandbox = config.GetValue<bool?>("LiveAvatar:Sandbox") ?? true;
        var avatarId = config["LiveAvatar:AvatarId"] ?? "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";

        var client = httpFactory.CreateClient();
        using var msg = new HttpRequestMessage(HttpMethod.Post, "https://api.liveavatar.com/v1/sessions/token");
        msg.Headers.Add("X-API-KEY", apiKey);
        msg.Content = JsonContent.Create(new
        {
            is_sandbox = isSandbox,
            avatar_id = avatarId,
            mode = "LITE",
        });

        using var resp = await client.SendAsync(msg, ct);
        var body = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
        {
            logger.LogError("LiveAvatar /sessions/token returned {Status}: {Body}", resp.StatusCode, body);
            return Result<AvatarSessionDto>.Failure("Avatar session failed to start.", 502);
        }

        using var doc = JsonDocument.Parse(body);
        var data = doc.RootElement.GetProperty("data");
        var sessionId = data.GetProperty("session_id").GetString()!;
        var sessionToken = data.GetProperty("session_token").GetString()!;

        return Result<AvatarSessionDto>.Success(new AvatarSessionDto(sessionId, sessionToken, isSandbox));
    }
}
