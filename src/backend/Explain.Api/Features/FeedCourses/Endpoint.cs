using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;
using VideoFeed = Explain.Api.Features.FeedVideos.Endpoint;
using BookFeed = Explain.Api.Features.FeedBooks.Endpoint;

namespace Explain.Api.Features.FeedCourses;

/// <summary>
/// The feed's courses strip (Francis, 2026-10-20; docs/specs/agent-driven-feed.md). A short list of real courses from official providers, shown as a row of cards like the video and book strips. Nothing is copied or
/// re-hosted: a card shows the provider's own title and picture and links to the course on the provider's own site.
/// The verifier step is the page itself, fetched when an admin adds a course by address. The address must be https and on a provider on the allowlist below, the page must answer 200 with a title, and it must not have been
/// moved: a course that redirects somewhere else (a retired course landing on a generic page) is refused with the address it now goes to. Title and picture come from the page's own Open Graph tags; an admin may replace
/// the title, and writes the "why it is here" line and says whether the course is free (we never claim "free" on our own). One Cosmos document per course (id = a hash of the normalised address), one partition.
/// A person's private saved list sits in one small document in their own partition of the "planning" container.
/// </summary>
public static class Endpoint
{
    public const string ContainerName = "feedCourses";
    public const string Partition = "course";
    public const int MaxPublished = 200;
    public const int MaxMarks = 500;
    public const int MaxWhy = 200;
    public const int MaxTitle = 160;
    private const int MaxPageBytes = 256 * 1024;
    private const string StateDocId = "feedcourse-state";

    // Official providers only. Host names match exactly or as a subdomain ("www.coursera.org" matches "coursera.org"). The value is the name shown on the card.
    public static readonly IReadOnlyDictionary<string, string> Providers = new Dictionary<string, string>
    {
        ["coursera.org"] = "Coursera",
        ["edx.org"] = "edX",
        ["khanacademy.org"] = "Khan Academy",
        ["freecodecamp.org"] = "freeCodeCamp",
        ["ocw.mit.edu"] = "MIT OpenCourseWare",
        ["learn.microsoft.com"] = "Microsoft Learn",
        ["cs50.harvard.edu"] = "Harvard CS50",
        ["fast.ai"] = "fast.ai",
        ["grow.google"] = "Grow with Google",
        ["skills.google"] = "Google Skills",
        ["cloudskillsboost.google"] = "Google Skills",
        ["alison.com"] = "Alison",
        ["open.edu"] = "The Open University",
        ["futurelearn.com"] = "FutureLearn",
        ["skillbuilder.aws"] = "AWS Skill Builder",
        ["udacity.com"] = "Udacity",
    };

    // Big paid platforms whose sites refuse automated checks (Udemy and Skillshare answer 403) or hold a lot besides courses. A course here cannot be checked by us: the admin opens it, reads it and types its title
    // (and says so on the admin page). Udemy's courses are made by individual instructors, so only courses an admin has looked at belong here. LinkedIn Learning lives under /learning/ on linkedin.com.
    public static readonly IReadOnlyDictionary<string, string> HandCheckedProviders = new Dictionary<string, string>
    {
        ["udemy.com"] = "Udemy",
        ["skillshare.com"] = "Skillshare",
        ["pluralsight.com"] = "Pluralsight",
        ["linkedin.com"] = "LinkedIn Learning",
    };

    public static readonly string[] Costs = ["free", "free-to-audit", "paid"];

    public static void Map(WebApplication app)
    {
        app.MapGet("/api/feed/courses", async (CosmosService cosmos, CancellationToken ct) =>
        {
            var all = await ListAsync(cosmos, ct);
            return Results.Ok(all.Where(c => c.status == "published").OrderByDescending(c => c.addedAt).Take(MaxPublished).Select(ToReply));
        }).RequireAuthorization(Permissions.PracticeInterview).WithTags("FeedCourses");

        // A person's own saved courses. Private to them.
        app.MapGet("/api/feed/courses/me", async (HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            return Results.Ok(Marks(await LoadStateAsync(cosmos, userId, ct)));
        }).RequireAuthorization(Permissions.PracticeInterview).WithTags("FeedCourses");

        app.MapPut("/api/feed/courses/{id}/saved", async (string id, MarkRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!IsCourseId(id)) return Results.NotFound();
            // Adding needs a course that is still showing; taking it off always works, so nobody is stuck holding a course that was pulled.
            if (req.On)
            {
                var course = await GetAsync(cosmos, id, ct);
                if (course is null || course.status != "published") return Results.NotFound();
            }
            var state = await LoadStateAsync(cosmos, userId, ct);
            var now = DateTimeOffset.UtcNow.ToString("o");
            var next = state with { saved = VideoFeed.SetMark(state.saved, id, req.On, now, MaxMarks), updatedAt = now };
            await cosmos.GetContainer("planning").UpsertItemAsync(next, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(Marks(next));
        }).RequireAuthorization(Permissions.PracticeInterview).WithTags("FeedCourses");

        var admin = app.MapGroup("/api/admin/feed-courses").RequireAuthorization(Permissions.ViewSystemSettings).WithTags("FeedCourses");

        admin.MapGet("", async (CosmosService cosmos, CancellationToken ct) =>
            Results.Ok((await ListAsync(cosmos, ct)).OrderByDescending(c => c.addedAt).Select(ToReply)));

        admin.MapPost("", async (AddRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var url = NormaliseUrl(req.Url);
            if (url is null) return Results.BadRequest(new { error = "That is not an https address on an allowed course provider. Allowed: " + string.Join(", ", Providers.Keys.Concat(HandCheckedProviders.Keys).Order()) + " (LinkedIn Learning pages only)." });
            var theme = VideoFeed.CleanTheme(req.Theme);
            if (theme is null) return Results.BadRequest(new { error = "Choose a theme for the course." });
            var cost = CleanCost(req.Cost);
            if (req.Cost is { Length: > 0 } && cost is null) return Results.BadRequest(new { error = "Cost must be free, free-to-audit or paid." });
            var id = CourseId(url);
            if (await GetAsync(cosmos, id, ct) is not null) return Results.Conflict(new { error = "That course is already in the list." });

            // A hand-checked platform cannot be read by the check: the admin must have opened the course and typed its title, and the card is stored as not checked.
            var handChecked = IsHandChecked(url);
            var typedTitle = BookFeed.CleanText(req.Title, MaxTitle);
            if (handChecked && typedTitle is null) return Results.BadRequest(new { error = "This platform cannot be checked automatically. Open the course yourself, then add it with its title." });
            var page = handChecked ? (Title: (string?)null, ImageUrl: (string?)null, SiteName: (string?)null, Error: (string?)null) : await VerifyAsync(url, ct);
            if (page.Error is not null) return Results.BadRequest(new { error = page.Error });

            var title = typedTitle ?? page.Title!;
            var doc = new Course(id, Partition, title, ProviderName(url, page.SiteName), page.ImageUrl ?? "", url, theme, BookFeed.CleanText(req.Why, MaxWhy) ?? "", cost ?? "",
                "published", DateTimeOffset.UtcNow.ToString("o"), ctx.User.FindFirst("sub")?.Value ?? "unknown", !handChecked);
            await cosmos.GetContainer(ContainerName).UpsertItemAsync(doc, new PartitionKey(Partition), cancellationToken: ct);
            return Results.Ok(ToReply(doc));
        });

        admin.MapPatch("/{id}", async (string id, PatchRequest req, CosmosService cosmos, CancellationToken ct) =>
        {
            var doc = IsCourseId(id) ? await GetAsync(cosmos, id, ct) : null;
            if (doc is null) return Results.NotFound();
            var next = doc with
            {
                status = req.Status is "published" or "hidden" ? req.Status : doc.status,
                theme = req.Theme is null ? doc.theme : VideoFeed.CleanTheme(req.Theme) ?? doc.theme,
                why = req.Why is null ? doc.why : BookFeed.CleanText(req.Why, MaxWhy) ?? "",
                title = req.Title is null ? doc.title : BookFeed.CleanText(req.Title, MaxTitle) ?? doc.title,
                cost = req.Cost is null ? doc.cost : CleanCost(req.Cost) ?? "",
            };
            await cosmos.GetContainer(ContainerName).UpsertItemAsync(next, new PartitionKey(Partition), cancellationToken: ct);
            return Results.Ok(ToReply(next));
        });

        admin.MapDelete("/{id}", async (string id, CosmosService cosmos, CancellationToken ct) =>
        {
            if (!IsCourseId(id)) return Results.NotFound();
            try { await cosmos.GetContainer(ContainerName).DeleteItemAsync<Course>(id, new PartitionKey(Partition), cancellationToken: ct); }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* already gone */ }
            return Results.NoContent();
        });
    }

    // ---- pure rules (tested) ----

    public static bool IsCourseId(string? s) => s is { Length: 20 } && s.All(c => c is (>= '0' and <= '9') or (>= 'a' and <= 'f'));

    /// <summary>The provider's key in <see cref="Providers"/> for a host (exact or a subdomain), or null when it is not an allowed provider.</summary>
    public static string? ProviderKey(string? host)
    {
        var h = (host ?? "").ToLowerInvariant().TrimEnd('.');
        return Providers.Keys.FirstOrDefault(k => h == k || h.EndsWith("." + k));
    }

    /// <summary>The key in <see cref="HandCheckedProviders"/> for a host, or null. LinkedIn only counts for its /learning/ pages, so a profile or post on linkedin.com is never accepted.</summary>
    public static string? HandCheckedKey(string? host, string? path)
    {
        var h = (host ?? "").ToLowerInvariant().TrimEnd('.');
        var key = HandCheckedProviders.Keys.FirstOrDefault(k => h == k || h.EndsWith("." + k));
        if (key == "linkedin.com" && !(path ?? "").StartsWith("/learning/", StringComparison.OrdinalIgnoreCase)) return null;
        return key;
    }

    /// <summary>True when an address is on a hand-checked platform (see <see cref="HandCheckedProviders"/>) rather than an official provider the page check can read.</summary>
    public static bool IsHandChecked(string normalisedUrl) { var u = new Uri(normalisedUrl); return ProviderKey(u.Host) is null && HandCheckedKey(u.Host, u.AbsolutePath) is not null; }

    /// <summary>
    /// A clean https address for a course: https only, an allowed provider, no login details or odd port, no fragment, and tracking parameters removed. Anything else gives null.
    /// </summary>
    public static string? NormaliseUrl(string? input)
    {
        if (!Uri.TryCreate((input ?? "").Trim(), UriKind.Absolute, out var u)) return null;
        if (u.Scheme != Uri.UriSchemeHttps || u.UserInfo.Length > 0 || !u.IsDefaultPort || (ProviderKey(u.Host) is null && HandCheckedKey(u.Host, u.AbsolutePath) is null)) return null;
        var kept = u.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Where(p => !Regex.IsMatch(p, @"^(utm_[a-z]+|fbclid|gclid|ref|source)=", RegexOptions.IgnoreCase));
        var query = string.Join("&", kept);
        return new UriBuilder(u) { Fragment = "", Query = query }.Uri.ToString();
    }

    /// <summary>One id per course address: the first 20 hex digits of the address's SHA-256 (the address itself has slashes, which a document id cannot).</summary>
    public static string CourseId(string normalisedUrl) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(normalisedUrl.ToLowerInvariant()))).ToLowerInvariant()[..20];

    /// <summary>"free", "free-to-audit" or "paid" (case and spaces forgiven), or null for anything else.</summary>
    public static string? CleanCost(string? cost)
    {
        var c = (cost ?? "").Trim().ToLowerInvariant().Replace(' ', '-');
        return Costs.Contains(c) ? c : null;
    }

    private static string StripWww(string host) => host.StartsWith("www.", StringComparison.OrdinalIgnoreCase) ? host[4..] : host;

    /// <summary>
    /// True when a page the request ended on is the page that was asked for: the same host (www ignored) and the same path (case and a trailing slash ignored). The query is ignored.
    /// A retired course that redirects to a generic landing page fails this, so it is never added as if it were still there.
    /// </summary>
    public static bool SamePage(Uri requested, Uri final) =>
        string.Equals(StripWww(requested.Host), StripWww(final.Host), StringComparison.OrdinalIgnoreCase)
        && string.Equals(requested.AbsolutePath.TrimEnd('/'), final.AbsolutePath.TrimEnd('/'), StringComparison.OrdinalIgnoreCase);

    /// <summary>The name shown on the card: our own name for the provider, so an odd site name from the page's tags never appears as the provider.</summary>
    public static string ProviderName(string normalisedUrl, string? siteName)
    {
        var host = new Uri(normalisedUrl).Host;
        var key = ProviderKey(host);
        if (key is not null) return Providers[key];
        var hand = HandCheckedKey(host, new Uri(normalisedUrl).AbsolutePath);
        return hand is not null ? HandCheckedProviders[hand] : BookFeed.CleanText(siteName, 60) ?? StripWww(host);
    }

    private static string? Meta(string html, string name)
    {
        var n = Regex.Escape(name);
        var m = Regex.Match(html, $"<meta[^>]+(?:property|name)\\s*=\\s*[\"']{n}[\"'][^>]*?content\\s*=\\s*[\"']([^\"']*)[\"']", RegexOptions.IgnoreCase | RegexOptions.Singleline)
             ?? Match.Empty;
        if (!m.Success) m = Regex.Match(html, $"<meta[^>]+content\\s*=\\s*[\"']([^\"']*)[\"'][^>]*?(?:property|name)\\s*=\\s*[\"']{n}[\"']", RegexOptions.IgnoreCase | RegexOptions.Singleline);
        return m.Success ? WebUtility.HtmlDecode(m.Groups[1].Value) : null;
    }

    /// <summary>
    /// Reads the page's own title (Open Graph title, else the title tag), picture (Open Graph image, made absolute, https only) and site name. A page with no title is refused.
    /// </summary>
    public static (string? Title, string? ImageUrl, string? SiteName, string? Error) ReadPage(string html, Uri pageUri)
    {
        var title = Meta(html, "og:title");
        if (string.IsNullOrWhiteSpace(title))
        {
            var t = Regex.Match(html, @"<title[^>]*>(.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline);
            title = t.Success ? WebUtility.HtmlDecode(t.Groups[1].Value) : null;
        }
        title = BookFeed.CleanText(title, MaxTitle);
        if (title is null) return (null, null, null, "The page has no title, so it cannot be shown. Add the course with a title of your own.");

        string? image = null;
        if (Meta(html, "og:image") is { Length: > 0 } raw && Uri.TryCreate(pageUri, raw.Trim(), out var iu) && iu.Scheme == Uri.UriSchemeHttps && iu.UserInfo.Length == 0) image = iu.ToString();
        return (title, image, BookFeed.CleanText(Meta(html, "og:site_name"), 60), null);
    }

    // ---- fetching ----

    private static async Task<(string? Title, string? ImageUrl, string? SiteName, string? Error)> VerifyAsync(string url, CancellationToken ct)
    {
        var start = new Uri(url);
        try
        {
            // Redirects are followed by hand so that every hop stays on an allowed provider.
            using var http = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromSeconds(12) };
            http.DefaultRequestHeaders.UserAgent.ParseAdd("TheInterviewChair-feed/1.0 (francis@percentile.one)");
            http.DefaultRequestHeaders.Accept.ParseAdd("text/html");
            var current = start;
            for (var hop = 0; hop < 4; hop++)
            {
                using var res = await http.GetAsync(current, HttpCompletionOption.ResponseHeadersRead, ct);
                if ((int)res.StatusCode is >= 300 and < 400 && res.Headers.Location is { } loc)
                {
                    var next = new Uri(current, loc);
                    if (next.Scheme != Uri.UriSchemeHttps || ProviderKey(next.Host) is null)
                        return (null, null, null, $"That address now goes to {next.Host}, which is not an allowed provider.");
                    current = next;
                    continue;
                }
                if (res.StatusCode != HttpStatusCode.OK)
                    return (null, null, null, res.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.TooManyRequests
                        ? $"The provider's site would not let the check read that page ({(int)res.StatusCode}). Try another address for the course."
                        : $"The provider's site answered {(int)res.StatusCode} for that address, so the course may have moved or gone.");
                if (!SamePage(start, current))
                    return (null, null, null, $"That address now goes to a different page ({current}). If that is the course you mean, add that address instead.");
                await using var stream = await res.Content.ReadAsStreamAsync(ct);
                var buffer = new byte[MaxPageBytes];
                var read = 0;
                while (read < buffer.Length) { var n = await stream.ReadAsync(buffer.AsMemory(read, buffer.Length - read), ct); if (n == 0) break; read += n; }
                return ReadPage(Encoding.UTF8.GetString(buffer, 0, read), current);
            }
            return (null, null, null, "That address redirects too many times.");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return (null, null, null, "The provider's site did not answer just now. Try again in a minute.");
        }
    }

    // ---- storage and shaping ----

    private static string? UserId(HttpContext ctx) => ctx.User.FindFirst("sub")?.Value is { Length: > 0 } s ? s : null;

    private static async Task<CourseState> LoadStateAsync(CosmosService cosmos, string userId, CancellationToken ct)
    {
        try { return (await cosmos.GetContainer("planning").ReadItemAsync<CourseState>(StateDocId, new PartitionKey(userId), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return new CourseState(StateDocId, userId, StateDocId, [], DateTimeOffset.UtcNow.ToString("o")); }
    }

    private static async Task<Course?> GetAsync(CosmosService cosmos, string id, CancellationToken ct)
    {
        try { return (await cosmos.GetContainer(ContainerName).ReadItemAsync<Course>(id, new PartitionKey(Partition), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return null; }
    }

    private static async Task<List<Course>> ListAsync(CosmosService cosmos, CancellationToken ct)
    {
        var list = new List<Course>();
        using var feed = cosmos.GetContainer(ContainerName).GetItemQueryIterator<Course>(new QueryDefinition("SELECT * FROM c"),
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(Partition) });
        while (feed.HasMoreResults) list.AddRange(await feed.ReadNextAsync(ct));
        return list;
    }

    private static CoursesMarks Marks(CourseState s) => new(s.saved.Select(m => m.id).ToList());
    public static CourseReply ToReply(Course c) => new(c.id, c.title, c.provider, c.imageUrl, c.url, c.theme, c.why, c.cost, c.status, c.addedAt, c.verified);

    public record Course(string id, string pk, string title, string provider, string imageUrl, string url, string theme, string why, string cost, string status, string addedAt, string addedBy, bool verified = true);
    public record CourseReply(string id, string title, string provider, string imageUrl, string url, string theme, string why, string cost, string status, string addedAt, bool verified = true);
    public record CourseState(string id, string userId, string type, List<VideoFeed.Mark> saved, string updatedAt);
    public record CoursesMarks(List<string> saved);
    public record MarkRequest(bool On);
    public record AddRequest(string Url, string Theme, string? Why = null, string? Cost = null, string? Title = null);
    public record PatchRequest(string? Status, string? Theme, string? Why, string? Cost, string? Title);
}
