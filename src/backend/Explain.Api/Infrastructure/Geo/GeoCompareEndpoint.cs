using System.Net;
using Explain.Api.Common;

namespace Explain.Api.Infrastructure.Geo;

/// <summary>
/// Ops-only: what each geolocation provider says for one IP, side by side — how to choose (and re-check) a provider on real visitor IPs
/// before paying for one. Same shared admin key (x-admin-key) as the other ops endpoints; providers without a key configured show null.
/// </summary>
public static class GeoCompareEndpoint
{
    public static void Map(WebApplication app)
    {
        // The admin portal's "Location check" page: same comparison, signed in as an admin instead of using the ops key. With no ip it
        // checks the caller's own address, so you can see what each provider makes of where you actually are.
        app.MapGet("/api/admin/geo-check", async (HttpContext ctx, IpGeoLookupService geo, string? ip) =>
        {
            var target = string.IsNullOrWhiteSpace(ip) ? ctx.Connection.RemoteIpAddress?.ToString() : ip.Trim();
            if (target is null || !IPAddress.TryParse(target, out _)) return Results.BadRequest(new { error = "That isn't a valid IP address." });
            return Results.Ok(new
            {
                ip = target,
                maxmind = await geo.LookupWithAsync("maxmind", target, ctx.RequestAborted),
                ipinfo = await geo.LookupWithAsync("ipinfo", target, ctx.RequestAborted),
                geoapify = await geo.LookupWithAsync("geoapify", target, ctx.RequestAborted),
            });
        }).RequireAuthorization(Permissions.ManageUsers);

        app.MapGet("/api/admin/geo-compare", async (HttpContext ctx, IConfiguration config, IpGeoLookupService geo, string ip) =>
        {
            var key = config["ExamCatalogAgent:AdminKey"];
            if (string.IsNullOrEmpty(key) || ctx.Request.Headers["x-admin-key"] != key) return Results.Unauthorized();
            if (!IPAddress.TryParse(ip, out _)) return Results.BadRequest(new { error = "ip is not a valid IP address." });

            return Results.Ok(new
            {
                ip,
                maxmind = await geo.LookupWithAsync("maxmind", ip, ctx.RequestAborted),
                ipinfo = await geo.LookupWithAsync("ipinfo", ip, ctx.RequestAborted),
                geoapify = await geo.LookupWithAsync("geoapify", ip, ctx.RequestAborted),
            });
        }).AllowAnonymous();
    }
}
