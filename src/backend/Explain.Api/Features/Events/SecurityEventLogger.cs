using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Geo;

namespace Explain.Api.Features.Events;

/// <summary>
/// A small, backend-initiated counterpart to POST /api/events (Endpoint.cs) — for handlers that
/// have no HttpContext of their own (MediatR commands like Login/Register) or where a security
/// event must be logged server-side regardless of what the client does (a blocked login attempt
/// can't depend on the blocked client's own JS choosing to report itself). Writes into the same
/// "systemEvents" Cosmos container Features/Events/Admin's Activity Log page already reads, so
/// these appear there immediately alongside every other event — Francis, 2026-09-16, on account
/// lockout + email verification: "logging for everything will be a good start."
/// </summary>
public class SecurityEventLogger(CosmosService cosmos, IpGeoLookupService geo, ILogger<SecurityEventLogger> logger)
{
    public async Task LogAsync(
        string eventType, string? userId, string? email, string? ipAddress,
        Dictionary<string, object>? metadata = null, CancellationToken ct = default)
    {
        // Same "logging must never break the real operation" contract as Features/Events/
        // Endpoint.cs's own try/catch — a Cosmos hiccup while recording a lockout must never
        // turn into the lockout itself failing.
        try
        {
            var geoResult = await geo.ResolveAsync(ipAddress, ct);
            var doc = new SystemEventDoc(
                id: Guid.NewGuid().ToString(),
                // No real client session exists for a backend-initiated event — a fresh id per
                // event is fine, since these are low-volume and never queried by session anyway.
                sessionId: Guid.NewGuid().ToString(),
                userId: userId,
                email: email,
                role: null,
                eventType: eventType,
                page: null,
                portal: null,
                ipAddress: ipAddress,
                country: geoResult.Country,
                city: geoResult.City,
                userAgent: null,
                metadata: metadata,
                createdAt: DateTimeOffset.UtcNow.ToString("o"));

            var container = cosmos.GetContainer("systemEvents");
            await container.CreateItemAsync(doc, new PartitionKey(doc.sessionId), cancellationToken: ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to record security event {EventType}", eventType);
        }
    }
}
