using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Geo;

namespace Explain.Api.Features.Events;

/// <summary>
/// System-wide event log (Francis, 2026-09-15) — page views + significant actions across every
/// portal, for security/audit and for a real-time admin search page (see Features/Events/Admin).
///
/// This is NOT the first attempt at this. `src/frontend/src/api/flowLogger.ts` (and its copies
/// in every other portal) already calls `logFlowEvent(...)` from 29 places across the candidate
/// app alone — but it posts to a RELATIVE `/api/log-event` path, which hits that Static Web
/// App's own integrated Functions runtime instead of this backend and silently 404s, every
/// time (the exact documented gotcha in CLAUDE.md §3). It has never actually logged anything.
/// `src/recruiter-portal` has the identical client code but it happens to work there, because
/// that portal has its own real (Node.js Azure Functions) `api/log-event` + `api/flow-logs`,
/// co-deployed with it, writing to Cosmos `ExplainInterviewLogs/FlowLogs`. Per CLAUDE.md's own
/// architecture rule, Node.js Functions are a single sanctioned one-off exception (share-meta),
/// not a pattern to extend — so this is ONE unified endpoint in the real .NET backend that every
/// portal is meant to move onto, not a second parallel system. The old Node functions are left
/// running for now (not deleted as part of this change — see the plan's own scope notes).
///
/// AllowAnonymous is deliberate: this must work for logged-out marketing-page visits too, not
/// just authenticated portal users — see the archive/summary counterpart in
/// EventsArchiveService.cs for what happens to this data after the hot 10-day window here.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/events", async (EventRequest req, HttpContext ctx, CosmosService cosmos, IpGeoLookupService geo, ILogger<Program> logger) =>
        {
            if (string.IsNullOrWhiteSpace(req.SessionId) || string.IsNullOrWhiteSpace(req.EventType))
                return Results.BadRequest(new { error = "sessionId and eventType are required." });

            try
            {
                // Present if a valid JWT was sent, null otherwise — AllowAnonymous doesn't stop
                // the auth middleware from populating ctx.User when a token IS attached, it just
                // stops it being enforced.
                var userId = ctx.User.FindFirst("sub")?.Value;
                var email  = ctx.User.FindFirst("email")?.Value;
                var role   = ctx.User.FindFirst("role")?.Value;

                // When this browser's sign-in token was issued — lets the admin log tell a fresh login from an old
                // session left open on some device (e.g. a phone tab that reloads when the browser wakes).
                var tokenIssuedAt = long.TryParse(ctx.User.FindFirst("iat")?.Value, out var iat)
                    ? DateTimeOffset.FromUnixTimeSeconds(iat).ToString("o") : null;

                var ip = ctx.Connection.RemoteIpAddress?.ToString();
                var geoResult = await geo.ResolveAsync(ip, ctx.RequestAborted);

                var doc = new SystemEventDoc(
                    id: Guid.NewGuid().ToString(),
                    sessionId: req.SessionId,
                    userId: userId,
                    email: email,
                    role: role,
                    eventType: req.EventType.Trim(),
                    page: req.Page,
                    portal: req.Portal,
                    ipAddress: ip,
                    country: geoResult.Country,
                    city: geoResult.City,
                    userAgent: ctx.Request.Headers.UserAgent.ToString() is { Length: > 0 } ua ? ua : null,
                    metadata: req.Metadata,
                    createdAt: DateTimeOffset.UtcNow.ToString("o"),
                    region: geoResult.Region,
                    accuracyKm: geoResult.AccuracyKm,
                    tokenIssuedAt: tokenIssuedAt);

                var container = cosmos.GetContainer("systemEvents");
                await container.CreateItemAsync(doc, new PartitionKey(doc.sessionId), cancellationToken: ctx.RequestAborted);

                return Results.Ok(new { logged = true });
            }
            catch (Exception ex)
            {
                // Logging must never break whatever the candidate/recruiter/visitor was actually
                // doing — same "fire and forget, silent fail" contract flowLogger.ts already
                // documents on the client side.
                logger.LogWarning(ex, "Failed to record system event {EventType}", req.EventType);
                return Results.Ok(new { logged = false });
            }
        }).AllowAnonymous();
    }

    private record EventRequest(string SessionId, string EventType, string? Page, string? Portal, Dictionary<string, object>? Metadata);
}

public record SystemEventDoc(
    string id,
    string sessionId,
    string? userId,
    string? email,
    string? role,
    string eventType,
    string? page,
    string? portal,
    string? ipAddress,
    string? country,
    string? city,
    string? userAgent,
    Dictionary<string, object>? metadata,
    // "o"-formatted UTC string, not raw DateTimeOffset — matches LearnAlert.nextSendAt/createdAt's
    // own documented reasoning (Features/LearnAlerts/Endpoint.cs): fixed-width, lexicographically
    // sortable strings are what Cosmos-side SQL range comparisons (used by EventsArchiveService's
    // "everything since last archive run" query) actually need to be reliable.
    string createdAt,
    string? region = null,
    int? accuracyKm = null,
    string? tokenIssuedAt = null);
