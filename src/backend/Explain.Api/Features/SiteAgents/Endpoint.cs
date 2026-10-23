using System.Text.Json;
using Explain.Api.Common;

namespace Explain.Api.Features.SiteAgents;

/// <summary>
/// The live talking guide (Francis, 2026-10-22; plan in docs/specs/site-agents-plan.md). ElevenLabs runs the conversation (listening, model, voice); Spatius draws the face from the
/// agent's audio in the visitor's browser. The ElevenLabs key lives only here: the browser receives a signed link that lets it open ONE conversation with ONE agent, valid for a
/// short while. The agent itself also requires that signed link (its Authentication setting), so its id alone cannot start a conversation.
///
/// This first version is admin-only (the /dev/site-agent page) so cost and quality can be judged before any visitor can reach it. The public endpoint, with its per-visitor limits, comes next.
/// </summary>
public static class Endpoint
{
    public record Request(string? Audience, string? Name);

    public static void Map(WebApplication app)
    {
        app.MapPost("/api/dev/site-agent/session", async (Request req, IHttpClientFactory httpFactory, IConfiguration config, ILoggerFactory logs, CancellationToken ct) =>
        {
            var log = logs.CreateLogger("SiteAgent");
            if (!SiteAgentRules.IsAudience(req.Audience)) return Results.BadRequest(new { error = "Audience must be recruiter or candidate." });
            var agentId = SiteAgentRules.AgentIdFor(config, req.Audience!);
            var apiKey = config["ElevenLabs:ApiKey"];
            if (agentId is null || string.IsNullOrWhiteSpace(apiKey))
                return Results.Json(new { error = $"The {req.Audience} guide isn't set up yet (needs SiteAgent:{(req.Audience == "recruiter" ? "RecruiterAgentId" : "CandidateAgentId")} and the ElevenLabs key)." }, statusCode: 503);

            using var msg = new HttpRequestMessage(HttpMethod.Get, $"https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id={Uri.EscapeDataString(agentId)}");
            msg.Headers.Add("xi-api-key", apiKey);
            try
            {
                using var resp = await httpFactory.CreateClient().SendAsync(msg, ct);
                if (!resp.IsSuccessStatusCode)
                {
                    // Not logged with the body: it can repeat parts of the request. The status is enough to tell a missing permission (401/403) from a wrong agent id (404).
                    log.LogWarning("ElevenLabs signed-url request failed: {Status}", (int)resp.StatusCode);
                    return Results.Json(new { error = $"ElevenLabs refused the request ({(int)resp.StatusCode}). Check the agent id and that the key's permissions include Agents." }, statusCode: 502);
                }
                using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
                if (!doc.RootElement.TryGetProperty("signed_url", out var el) || el.GetString() is not { Length: > 0 } signed)
                    return Results.Json(new { error = "ElevenLabs returned no signed link." }, statusCode: 502);
                return Results.Ok(new
                {
                    signedUrl = signed,
                    audience = req.Audience,
                    maxSeconds = SiteAgentRules.MaxSeconds,
                    dynamicVariables = new { user_name = SiteAgentRules.CleanName(req.Name) },
                });
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                log.LogWarning("ElevenLabs signed-url request errored: {Message}", ex.Message);
                return Results.Json(new { error = "Couldn't reach ElevenLabs." }, statusCode: 502);
            }
        })
        .WithName("SiteAgentSession").WithTags("Dev")
        .RequireAuthorization(Permissions.ViewSystemSettings);
    }
}
