using System.Text.Json;
using System.Text.Json.Serialization;
using System.Xml;

namespace Explain.Api.Infrastructure.YouTube;

public record TedTalkDto(
    string Id,
    string Title,
    string Channel,
    string Duration,
    long ViewCount,
    string PublishedAt,
    string Thumbnail
);

// TED's real, official YouTube channel — every search/seed call is scoped to this channel only,
// so results are always genuine TED talks, never unrelated videos matching the search text.
public class YouTubeService(IConfiguration config, ILogger<YouTubeService> logger)
{
    private const string TedChannelId = "UCAuUUnT6oDeKwE6v1NGQxug";
    private readonly string _apiKey = config["YouTube:ApiKey"] ?? "";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

    // order: "relevance" (best match, YouTube's default), "viewCount" (most popular), or
    // "date" (latest) — passed straight through to YouTube's own search.list `order` param.
    public async Task<List<TedTalkDto>> SearchAsync(string? query, string order, int maxResults, CancellationToken ct)
    {
        if (!IsConfigured) return [];

        using var client = new HttpClient();
        var qParam = string.IsNullOrWhiteSpace(query) ? "" : $"&q={Uri.EscapeDataString(query)}";
        var searchUrl = $"https://www.googleapis.com/youtube/v3/search?part=snippet&channelId={TedChannelId}&type=video&order={order}&maxResults={maxResults}{qParam}&key={_apiKey}";

        var searchResp = await client.GetAsync(searchUrl, ct);
        if (!searchResp.IsSuccessStatusCode)
        {
            var err = await searchResp.Content.ReadAsStringAsync(ct);
            logger.LogError("YouTube search.list error {Status}: {Error}", searchResp.StatusCode, err);
            return [];
        }

        var searchJson = await searchResp.Content.ReadAsStringAsync(ct);
        var searchResult = JsonSerializer.Deserialize<SearchListResponse>(searchJson, JsonOpts);
        var ids = searchResult?.Items?.Select(i => i.Id?.VideoId).Where(id => id is not null).ToList() ?? [];
        if (ids.Count == 0) return [];

        // search.list's snippet has no duration/viewCount — a second call to videos.list is the
        // only way YouTube's API exposes those, so every search is genuinely two HTTP calls.
        var videosUrl = $"https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id={string.Join(",", ids)}&key={_apiKey}";
        var videosResp = await client.GetAsync(videosUrl, ct);
        if (!videosResp.IsSuccessStatusCode)
        {
            var err = await videosResp.Content.ReadAsStringAsync(ct);
            logger.LogError("YouTube videos.list error {Status}: {Error}", videosResp.StatusCode, err);
            return [];
        }
        var videosJson = await videosResp.Content.ReadAsStringAsync(ct);
        var videosResult = JsonSerializer.Deserialize<VideosListResponse>(videosJson, JsonOpts);
        var detailsById = (videosResult?.Items ?? []).ToDictionary(v => v.Id!, v => v);

        var talks = new List<TedTalkDto>();
        foreach (var item in searchResult?.Items ?? [])
        {
            var id = item.Id?.VideoId;
            if (id is null || !detailsById.TryGetValue(id, out var details)) continue;
            talks.Add(new TedTalkDto(
                Id: id,
                Title: item.Snippet?.Title ?? "",
                Channel: item.Snippet?.ChannelTitle ?? "TED",
                Duration: FormatDuration(details.ContentDetails?.Duration ?? "PT0S"),
                ViewCount: long.TryParse(details.Statistics?.ViewCount, out var vc) ? vc : 0,
                PublishedAt: item.Snippet?.PublishedAt ?? "",
                Thumbnail: item.Snippet?.Thumbnails?.Medium?.Url ?? $"https://img.youtube.com/vi/{id}/mqdefault.jpg"
            ));
        }
        return talks;
    }

    // ISO 8601 duration ("PT18M34S") -> "18 min" for anything under an hour, "1h 4m" past that —
    // matches the existing curated list's own "18 min" style already shown elsewhere.
    private static string FormatDuration(string iso8601)
    {
        try
        {
            var span = XmlConvert.ToTimeSpan(iso8601);
            if (span.TotalHours >= 1) return $"{(int)span.TotalHours}h {span.Minutes}m";
            return $"{span.Minutes} min";
        }
        catch
        {
            return "";
        }
    }

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private class SearchListResponse { [JsonPropertyName("items")] public List<SearchItem>? Items { get; set; } }
    private class SearchItem
    {
        [JsonPropertyName("id")] public SearchItemId? Id { get; set; }
        [JsonPropertyName("snippet")] public Snippet? Snippet { get; set; }
    }
    private class SearchItemId { [JsonPropertyName("videoId")] public string? VideoId { get; set; } }
    private class Snippet
    {
        [JsonPropertyName("title")] public string? Title { get; set; }
        [JsonPropertyName("channelTitle")] public string? ChannelTitle { get; set; }
        [JsonPropertyName("publishedAt")] public string? PublishedAt { get; set; }
        [JsonPropertyName("thumbnails")] public Thumbnails? Thumbnails { get; set; }
    }
    private class Thumbnails { [JsonPropertyName("medium")] public Thumbnail? Medium { get; set; } }
    private class Thumbnail { [JsonPropertyName("url")] public string? Url { get; set; } }

    private class VideosListResponse { [JsonPropertyName("items")] public List<VideoItem>? Items { get; set; } }
    private class VideoItem
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("contentDetails")] public ContentDetails? ContentDetails { get; set; }
        [JsonPropertyName("statistics")] public Statistics? Statistics { get; set; }
    }
    private class ContentDetails { [JsonPropertyName("duration")] public string? Duration { get; set; } }
    private class Statistics { [JsonPropertyName("viewCount")] public string? ViewCount { get; set; } }
}
