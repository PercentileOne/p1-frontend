using System.Collections.Concurrent;
using System.Globalization;
using System.Xml.Linq;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.CareerNews;

/// <summary>
/// Real "Career Intelligence" news, shared live across every portal — replaces a prior
/// version that had GPT-4o-mini INVENT headlines and attribute them to real outlets (BBC
/// News, LinkedIn Economic Graph, etc.), discovered live 2026-09-10. Every item here is a
/// real article from a real publisher's own public RSS feed — no generation involved.
///
/// Deliberately does NOT use Google News' search-by-query RSS for personalisation, despite
/// it being the obvious free option for "news about .NET Developer jobs" — its own feed
/// copyright notice explicitly restricts it to "personal, non-commercial use" and forbids
/// "any other use" outright. Personalisation instead ranks REAL articles already pulled from
/// the legitimate feeds below by keyword relevance to the candidate's job title — it can
/// reorder real headlines, never invent one.
/// </summary>
public static class Endpoint
{
    // Process-lifetime cache — RSS content doesn't need per-request freshness, and this
    // avoids hammering external feeds on every dashboard load across every portal. Lost on
    // restart/redeploy, which just means the next request re-pays the (cheap) fetch cost —
    // no need for this to survive a restart the way real user data would.
    private static readonly ConcurrentDictionary<string, (DateTimeOffset expiresAt, List<NewsItem> items)> _cache = new();
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(20);

    public static void Map(WebApplication app)
    {
        app.MapGet("/api/career-news", async (string? jobTitle, CosmosService cosmos) =>
        {
            var items = await GetAllNewsAsync(cosmos);
            var ranked = string.IsNullOrWhiteSpace(jobTitle) ? items : RankByRelevance(items, jobTitle);
            return Results.Ok(new { news = ranked.Take(8) });
        }).AllowAnonymous();

        app.MapGet("/api/admin/news-feeds", async (CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("newsFeedSources");
            var query = new QueryDefinition("SELECT * FROM c");
            var results = new List<NewsFeedSourceDoc>();
            using var feed = container.GetItemQueryIterator<NewsFeedSourceDoc>(query);
            while (feed.HasMoreResults) results.AddRange(await feed.ReadNextAsync());
            return Results.Ok(results);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        app.MapPost("/api/admin/news-feeds", async (UpsertFeedRequest req, CosmosService cosmos) =>
        {
            if (string.IsNullOrWhiteSpace(req.Label) || string.IsNullOrWhiteSpace(req.Url) || string.IsNullOrWhiteSpace(req.Category))
                return Results.BadRequest(new { error = "label, category and url are required" });

            var doc = new NewsFeedSourceDoc(
                id: string.IsNullOrWhiteSpace(req.Id) ? Guid.NewGuid().ToString() : req.Id,
                pk: "feed",
                label: req.Label.Trim(),
                category: req.Category.Trim(),
                url: req.Url.Trim(),
                active: req.Active,
                updatedAt: DateTimeOffset.UtcNow);

            var container = cosmos.GetContainer("newsFeedSources");
            await container.UpsertItemAsync(doc, new PartitionKey("feed"));
            _cache.Clear(); // a newly-added or edited source should show up on the next load, not in 20 minutes
            return Results.Ok(doc);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        app.MapDelete("/api/admin/news-feeds/{id}", async (string id, CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("newsFeedSources");
            try
            {
                await container.DeleteItemAsync<NewsFeedSourceDoc>(id, new PartitionKey("feed"));
                _cache.Clear();
                return Results.Ok();
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }
        }).RequireAuthorization(Permissions.ViewSystemSettings);
    }

    private static async Task<List<NewsItem>> GetAllNewsAsync(CosmosService cosmos)
    {
        const string cacheKey = "all";
        if (_cache.TryGetValue(cacheKey, out var cached) && cached.expiresAt > DateTimeOffset.UtcNow)
            return cached.items;

        var sources = await GetActiveFeedSourcesAsync(cosmos);
        var results = await Task.WhenAll(sources.Select(FetchFeedAsync));
        var merged = results.SelectMany(r => r).OrderByDescending(i => i.publishedAt).ToList();

        _cache[cacheKey] = (DateTimeOffset.UtcNow.Add(CacheTtl), merged);
        return merged;
    }

    private static async Task<List<NewsFeedSourceDoc>> GetActiveFeedSourcesAsync(CosmosService cosmos)
    {
        var container = cosmos.GetContainer("newsFeedSources");
        var query = new QueryDefinition("SELECT * FROM c WHERE c.active = true");
        var results = new List<NewsFeedSourceDoc>();
        using var feed = container.GetItemQueryIterator<NewsFeedSourceDoc>(query);
        while (feed.HasMoreResults) results.AddRange(await feed.ReadNextAsync());
        return results;
    }

    // One broken/slow/renamed feed must never take the whole panel down for every portal —
    // caught and skipped, not propagated.
    private static async Task<List<NewsItem>> FetchFeedAsync(NewsFeedSourceDoc source)
    {
        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(8) };
            http.DefaultRequestHeaders.UserAgent.ParseAdd("TheInterviewChair.com/1.0 (+https://www.theinterviewchair.com)");
            var xml = await http.GetStringAsync(source.url);
            var doc = XDocument.Parse(xml);

            return doc.Descendants("item")
                .Take(12)
                .Select(item =>
                {
                    var title = ((string?)item.Element("title"))?.Trim() ?? "";
                    var link = ((string?)item.Element("link"))?.Trim() ?? "";
                    var pubDateRaw = (string?)item.Element("pubDate");
                    var publishedAt = DateTimeOffset.TryParse(pubDateRaw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed)
                        ? parsed
                        : DateTimeOffset.UtcNow;
                    return new NewsItem(source.category, title, source.label, link, publishedAt);
                })
                .Where(i => i.headline.Length > 0 && i.url.Length > 0)
                .ToList();
        }
        catch
        {
            return new List<NewsItem>();
        }
    }

    // Real articles only — this reorders what FetchFeedAsync already pulled from legitimate
    // feeds, it can never introduce a headline that wasn't actually published by one of them.
    // Keyword match against the job title; anything unmatched still shows, just lower down,
    // so a candidate in a niche role still sees a full panel rather than an empty one.
    private static List<NewsItem> RankByRelevance(List<NewsItem> items, string jobTitle)
    {
        var keywords = jobTitle
            .ToLowerInvariant()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 2)
            .ToArray();
        if (keywords.Length == 0) return items;

        var matched = items.Where(i => keywords.Any(k => i.headline.Contains(k, StringComparison.OrdinalIgnoreCase))).ToList();
        var rest = items.Except(matched).ToList();
        return matched.Concat(rest).ToList();
    }
}

public record UpsertFeedRequest(string? Id, string Label, string Category, string Url, bool Active);

public record NewsFeedSourceDoc(
    string id,
    string pk,
    string label,
    string category,
    string url,
    bool active,
    DateTimeOffset updatedAt);

public record NewsItem(string tag, string headline, string source, string url, DateTimeOffset publishedAt);
