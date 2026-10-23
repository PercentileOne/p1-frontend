using System.Net;
using System.Text.Json;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Features.SiteAgents;

/// <summary>
/// The live talking guide (Francis, 2026-10-22; plan in docs/specs/site-agents-plan.md). ElevenLabs runs the conversation (listening, model, voice); Spatius draws the face from the
/// agent's audio in the visitor's browser. The ElevenLabs key lives only here: the browser receives a signed link that lets it open ONE conversation with ONE agent, valid for a
/// short while. The agent itself also requires that signed link (its Authentication setting), so its id alone cannot start a conversation.
///
/// Two doors (2026-10-23): the admin-only one (the /dev/site-agent page) and the public one the homepage panel uses. The public one is closed until an admin switches it on, refuses
/// robots, and is capped per visitor and for the whole site per day, because every conversation is billed minutes at ElevenLabs and Spatius.
/// </summary>
public static class Endpoint
{
    public record Request(string? Audience, string? Name);
    public record SwitchRequest(bool On);
    public record SwitchDoc(string id, string pk, bool enabled, string updatedAt);

    private const string SwitchId = "siteGuide";

    public static void Map(WebApplication app)
    {
        // Admin door: no limits, admin only. Used by the /dev/site-agent page.
        app.MapPost("/api/dev/site-agent/session", async (Request req, IHttpClientFactory httpFactory, IConfiguration config, ILoggerFactory logs, CancellationToken ct) =>
            await SessionAsync(req, httpFactory, config, logs, ct))
        .WithName("SiteAgentSession").WithTags("Dev")
        .RequireAuthorization(Permissions.ViewSystemSettings);

        // The public on/off switch (default OFF), read and set by an admin from the same page.
        app.MapGet("/api/admin/site-agent/public", async (CosmosService cosmos, CancellationToken ct) => Results.Ok(new { enabled = await PublicEnabledAsync(cosmos, ct) }))
            .WithTags("Dev").RequireAuthorization(Permissions.ViewSystemSettings);
        app.MapPut("/api/admin/site-agent/public", async (SwitchRequest req, CosmosService cosmos, CancellationToken ct) =>
        {
            await cosmos.GetContainer("platformSettings").UpsertItemAsync(new SwitchDoc(SwitchId, SwitchId, req.On, DateTimeOffset.UtcNow.ToString("o")), new PartitionKey(SwitchId), cancellationToken: ct);
            return Results.Ok(new { enabled = req.On });
        }).WithTags("Dev").RequireAuthorization(Permissions.ViewSystemSettings);

        // Public door. The homepage asks this first and shows the panel only when it says yes.
        app.MapGet("/api/site-agent/status", async (IConfiguration config, CosmosService cosmos, CancellationToken ct) =>
        {
            var on = await PublicEnabledAsync(cosmos, ct) && SiteAgentRules.AgentIdFor(config, "recruiter") is not null && SiteAgentRules.AgentIdFor(config, "candidate") is not null;
            return Results.Ok(new { enabled = on });
        }).WithName("SiteAgentStatus").WithTags("SiteAgent").AllowAnonymous();

        app.MapPost("/api/site-agent/session", async (HttpContext ctx, Request req, AppDbContext db, CosmosService cosmos, IHttpClientFactory httpFactory, IConfiguration config, ILoggerFactory logs, CancellationToken ct) =>
        {
            if (await RefusalAsync(ctx, cosmos, ct) is { } refusal) return refusal;
            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            if (!await Explain.Api.Features.TryOut.Endpoint.IsUnlimitedAsync(ctx.User, ip, db, config))
            {
                if (!(await Explain.Api.Features.CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync($"siteguide:session:ip:{ip}", config.GetValue("SiteAgent:PerVisitorPerDay", 3), cosmos)).allowed)
                    return Results.Json(new { error = "You've had your conversations with the guide for today. Come back tomorrow, or create a free account to try the real thing." }, statusCode: (int)HttpStatusCode.TooManyRequests);
                if (!(await Explain.Api.Features.CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync("siteguide:session:global", config.GetValue("SiteAgent:GlobalPerDay", 100), cosmos)).allowed)
                    return Results.Json(new { error = "The guide is very busy today. Please try again tomorrow." }, statusCode: (int)HttpStatusCode.TooManyRequests);
            }
            return await SessionAsync(req, httpFactory, config, logs, ct);
        }).WithName("SiteAgentPublicSession").WithTags("SiteAgent").AllowAnonymous();

        // The face's session token for the same visitor, under its own caps (a face is opened a little before the conversation, and again by "Talk again").
        app.MapPost("/api/site-agent/spatius-token", async (HttpContext ctx, AppDbContext db, CosmosService cosmos, IHttpClientFactory factory, IConfiguration config, ILoggerFactory logs, CancellationToken ct) =>
        {
            if (await RefusalAsync(ctx, cosmos, ct) is { } refusal) return refusal;
            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            if (!await Explain.Api.Features.TryOut.Endpoint.IsUnlimitedAsync(ctx.User, ip, db, config))
            {
                if (!(await Explain.Api.Features.CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync($"siteguide:spatiustoken:ip:{ip}", config.GetValue("SiteAgent:TokensPerVisitorPerDay", 8), cosmos)).allowed)
                    return Results.Json(new { error = "Too many sessions today." }, statusCode: (int)HttpStatusCode.TooManyRequests);
                if (!(await Explain.Api.Features.CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync("siteguide:spatiustoken:global", config.GetValue("SiteAgent:TokensGlobalPerDay", 300), cosmos)).allowed)
                    return Results.Json(new { error = "Too many sessions today." }, statusCode: (int)HttpStatusCode.TooManyRequests);
            }
            var r = await Explain.Api.Features.Spatius.SpatiusClient.MintTokenAsync(factory, config, logs.CreateLogger("Spatius"), TimeSpan.FromMinutes(20), ct);
            return r.Ok ? Results.Ok(new { sessionToken = r.SessionToken, appId = r.AppId }) : Results.Json(new { error = r.Error }, statusCode: r.FailureStatus);
        }).WithName("SiteAgentSpatiusToken").WithTags("SiteAgent").AllowAnonymous();
    }

    // Switch off, or a robot: nothing is started. Returns the refusal to send, or null when the visitor may go on.
    private static async Task<IResult?> RefusalAsync(HttpContext ctx, CosmosService cosmos, CancellationToken ct)
    {
        if (!await PublicEnabledAsync(cosmos, ct)) return Results.Json(new { error = "The guide isn't available right now." }, statusCode: 403);
        if (Explain.Api.Features.Events.Admin.Endpoint.IsBotAgent(ctx.Request.Headers.UserAgent.ToString())) return Results.Json(new { error = "Not available." }, statusCode: 403);
        return null;
    }

    private static async Task<bool> PublicEnabledAsync(CosmosService cosmos, CancellationToken ct)
    {
        try { return (await cosmos.GetContainer("platformSettings").ReadItemAsync<SwitchDoc>(SwitchId, new PartitionKey(SwitchId), cancellationToken: ct)).Resource.enabled; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return false; }   // never switched on = closed
    }

    private static async Task<IResult> SessionAsync(Request req, IHttpClientFactory httpFactory, IConfiguration config, ILoggerFactory logs, CancellationToken ct)
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
    }
}
