using Explain.Api.Common;

namespace Explain.Api.Features.SessionPasses;

/// <summary>
/// Phase 1 of the Interview Gift feature (Francis, 2026-09-15) — the entitlement core, no
/// payment wired up yet. Checkout/webhook land separately once Stripe test keys exist (see
/// SessionPasses/Checkout/Endpoint.cs). This file owns the candidate-facing read/consume side.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // GET /api/session-passes/received — every active, unexpired, unexhausted pass
        // (gifted or self-purchased) for the logged-in candidate's own email. Same "no
        // claim/link step" contract as GET /api/interview-preps/received — a pass paid for
        // before this candidate had an account just appears the moment they're authenticated
        // with a matching email.
        app.MapGet("/api/session-passes/received", async (HttpContext ctx, SessionPassService passes) =>
        {
            var email = ctx.User.FindFirst("email")?.Value;
            if (string.IsNullOrEmpty(email)) return Results.Unauthorized();

            var active = await passes.GetActiveForEmailAsync(email);
            return Results.Ok(active.Select(p => new
            {
                p.id,
                p.recipientName,
                p.source,
                p.senderName,
                p.sessionsTotal,
                p.sessionsUsed,
                sessionsRemaining = p.sessionsTotal - p.sessionsUsed,
                p.expiresAt,
            }));
        }).RequireAuthorization(Permissions.PracticeInterview);

        // POST /api/session-passes/consume — called by InterviewPackStart.tsx the moment a
        // candidate commits to starting a practice interview via a redeemed pass. Deliberately
        // separate from POST /interviews/avatar-session (the actual LiveAvatar cost event),
        // which is AllowAnonymous by design to support demo/prep-link flows that reach the room
        // before a candidate is necessarily authenticated — this endpoint requires auth because
        // consumption is keyed off the candidate's own JWT email, the same source of truth as
        // the received endpoint above.
        app.MapPost("/api/session-passes/consume", async (HttpContext ctx, SessionPassService passes) =>
        {
            var email = ctx.User.FindFirst("email")?.Value;
            if (string.IsNullOrEmpty(email)) return Results.Unauthorized();

            var consumed = await passes.CheckAndConsumeAsync(email);
            return consumed
                ? Results.Ok(new { consumed = true })
                : Results.Ok(new { consumed = false, message = "No practice sessions remaining on any active pass." });
        }).RequireAuthorization(Permissions.PracticeInterview);
    }
}
