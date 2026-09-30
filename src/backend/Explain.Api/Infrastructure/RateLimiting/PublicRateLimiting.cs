using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Explain.Api.Infrastructure.RateLimiting;

/// <summary>
/// Short-burst, per-visitor-address limits on the two anonymous, public-facing groups of endpoints — the "Try it live" demo (which spends AI and avatar
/// money) and the marketing site's event tracking. (Francis, 2026-09-30: bots.)
///
/// This is deliberately separate from — and sits in front of — the DAILY caps those endpoints already enforce through Cosmos (per visitor and global).
/// Those stop a slow drip from using the whole day's allowance; this stops a fast burst (a script hammering /api/tryout/start) before it reaches the model
/// or the database at all. Every other route is untouched, so signed-in portal traffic is never limited by this.
///
/// The visitor's address is HttpContext.Connection.RemoteIpAddress, i.e. after UseForwardedHeaders has applied X-Forwarded-For (see Program.cs). If a proxy
/// such as Cloudflare is ever put in front of the API, the real-IP header must be mapped there first, or every visitor would look like one address.
/// </summary>
public static class PublicRateLimiting
{
    public const int TryOutPerMinute = 40;    // a full demo is ~10 calls over a few minutes; this leaves room for a classroom behind one address
    public const int EventsPerMinute = 120;   // a busy marketing page emits a handful of events; a scripted flood emits hundreds

    /// <summary>Which limit applies to this request (keyed by visitor address), or no limit for every other route.</summary>
    public static RateLimitPartition<string> Partition(HttpContext ctx)
    {
        var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var path = ctx.Request.Path;

        if (path.StartsWithSegments("/api/tryout"))
            return Window($"tryout:{ip}", TryOutPerMinute);
        if (path.StartsWithSegments("/api/events"))
            return Window($"events:{ip}", EventsPerMinute);
        return RateLimitPartition.GetNoLimiter("unlimited");
    }

    private static RateLimitPartition<string> Window(string key, int permits) =>
        RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permits,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,                 // over the limit: refuse straight away rather than queue work for a bot
            AutoReplenishment = true,
        });

    public static IServiceCollection AddPublicRateLimiting(this IServiceCollection services) =>
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(Partition);
            options.OnRejected = async (context, ct) =>
            {
                context.HttpContext.Response.Headers.RetryAfter = "60";
                context.HttpContext.Response.ContentType = "application/json";
                await context.HttpContext.Response.WriteAsync("{\"error\":\"Too many requests — please wait a minute and try again.\"}", ct);
            };
        });
}
