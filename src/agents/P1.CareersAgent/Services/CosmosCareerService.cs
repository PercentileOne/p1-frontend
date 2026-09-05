using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using Microsoft.Extensions.Configuration;
using P1.CareersAgent.Models;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace P1.CareersAgent.Services;

public class CosmosCareerService
{
    private readonly Container _container;

    public CosmosCareerService(IConfiguration config)
    {
        var connectionString = config["CosmosConnectionString"]
            ?? throw new InvalidOperationException("CosmosConnectionString not configured");
        var dbName    = config["CosmosDatabaseName"]    ?? "interviewme";
        var container = config["CosmosContainerName"]   ?? "careers";

        var client = new CosmosClient(connectionString, new CosmosClientOptions
        {
            SerializerOptions = new CosmosSerializationOptions
            {
                PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase
            }
        });

        _container = client.GetContainer(dbName, container);
    }

    public async Task<List<CareerDocument>> GetCareersForSalaryUpdate(int batchSize = 100)
    {
        // Careers whose salary was last updated more than 6 days ago
        var cutoff = DateTime.UtcNow.AddDays(-6).ToString("yyyy-MM-dd");
        var query  = _container.GetItemLinqQueryable<CareerDocument>()
            .Where(c => string.Compare(c.SalaryLastUpdated, cutoff) < 0)
            .Take(batchSize)
            .ToFeedIterator();

        return await DrainIterator(query);
    }

    public async Task<List<CareerDocument>> GetLowConfidenceCareers(int batchSize = 50)
    {
        var query = _container.GetItemLinqQueryable<CareerDocument>()
            .Where(c => c.Confidence < 0.8)
            .OrderBy(c => c.Confidence)
            .Take(batchSize)
            .ToFeedIterator();

        return await DrainIterator(query);
    }

    public async Task<HashSet<string>> GetAllCareerTitlesAsync()
    {
        var sql = new QueryDefinition("SELECT VALUE c.title FROM c");
        var iter = _container.GetItemQueryIterator<string>(sql);
        var titles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        while (iter.HasMoreResults)
        {
            var page = await iter.ReadNextAsync();
            foreach (var t in page) titles.Add(t);
        }

        return titles;
    }

    // ── API query methods ──────────────────────────────────────────────────────

    public async Task<List<CareerDocument>> SearchAsync(string q, int top = 12)
    {
        // Case-insensitive CONTAINS search on title, category, subcategory, tags and aliases.
        // aliases carries ~1,400 real alternate job titles from the SOC/O*NET import (regional
        // variants, abbreviations like "CEO"/"CTO", etc.) — this query never actually touched
        // that field despite the old comment claiming it did, so none of that data was ever
        // reachable via search since the import shipped.
        //
        // Over-fetches a wider candidate pool than the caller wants, then ranks in C# rather
        // than trusting Cosmos's plain alphabetical order. This matters a lot for short queries
        // like "CTO" — CONTAINS matches it as a bare substring inside unrelated words
        // ("direCTOr", "operaTOr"...), and without re-ranking, dozens of those alphabetically
        // beat the one real match ("Chief Technology Officer") out of the top N the UI shows.
        var lower = q.ToLowerInvariant();
        const int candidatePoolSize = 80;
        var sql = new QueryDefinition(
            "SELECT TOP @top * FROM c WHERE " +
            "CONTAINS(LOWER(c.title), @q) OR " +
            "CONTAINS(LOWER(c.category), @q) OR " +
            "CONTAINS(LOWER(c.subcategory), @q) OR " +
            "EXISTS(SELECT VALUE t FROM t IN c.tags WHERE CONTAINS(LOWER(t), @q)) OR " +
            "EXISTS(SELECT VALUE a FROM a IN c.aliases WHERE CONTAINS(LOWER(a), @q))")
            .WithParameter("@q", lower)
            .WithParameter("@top", candidatePoolSize);

        var candidates = await DrainQueryIterator(_container.GetItemQueryIterator<CareerDocument>(sql));

        return candidates
            .Select(c => new { Doc = c, Rank = RelevanceRank(c, lower) })
            .OrderBy(x => x.Rank)
            .ThenBy(x => x.Doc.Title, StringComparer.OrdinalIgnoreCase)
            .Take(top)
            .Select(x => x.Doc)
            .ToList();
    }

    // A match against the career's own title always outranks a match that only exists because
    // some OTHER career lists the query as one of its aliases — e.g. typing "Software e" must
    // surface the actual "Software Engineer" career first, not ".NET Developer" or "Golang
    // Developer" just because both happen to list "Software Engineer" as an alias. The old
    // version ranked title and alias matches of equal strength identically, so ties fell back to
    // plain alphabetical order — "." and "G" sort before "S", which is exactly backwards from
    // what a candidate typing a real prefix of the title they want would expect.
    private static int RelevanceRank(CareerDocument c, string lowerQuery)
    {
        var title = c.Title?.ToLowerInvariant() ?? "";
        var aliases = c.Aliases.Select(a => a.ToLowerInvariant()).ToList();
        var boundaryPattern = $@"\b{Regex.Escape(lowerQuery)}\b";

        if (title == lowerQuery) return 0;
        if (title.StartsWith(lowerQuery)) return 1;
        if (Regex.IsMatch(title, boundaryPattern)) return 2;

        if (aliases.Any(a => a == lowerQuery)) return 3;
        if (aliases.Any(a => a.StartsWith(lowerQuery))) return 4;
        if (aliases.Any(a => Regex.IsMatch(a, boundaryPattern))) return 5;

        return 6; // bare substring match only (category/subcategory/tags, or mid-word collision)
    }

    public async Task<List<CareerDocument>> GetByCategoryAsync(string category, int top = 20)
    {
        var sql = new QueryDefinition(
            "SELECT TOP @top * FROM c WHERE c.category = @cat ORDER BY c.title")
            .WithParameter("@cat", category)
            .WithParameter("@top", top);

        return await DrainQueryIterator(_container.GetItemQueryIterator<CareerDocument>(sql));
    }

    public async Task<List<CareerDocument>> GetRecentAsync(int top = 50)
    {
        // lastUpdated is a plain "yyyy-MM-dd" string, so lexicographic ORDER BY sorts
        // chronologically for free — same trick GetCareersForSalaryUpdate relies on.
        var sql = new QueryDefinition(
            "SELECT TOP @top * FROM c ORDER BY c.lastUpdated DESC")
            .WithParameter("@top", top);

        return await DrainQueryIterator(_container.GetItemQueryIterator<CareerDocument>(sql));
    }

    public async Task<CareerDocument?> GetByIdAsync(string id)
    {
        // Cross-partition — id alone doesn't tell us the category (partition key), and this
        // is only ever called from the admin Edit action, not a hot path.
        var sql = new QueryDefinition("SELECT * FROM c WHERE c.id = @id").WithParameter("@id", id);
        var results = await DrainQueryIterator(_container.GetItemQueryIterator<CareerDocument>(sql));
        return results.FirstOrDefault();
    }

    public async Task DeleteAsync(string id, string category)
    {
        await _container.DeleteItemAsync<CareerDocument>(id, new PartitionKey(category));
    }

    public async Task<List<CategoryCount>> GetCategoryCountsAsync()
    {
        var sql = new QueryDefinition(
            "SELECT c.category, COUNT(1) AS count FROM c GROUP BY c.category ORDER BY c.category");

        var iter    = _container.GetItemQueryIterator<CategoryCount>(sql);
        var results = new List<CategoryCount>();
        while (iter.HasMoreResults)
        {
            var page = await iter.ReadNextAsync();
            results.AddRange(page);
        }
        return results.OrderByDescending(x => x.Count).ToList();
    }

    public async Task UpsertAsync(CareerDocument career)
    {
        await _container.UpsertItemAsync(career, new PartitionKey(career.Category));
    }

    public async Task UpsertSalaryAsync(CareerDocument career)
    {
        // Patch only the salary and timestamp fields — avoids re-writing the whole document
        var patches = new List<PatchOperation>
        {
            PatchOperation.Replace("/salary",            career.Salary),
            PatchOperation.Replace("/workforce",         career.Workforce),
            PatchOperation.Replace("/salaryLastUpdated", career.SalaryLastUpdated),
            PatchOperation.Replace("/lastUpdated",       career.LastUpdated),
        };
        // /contractRate may not exist yet on documents written before this field existed —
        // Add rather than Replace would fail with Replace on a genuinely missing path, and
        // Set (upsert-a-path) isn't available on PatchOperation, so branch on presence.
        patches.Add(career.ContractRate is null
            ? PatchOperation.Set("/contractRate", (ContractRateData?)null)
            : PatchOperation.Set("/contractRate", career.ContractRate));

        await _container.PatchItemAsync<CareerDocument>(
            career.Id,
            new PartitionKey(career.Category),
            patches);
    }

    private static async Task<List<CareerDocument>> DrainIterator(FeedIterator<CareerDocument> iter)
    {
        var results = new List<CareerDocument>();
        while (iter.HasMoreResults)
        {
            var page = await iter.ReadNextAsync();
            results.AddRange(page);
        }
        return results;
    }

    private static async Task<List<CareerDocument>> DrainQueryIterator(FeedIterator<CareerDocument> iter)
    {
        var results = new List<CareerDocument>();
        while (iter.HasMoreResults)
        {
            var page = await iter.ReadNextAsync();
            results.AddRange(page);
        }
        return results;
    }
}
