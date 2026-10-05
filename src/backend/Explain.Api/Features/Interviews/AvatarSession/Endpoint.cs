using MediatR;
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
        // Anonymous — same precedent as /interviews/speak: the interview room calls this before a
        // candidate is necessarily authenticated in every flow that reaches it (demo/prep links).
        app.MapPost("/interviews/avatar-session", async (AvatarSessionRequest req, HttpContext ctx, IMediator mediator, EntitlementService entitlements, IConfiguration config) =>
        {
            // Paywall backstop (see InterviewTicket): with enforcement ON, an avatar seat is only minted for an interview the server
            // itself allowed. With it OFF (today) this check is skipped entirely, so nothing changes until the switch is flipped.
            if ((await entitlements.GetSettingsAsync()).Enforce &&
                !InterviewTicket.IsValid(config["Jwt:Secret"], ctx.Request.Headers["X-Interview-Ticket"].ToString(), DateTimeOffset.UtcNow))
                return Results.Json(new { error = "An interview needs to be started first." }, statusCode: 403);
            return (await mediator.Send(new AvatarSessionCommand(req.Role))).ToHttpResult();
        })
           .WithName("InterviewAvatarSession").WithTags("Interviews")
           .AllowAnonymous();

        // Public kill-switch check — InterviewRoomPage reads this once per room mount, before
        // either seat ever attempts to connect. Same anonymous precedent as above; the actual
        // toggle is Super-Admin-gated (see Features/PlatformSettings), this just exposes the
        // current value read-only.
        //
        // Also tells the room WHICH provider draws the three seats for this interview (HeyGen, or Spatius for the share of full interviews
        // set in Admin > Live Avatar). The roll is made here, once per room mount, so the whole interview stays on one provider.
        // "?force=spatius|heygen" is honoured only for signed-in admins/staff, so Francis can test either side whatever the percentage is.
        app.MapGet("/interviews/avatar-config", async (HttpContext ctx, CosmosService cosmos, AppDbContext db, IConfiguration config) =>
        {
            var setting = await Explain.Api.Features.PlatformSettings.Endpoint.GetLiveAvatarOrDefaultAsync(cosmos);
            var provider = await Explain.Api.Features.PlatformSettings.Endpoint.GetAvatarProviderOrDefaultAsync(cosmos);

            var ready = SpatiusClient.IsConfigured(config)
                && !string.IsNullOrWhiteSpace(provider.spatiusAvatarHr)
                && !string.IsNullOrWhiteSpace(provider.spatiusAvatarTechnical)
                && !string.IsNullOrWhiteSpace(provider.spatiusAvatarMichelle);

            var useSpatius = ready && Random.Shared.Next(100) < Math.Clamp(provider.spatiusFullPercent, 0, 100);
            var force = ctx.Request.Query["force"].ToString().ToLowerInvariant();
            if (force is "spatius" or "heygen")
            {
                var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                if (await Explain.Api.Features.TryOut.Endpoint.IsUnlimitedAsync(ctx.User, ip, db, config))
                    useSpatius = ready && force == "spatius";
            }

            return Results.Ok(new
            {
                enabled = setting.enabled,
                provider = useSpatius ? "spatius" : "heygen",
                fallbackToHeygen = provider.fallbackToHeygen,
                spatius = useSpatius
                    ? new { hr = provider.spatiusAvatarHr, technical = provider.spatiusAvatarTechnical, michelle = provider.spatiusAvatarMichelle }
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
            if (string.IsNullOrWhiteSpace(provider.spatiusAvatarHr)) return Results.Json(new { error = "Not available." }, statusCode: 403);

            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var unlimited = await Explain.Api.Features.TryOut.Endpoint.IsUnlimitedAsync(ctx.User, ip, db, config);
            if (!unlimited && !(await Explain.Api.Features.CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync($"interview:spatiustoken:ip:{ip}", config.GetValue("Interview:SpatiusTokensPerVisitorPerDay", 60), cosmos)).allowed)
                return Results.Json(new { error = "Too many sessions today." }, statusCode: (int)HttpStatusCode.TooManyRequests);

            var r = await SpatiusClient.MintTokenAsync(factory, config, logs.CreateLogger("Spatius"), TimeSpan.FromMinutes(20), ct);
            return r.Ok
                ? Results.Ok(new { sessionToken = r.SessionToken, appId = r.AppId })
                : Results.Json(new { error = r.Error }, statusCode: r.FailureStatus);
        }).WithName("InterviewSpatiusToken").WithTags("Interviews").AllowAnonymous();
    }
}

public record AvatarSessionRequest(string Role);
