using System.Collections.Concurrent;

namespace Explain.Api.Features.PrivatePages;

/// <summary>
/// Password-locked pages (Francis, 2026-10-22). The page files are stored here in the server, not on the public website, and only leave it for someone holding a valid unlock token.
/// The website's own copy of each address is a small unlock page (src/viewme/public/private.html): it asks for the password, calls <c>/unlock</c>, then fetches the page with the token and
/// shows it in a frame. Passwords come from the App Service setting <c>PrivatePages__Passwords</c>; with none set, nothing can be unlocked.
/// </summary>
public static class Endpoint
{
    private const int MaxFailuresPer15Min = 10;
    private static readonly ConcurrentDictionary<string, (DateTime Start, int Fails)> Failures = new();

    public static void Map(WebApplication app)
    {
        // How many passwords are set and how many pages are stored. Counts only, never names, so it is safe to leave open and lets a release be checked.
        app.MapGet("/api/private-pages", (IConfiguration config) =>
            Results.Ok(new { passwords = PrivatePageAccess.ParsePasswords(config["PrivatePages:Passwords"]).Count, pages = ListPages(config).Count }))
            .AllowAnonymous();

        app.MapPost("/api/private-pages/unlock", async (UnlockRequest req, HttpContext ctx, IConfiguration config, ILogger<Program> logger) =>
        {
            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            if (TooManyFailures(ip))
            {
                ctx.Response.Headers.RetryAfter = "900";
                return Results.Json(new { error = "Too many tries. Please wait a few minutes and try again." }, statusCode: 429);
            }

            var entries = PrivatePageAccess.ParsePasswords(config["PrivatePages:Passwords"]);
            if (entries.Count == 0)
                return Results.Json(new { error = "These pages are locked and no access has been set up yet." }, statusCode: 401);

            var label = PrivatePageAccess.Check(req.Password, entries);
            if (label is null)
            {
                RecordFailure(ip);
                logger.LogWarning("Private pages: wrong password from {Ip}", ip);
                var delayMs = int.TryParse(config["PrivatePages:FailureDelayMs"], out var ms) && ms >= 0 ? ms : 400;
                if (delayMs > 0) await Task.Delay(delayMs, ctx.RequestAborted);   // slows guessing a little
                return Results.Json(new { error = "That password is not right." }, statusCode: 401);
            }

            var days = int.TryParse(config["PrivatePages:TokenDays"], out var d) && d is > 0 and <= 30 ? d : 7;
            var expires = DateTimeOffset.UtcNow.AddDays(days);
            var entry = entries.First(a => a.Label == label);
            logger.LogInformation("Private pages: {Label} unlocked from {Ip}", label, ip);
            return Results.Ok(new { token = PrivatePageAccess.MakeToken(entry, Key(config), expires), label, expiresAt = expires });
        }).AllowAnonymous();

        app.MapGet("/api/private-pages/{name}", async (string name, HttpContext ctx, IConfiguration config) =>
        {
            ctx.Response.Headers.CacheControl = "private, no-store";
            ctx.Response.Headers["X-Robots-Tag"] = "noindex, nofollow";

            var entries = PrivatePageAccess.ParsePasswords(config["PrivatePages:Passwords"]);
            var bearer = ctx.Request.Headers.Authorization.ToString();
            var token = bearer.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? bearer[7..].Trim() : null;
            if (PrivatePageAccess.VerifyToken(token, entries, Key(config), DateTimeOffset.UtcNow) is null)
                return Results.Json(new { error = "Locked." }, statusCode: 401);

            if (!PrivatePageAccess.IsValidName(name)) return Results.NotFound();
            var file = Path.Combine(PagesDirectory(config), name + ".html");
            if (!File.Exists(file)) return Results.NotFound();

            var origin = config["MarketingAppUrl"] ?? "https://www.theinterviewchair.com";
            var html = PrivatePageAccess.PrepareForEmbedding(await File.ReadAllTextAsync(file, ctx.RequestAborted), origin);
            return Results.Content(html, "text/html; charset=utf-8");
        }).AllowAnonymous();
    }

    private static readonly byte[] FallbackKey = PrivatePageAccess.DeriveKey(null);
    private static byte[] Key(IConfiguration config) => string.IsNullOrEmpty(config["Jwt:Secret"]) ? FallbackKey : PrivatePageAccess.DeriveKey(config["Jwt:Secret"]);

    private static string PagesDirectory(IConfiguration config) => config["PrivatePages:Directory"] ?? Path.Combine(AppContext.BaseDirectory, "PrivatePages");

    private static List<string> ListPages(IConfiguration config)
    {
        var dir = PagesDirectory(config);
        return Directory.Exists(dir) ? Directory.GetFiles(dir, "*.html").Select(f => Path.GetFileNameWithoutExtension(f)).Where(PrivatePageAccess.IsValidName).ToList() : [];
    }

    /// <summary>Clears the wrong-password counter. For tests only.</summary>
    public static void ResetFailuresForTests() => Failures.Clear();

    private static bool TooManyFailures(string ip)
    {
        if (!Failures.TryGetValue(ip, out var f)) return false;
        if (DateTime.UtcNow - f.Start > TimeSpan.FromMinutes(15)) { Failures.TryRemove(ip, out _); return false; }
        return f.Fails >= MaxFailuresPer15Min;
    }

    private static void RecordFailure(string ip) =>
        Failures.AddOrUpdate(ip, _ => (DateTime.UtcNow, 1), (_, old) => DateTime.UtcNow - old.Start > TimeSpan.FromMinutes(15) ? (DateTime.UtcNow, 1) : (old.Start, old.Fails + 1));

    private record UnlockRequest(string? Password);
}
