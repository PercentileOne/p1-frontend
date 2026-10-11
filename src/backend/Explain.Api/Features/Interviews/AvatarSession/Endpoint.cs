using System.Net;
using Explain.Api.Features.Entitlements;
using Explain.Api.Features.Spatius;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Interviews.AvatarSession;

public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // HeyGen LiveAvatar was retired on 2026-10-11 (subscription cancelled): POST /interviews/avatar-session, which minted its session tokens, is gone.
        // Every interviewer face is now drawn by Spatius (config below + the token routes that follow).

        // Public kill-switch check — InterviewRoomPage reads this once per room mount, before
        // either seat ever attempts to connect. Same anonymous precedent as above; the actual
        // toggle is Super-Admin-gated (see Features/PlatformSettings), this just exposes the
        // current value read-only.
        //
        // Also tells the room whether faces are drawn for this interview: "spatius" for the share of full interviews set in Admin > Live Avatar
        // (the roll is made here, once per room mount), otherwise "none" and the room speaks in plain voice. "?force=spatius" is honoured only for signed-in
        // admins/staff, so Francis can test whatever the percentage is. (There is no HeyGen any more: "?force=heygen" is ignored.)
        app.MapGet("/interviews/avatar-config", async (HttpContext ctx, CosmosService cosmos, AppDbContext db, IConfiguration config) =>
        {
            var setting = await Explain.Api.Features.PlatformSettings.Endpoint.GetLiveAvatarOrDefaultAsync(cosmos);
            var provider = await Explain.Api.Features.PlatformSettings.Endpoint.GetAvatarProviderOrDefaultAsync(cosmos);

            // Who is in each seat: the interviewers registry (Admin > Interviewers) first, the three IDs in Admin > Live Avatar as the fallback.
            var seats = await Explain.Api.Features.Interviewers.Endpoint.ResolveSeatsAsync(cosmos, provider);
            var ready = SpatiusClient.IsConfigured(config)
                && !string.IsNullOrWhiteSpace(seats.Hr)
                && !string.IsNullOrWhiteSpace(seats.Technical)
                && !string.IsNullOrWhiteSpace(seats.Michelle);

            var useSpatius = ready && Random.Shared.Next(100) < Math.Clamp(provider.spatiusFullPercent, 0, 100);
            var force = ctx.Request.Query["force"].ToString().ToLowerInvariant();
            if (force is "spatius")
            {
                var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                if (await Explain.Api.Features.TryOut.Endpoint.IsUnlimitedAsync(ctx.User, ip, db, config))
                    useSpatius = ready;
            }

            return Results.Ok(new
            {
                enabled = setting.enabled,
                provider = useSpatius ? "spatius" : "none",
                fallbackToHeygen = false,
                spatius = useSpatius
                    ? new { hr = seats.Hr, technical = seats.Technical, michelle = seats.Michelle }
                    : null,
                // Uploaded background pictures for the three seats (relative API paths; null = use the files shipped with the page).
                backgrounds = useSpatius
                    ? new { hr = seats.HrBackground, technical = seats.TechnicalBackground, michelle = seats.MichelleBackground }
                    : null,
            });
        }).WithName("InterviewAvatarConfig").WithTags("Interviews").AllowAnonymous();

        // Session token for a Spatius seat in a full interview. The API key never leaves the server (CLAUDE.md section 0); the browser gets a
        // 20-minute token. Same abuse guard as the demo's token route, but keyed on the interview ticket (or a signed-in user, because the ticket is
        // only handed out when the paywall switch is on) plus a per-address daily cap, so it can't be used as a free token machine.
        app.MapPost("/interviews/spatius-token", async (HttpContext ctx, AppDbContext db, CosmosService cosmos, IHttpClientFactory factory, IConfiguration config, ILoggerFactory logs, CancellationToken ct) =>
        {
            var signedIn = !string.IsNullOrEmpty(ctx.User.FindFirst("sub")?.Value);
            if (!signedIn && !InterviewTicket.IsValid(config["Jwt:Secret"], ctx.Request.Headers["X-Interview-Ticket"].ToString(), DateTimeOffset.UtcNow))
                return Results.Json(new { error = "An interview needs to be started first." }, statusCode: 403);

            var provider = await Explain.Api.Features.PlatformSettings.Endpoint.GetAvatarProviderOrDefaultAsync(cosmos);
            var seats = await Explain.Api.Features.Interviewers.Endpoint.ResolveSeatsAsync(cosmos, provider);
            if (string.IsNullOrWhiteSpace(seats.Hr)) return Results.Json(new { error = "Not available." }, statusCode: 403);

            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var unlimited = await Explain.Api.Features.TryOut.Endpoint.IsUnlimitedAsync(ctx.User, ip, db, config);
            if (!unlimited && !(await Explain.Api.Features.CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync($"interview:spatiustoken:ip:{ip}", config.GetValue("Interview:SpatiusTokensPerVisitorPerDay", 60), cosmos)).allowed)
                return Results.Json(new { error = "Too many sessions today." }, statusCode: (int)HttpStatusCode.TooManyRequests);

            var r = await SpatiusClient.MintTokenAsync(factory, config, logs.CreateLogger("Spatius"), TimeSpan.FromMinutes(20), ct);
            return r.Ok
                ? Results.Ok(new { sessionToken = r.SessionToken, appId = r.AppId })
                : Results.Json(new { error = r.Error }, statusCode: r.FailureStatus);
        }).WithName("InterviewSpatiusToken").WithTags("Interviews").AllowAnonymous();

        // The homepage's "Say hi" preview (2026-10-08): a visitor hears and sees an interviewer greet them before choosing. Anonymous, so it is capped per visitor address and for the
        // whole site per day (a greeting is a few seconds of a billed Spatius connection). Over the cap the preview quietly falls back to voice only.
        app.MapPost("/api/hello/spatius-token", async (HttpContext ctx, AppDbContext db, CosmosService cosmos, IHttpClientFactory factory, IConfiguration config, ILoggerFactory logs, CancellationToken ct) =>
        {
            var provider = await Explain.Api.Features.PlatformSettings.Endpoint.GetAvatarProviderOrDefaultAsync(cosmos);
            if (provider.provider != "spatius" || !SpatiusClient.IsConfigured(config)) return Results.Json(new { error = "Not available." }, statusCode: 403);

            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var unlimited = await Explain.Api.Features.TryOut.Endpoint.IsUnlimitedAsync(ctx.User, ip, db, config);
            if (!unlimited && !(await Explain.Api.Features.CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync($"hello:spatiustoken:ip:{ip}", config.GetValue("Hello:TokensPerVisitorPerDay", 12), cosmos)).allowed)
                return Results.Json(new { error = "Too many previews today." }, statusCode: (int)HttpStatusCode.TooManyRequests);
            if (!unlimited && !(await Explain.Api.Features.CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync("hello:spatiustoken:global", config.GetValue("Hello:TokensGlobalPerDay", 300), cosmos)).allowed)
                return Results.Json(new { error = "Too many previews today." }, statusCode: (int)HttpStatusCode.TooManyRequests);

            var r = await SpatiusClient.MintTokenAsync(factory, config, logs.CreateLogger("Spatius"), TimeSpan.FromMinutes(20), ct);
            return r.Ok
                ? Results.Ok(new { sessionToken = r.SessionToken, appId = r.AppId })
                : Results.Json(new { error = r.Error }, statusCode: r.FailureStatus);
        }).WithName("HelloSpatiusToken").WithTags("Interviews").AllowAnonymous();
    }
}

public record AvatarSessionRequest(string Role);
