using MediatR;
using Explain.Api.Features.Entitlements;
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
        app.MapGet("/interviews/avatar-config", async (CosmosService cosmos) =>
        {
            var setting = await Explain.Api.Features.PlatformSettings.Endpoint.GetLiveAvatarOrDefaultAsync(cosmos);
            return Results.Ok(new { enabled = setting.enabled });
        }).WithName("InterviewAvatarConfig").WithTags("Interviews").AllowAnonymous();
    }
}

public record AvatarSessionRequest(string Role);
