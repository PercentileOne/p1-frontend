using System.Collections.Concurrent;
using System.Text.Json;
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
                // This endpoint is anonymous and public, and the marketing site now sends several events per visit — cap what
                // one address can write, and how big one event can be, so it can never be used to flood the log (and the bill).
                if (!AllowedFromIp(ip)) return Results.Ok(new { logged = false });
                var geoResult = await geo.ResolveAsync(ip, ctx.RequestAborted);

                var doc = new SystemEventDoc(
                    id: Guid.NewGuid().ToString(),
                    sessionId: Clip(req.SessionId, 64)!,
                    userId: userId,
                    email: email,
                    role: role,
                    eventType: Clip(req.EventType.Trim(), 64)!,
                    page: Clip(req.Page, 300),
                    portal: Clip(req.Portal, 32),
                    ipAddress: ip,
                    country: geoResult.Country,
                    city: geoResult.City,
                    userAgent: ctx.Request.Headers.UserAgent.ToString() is { Length: > 0 } ua ? ua : null,
                    metadata: SafeMetadata(req.Metadata),
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

    private static string? Clip(string? value, int max) => value is null ? null : (value.Length <= max ? value : value[..max]);

    // Oversized details are dropped rather than stored (the event itself is still logged).
    private const int MaxMetadataChars = 4000;
    private static Dictionary<string, object>? SafeMetadata(Dictionary<string, object>? md) => NormaliseMetadata(md, MaxMetadataChars);

    /// <summary>
    /// The request body is bound with System.Text.Json, which hands every metadata VALUE over as a JsonElement — and the Cosmos SDK
    /// (Newtonsoft) then stores a JsonElement as its internal shape, `{ "ValueKind": 3 }`, instead of the actual value. Found 2026-09-26
    /// in the admin Activity Log: every event's details (and so the whole marketing funnel) read `{ "ValueKind": 3 }`. Values are
    /// therefore converted to plain strings / numbers / booleans / nested dictionaries and lists BEFORE they are stored.
    /// Returns null when the details are too large (over <paramref name="maxChars"/> once serialised).
    /// </summary>
    public static Dictionary<string, object>? NormaliseMetadata(Dictionary<string, object>? md, int maxChars)
    {
        if (md is null || md.Count == 0) return md;
        try
        {
            var plain = new Dictionary<string, object>(md.Count);
            foreach (var (key, value) in md) plain[key] = ToPlain(value)!;
            return JsonSerializer.Serialize(plain).Length <= maxChars ? plain : null;
        }
        catch { return null; }
    }

    private static object? ToPlain(object? value) => value switch
    {
        JsonElement e => e.ValueKind switch
        {
            JsonValueKind.String => e.GetString(),
            JsonValueKind.Number => e.TryGetInt64(out var l) ? (object)l : e.GetDouble(), // (object) cast: without it C# unifies both branches to double and 390 becomes 390.0
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Object => e.EnumerateObject().ToDictionary(p => p.Name, p => ToPlain(p.Value)),
            JsonValueKind.Array => e.EnumerateArray().Select(x => ToPlain(x)).ToList(),
            _ => null,
        },
        _ => value,
    };

    // Per-address sliding allowance: 400 events / 10 minutes (a real visit is ~30). In-memory on purpose — a restart just resets it.
    private static readonly ConcurrentDictionary<string, (DateTime Start, int Count)> Hits = new();
    private const int MaxEventsPer10Min = 400;
    private static bool AllowedFromIp(string? ip)
    {
        if (string.IsNullOrEmpty(ip)) return true;
        var now = DateTime.UtcNow;
        var entry = Hits.AddOrUpdate(ip, _ => (now, 1),
            (_, cur) => now - cur.Start > TimeSpan.FromMinutes(10) ? (now, 1) : (cur.Start, cur.Count + 1));
        if (Hits.Count > 20000)
            foreach (var stale in Hits.Where(kv => now - kv.Value.Start > TimeSpan.FromMinutes(10)).Select(kv => kv.Key).ToList())
                Hits.TryRemove(stale, out _);
        return entry.Count <= MaxEventsPer10Min;
    }
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
