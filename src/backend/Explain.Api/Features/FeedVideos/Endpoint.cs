using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.FeedVideos;

/// <summary>
/// The feed's video strip (Francis, 2026-10-18; docs/specs/agent-driven-feed.md section 5). A short list of real videos from official YouTube channels, shown as a row of tall cards.
/// Nothing is copied or re-hosted: a card shows the video's own thumbnail and, when tapped, plays it in YouTube's own player (the privacy-enhanced youtube-nocookie one), with the channel credited.
/// The verifier step is YouTube's own oEmbed answer, asked when an admin adds a video: it must exist, be public, and have embedding switched on by its owner (YouTube answers 401 when it is off).
/// So a video that cannot be shown never reaches the strip, and the title, channel and thumbnail come from YouTube, not from us. One Cosmos document per video (id = the YouTube video id),
/// one partition. Admin adds and hides; every signed-in candidate reads the published ones.
/// </summary>
public static class Endpoint
{
    public const string ContainerName = "feedVideos";
    public const string Partition = "video";
    public const int MaxPublished = 200;
    public const int MaxMarks = 500;
    private const string StateDocId = "feedvideo-state";

    /// <summary>The general subjects from the feed spec, plus the motivation, business, success, productivity and routines themes Francis asked for on 18 Oct 2026. A video carries one, so each person's ranking can learn what they respond to.</summary>
    public static readonly string[] Themes = ["pitching", "rejection", "founders", "interviews", "motivation", "business", "success", "productivity", "routines", "habits", "learning", "speaking", "career-change", "software-and-cloud"];

    public static void Map(WebApplication app)
    {
        app.MapGet("/api/feed/videos", async (CosmosService cosmos, CancellationToken ct) =>
        {
            var all = await ListAsync(cosmos, ct);
            return Results.Ok(all.Where(v => v.status == "published").OrderByDescending(v => v.addedAt).Take(MaxPublished).Select(ToReply));
        }).RequireAuthorization(Permissions.PracticeInterview).WithTags("FeedVideos");

        // A person's own saved ("watch later") and liked videos. Private to them: kept in one small document in their own partition of the "planning" container.
        app.MapGet("/api/feed/videos/me", async (HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            var state = await LoadStateAsync(cosmos, userId, ct);
            return Results.Ok(new MarksReply(state.saved.Select(m => m.id).ToList(), state.liked.Select(m => m.id).ToList()));
        }).RequireAuthorization(Permissions.PracticeInterview).WithTags("FeedVideos");

        app.MapPut("/api/feed/videos/{id}/{mark:regex(^(saved|liked)$)}", async (string id, string mark, MarkRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var userId = UserId(ctx); if (userId is null) return Results.Unauthorized();
            if (!IsVideoId(id)) return Results.NotFound();
            // Adding needs a video that is still showing; taking a mark off always works, so nobody is stuck holding a video that was pulled.
            if (req.On)
            {
                var video = await GetAsync(cosmos, id, ct);
                if (video is null || video.status != "published") return Results.NotFound();
            }
            var state = await LoadStateAsync(cosmos, userId, ct);
            var now = DateTimeOffset.UtcNow.ToString("o");
            var next = mark == "saved" ? state with { saved = SetMark(state.saved, id, req.On, now, MaxMarks), updatedAt = now }
                                       : state with { liked = SetMark(state.liked, id, req.On, now, MaxMarks), updatedAt = now };
            await cosmos.GetContainer("planning").UpsertItemAsync(next, new PartitionKey(userId), cancellationToken: ct);
            return Results.Ok(new MarksReply(next.saved.Select(m => m.id).ToList(), next.liked.Select(m => m.id).ToList()));
        }).RequireAuthorization(Permissions.PracticeInterview).WithTags("FeedVideos");

        var admin = app.MapGroup("/api/admin/feed-videos").RequireAuthorization(Permissions.ViewSystemSettings).WithTags("FeedVideos");

        admin.MapGet("", async (CosmosService cosmos, CancellationToken ct) =>
            Results.Ok((await ListAsync(cosmos, ct)).OrderByDescending(v => v.addedAt).Select(ToReply)));

        admin.MapPost("", async (AddRequest req, HttpContext ctx, CosmosService cosmos, IHttpClientFactory factory, CancellationToken ct) =>
        {
            var id = ParseVideoId(req.Url);
            if (id is null) return Results.BadRequest(new { error = "Paste a YouTube link, such as https://www.youtube.com/watch?v=... or a youtu.be or Shorts link." });
            var theme = CleanTheme(req.Theme);
            if (theme is null) return Results.BadRequest(new { error = "Choose a theme for the video." });

            var existing = await GetAsync(cosmos, id, ct);
            if (existing is not null) return Results.Conflict(new { error = "That video is already in the list." });

            var check = await VerifyAsync(factory.CreateClient(), id, ct);
            if (check.Error is not null) return Results.BadRequest(new { error = check.Error });

            var doc = new FeedVideo(id, Partition, check.Title!, check.Channel!, check.ChannelUrl ?? "", $"https://i.ytimg.com/vi/{id}/hqdefault.jpg",
                theme, "published", DateTimeOffset.UtcNow.ToString("o"), ctx.User.FindFirst("sub")?.Value ?? "unknown");
            await cosmos.GetContainer(ContainerName).UpsertItemAsync(doc, new PartitionKey(Partition), cancellationToken: ct);
            return Results.Ok(ToReply(doc));
        });

        admin.MapPatch("/{id}", async (string id, PatchRequest req, CosmosService cosmos, CancellationToken ct) =>
        {
            var doc = IsVideoId(id) ? await GetAsync(cosmos, id, ct) : null;
            if (doc is null) return Results.NotFound();
            var next = doc with
            {
                status = req.Status is "published" or "hidden" ? req.Status : doc.status,
                theme = req.Theme is null ? doc.theme : CleanTheme(req.Theme) ?? doc.theme,
            };
            await cosmos.GetContainer(ContainerName).UpsertItemAsync(next, new PartitionKey(Partition), cancellationToken: ct);
            return Results.Ok(ToReply(next));
        });

        admin.MapDelete("/{id}", async (string id, CosmosService cosmos, CancellationToken ct) =>
        {
            if (!IsVideoId(id)) return Results.NotFound();
            try { await cosmos.GetContainer(ContainerName).DeleteItemAsync<FeedVideo>(id, new PartitionKey(Partition), cancellationToken: ct); }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* already gone */ }
            return Results.NoContent();
        });
    }

    // ---- pure rules (tested) ----

    private static readonly Regex VideoIdPattern = new("^[A-Za-z0-9_-]{11}$", RegexOptions.Compiled);
    public static bool IsVideoId(string? s) => s is not null && VideoIdPattern.IsMatch(s);

    /// <summary>The 11-character video id from a watch, youtu.be, Shorts, embed or live link (or the bare id). Anything else, including other sites, gives null.</summary>
    public static string? ParseVideoId(string? input)
    {
        var s = (input ?? "").Trim();
        if (s.Length == 0) return null;
        if (IsVideoId(s)) return s;
        if (!Uri.TryCreate(s.Contains("://") ? s : "https://" + s, UriKind.Absolute, out var uri)) return null;
        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.")) host = host[4..];
        if (host.StartsWith("m.")) host = host[2..];
        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        string? candidate = null;
        if (host == "youtu.be") candidate = segments.FirstOrDefault();
        else if (host is "youtube.com" or "youtube-nocookie.com")
        {
            if (segments.Length >= 2 && segments[0] is "shorts" or "embed" or "live" or "v") candidate = segments[1];
            else if (segments.Length == 1 && segments[0] == "watch")
                candidate = System.Web.HttpUtility.ParseQueryString(uri.Query)["v"];
        }
        return IsVideoId(candidate) ? candidate : null;
    }

    /// <summary>Adds or removes one mark, newest first, with no duplicates, keeping at most `cap` (the oldest drop off).</summary>
    public static List<Mark> SetMark(List<Mark> marks, string id, bool on, string now, int cap)
    {
        var rest = marks.Where(m => m.id != id).ToList();
        if (!on) return rest;
        rest.Insert(0, new Mark(id, now));
        return rest.Count > cap ? rest.Take(cap).ToList() : rest;
    }

    public static string? CleanTheme(string? theme)
    {
        var t = (theme ?? "").Trim().ToLowerInvariant();
        return Themes.Contains(t) ? t : null;
    }

    /// <summary>Turns YouTube's oEmbed answer into the verdict. 401 means the owner has switched embedding off, 404 means missing or private.</summary>
    public static (string? Title, string? Channel, string? ChannelUrl, string? Error) ReadOEmbed(HttpStatusCode status, string body)
    {
        if (status == HttpStatusCode.Unauthorized) return (null, null, null, "The owner of that video has switched embedding off, so it cannot be shown here.");
        if (status is HttpStatusCode.NotFound or HttpStatusCode.BadRequest) return (null, null, null, "YouTube could not find that video. It may be private or deleted.");
        if (status != HttpStatusCode.OK) return (null, null, null, "YouTube did not answer just now. Try again in a minute.");
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var title = root.TryGetProperty("title", out var t) ? t.GetString() : null;
            var channel = root.TryGetProperty("author_name", out var a) ? a.GetString() : null;
            var channelUrl = root.TryGetProperty("author_url", out var u) ? u.GetString() : null;
            if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(channel)) return (null, null, null, "YouTube's answer did not include a title and channel.");
            return (title, channel, channelUrl, null);
        }
        catch (JsonException) { return (null, null, null, "YouTube's answer could not be read."); }
    }

    // ---- storage and shaping ----

    private static async Task<(string? Title, string? Channel, string? ChannelUrl, string? Error)> VerifyAsync(HttpClient http, string id, CancellationToken ct)
    {
        try
        {
            http.Timeout = TimeSpan.FromSeconds(10);
            var url = "https://www.youtube.com/oembed?format=json&url=" + Uri.EscapeDataString("https://www.youtube.com/watch?v=" + id);
            using var res = await http.GetAsync(url, ct);
            return ReadOEmbed(res.StatusCode, await res.Content.ReadAsStringAsync(ct));
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return (null, null, null, "YouTube did not answer just now. Try again in a minute.");
        }
    }

    private static string? UserId(HttpContext ctx) => ctx.User.FindFirst("sub")?.Value is { Length: > 0 } s ? s : null;

    private static async Task<VideoState> LoadStateAsync(CosmosService cosmos, string userId, CancellationToken ct)
    {
        try { return (await cosmos.GetContainer("planning").ReadItemAsync<VideoState>(StateDocId, new PartitionKey(userId), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return new VideoState(StateDocId, userId, StateDocId, [], [], DateTimeOffset.UtcNow.ToString("o")); }
    }

    private static async Task<FeedVideo?> GetAsync(CosmosService cosmos, string id, CancellationToken ct)
    {
        try { return (await cosmos.GetContainer(ContainerName).ReadItemAsync<FeedVideo>(id, new PartitionKey(Partition), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return null; }
    }

    private static async Task<List<FeedVideo>> ListAsync(CosmosService cosmos, CancellationToken ct)
    {
        var list = new List<FeedVideo>();
        using var feed = cosmos.GetContainer(ContainerName).GetItemQueryIterator<FeedVideo>(new QueryDefinition("SELECT * FROM c"),
            requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(Partition) });
        while (feed.HasMoreResults) list.AddRange(await feed.ReadNextAsync(ct));
        return list;
    }

    public static VideoReply ToReply(FeedVideo v) => new(v.id, v.title, v.channel, v.channelUrl, v.thumbnail, v.theme, v.status, v.addedAt);

    public record FeedVideo(string id, string pk, string title, string channel, string channelUrl, string thumbnail, string theme, string status, string addedAt, string addedBy);
    public record VideoReply(string id, string title, string channel, string channelUrl, string thumbnail, string theme, string status, string addedAt);
    public record Mark(string id, string at);
    public record VideoState(string id, string userId, string type, List<Mark> saved, List<Mark> liked, string updatedAt);
    public record MarksReply(List<string> saved, List<string> liked);
    public record MarkRequest(bool On);
    public record AddRequest(string Url, string Theme);
    public record PatchRequest(string? Status, string? Theme);
}
