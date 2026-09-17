using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using P1.ExamCatalogAgent.Models;
using System.Text.RegularExpressions;

namespace P1.ExamCatalogAgent.Services;

public record CategoryCount(string Category, int Count);

public class CosmosExamCatalogService
{
    private readonly Container _container;

    public CosmosExamCatalogService(IConfiguration config)
    {
        var connectionString = config["CosmosConnectionString"]
            ?? throw new InvalidOperationException("CosmosConnectionString not configured");
        var dbName = config["CosmosDatabaseName"] ?? "interviewme";
        var containerName = config["CosmosContainerName"] ?? "examCatalog";

        var client = new CosmosClient(connectionString, new CosmosClientOptions
        {
            SerializerOptions = new CosmosSerializationOptions
            {
                PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase
            }
        });

        _container = client.GetContainer(dbName, containerName);
    }

    // Case-insensitive CONTAINS search on name/category/vendor/examCode/aliases, over-fetching a
    // wider candidate pool then re-ranking in C# — same reasoning as CosmosCareerService.SearchAsync:
    // Cosmos's plain result order lets a short query match mid-word in unrelated entries ahead of
    // the one real match. category, when given, is an exact-match pre-filter (it's the partition
    // key), not part of the CONTAINS clause.
    public async Task<List<ExamCatalogEntry>> SearchAsync(string q, string? category, int top = 12)
    {
        var lower = q.ToLowerInvariant();
        const int candidatePoolSize = 80;

        var hasCategory = !string.IsNullOrWhiteSpace(category);
        var sql = "SELECT TOP @top * FROM c WHERE (" +
            "CONTAINS(LOWER(c.name), @q) OR " +
            "CONTAINS(LOWER(c.vendor), @q) OR " +
            "CONTAINS(LOWER(c.examCode), @q) OR " +
            "EXISTS(SELECT VALUE a FROM a IN c.aliases WHERE CONTAINS(LOWER(a), @q)))" +
            (hasCategory ? " AND c.category = @cat" : "");

        var query = new QueryDefinition(sql).WithParameter("@q", lower).WithParameter("@top", candidatePoolSize);
        var requestOptions = new QueryRequestOptions();
        if (hasCategory)
        {
            query = query.WithParameter("@cat", category);
            requestOptions.PartitionKey = new PartitionKey(category);
        }

        var candidates = await DrainIterator(_container.GetItemQueryIterator<ExamCatalogEntry>(query, requestOptions: requestOptions));

        return candidates
            .Select(c => new { Doc = c, Rank = RelevanceRank(c, lower) })
            .OrderBy(x => x.Rank)
            .ThenBy(x => x.Doc.Name, StringComparer.OrdinalIgnoreCase)
            .Take(top)
            .Select(x => x.Doc)
            .ToList();
    }

    private static int RelevanceRank(ExamCatalogEntry c, string lowerQuery)
    {
        var name = c.Name?.ToLowerInvariant() ?? "";
        var examCode = c.ExamCode?.ToLowerInvariant() ?? "";
        var aliases = c.Aliases.Select(a => a.ToLowerInvariant()).ToList();
        var boundaryPattern = $@"\b{Regex.Escape(lowerQuery)}\b";

        if (name == lowerQuery || examCode == lowerQuery) return 0;
        if (name.StartsWith(lowerQuery) || examCode.StartsWith(lowerQuery)) return 1;
        if (Regex.IsMatch(name, boundaryPattern)) return 2;

        if (aliases.Any(a => a == lowerQuery)) return 3;
        if (aliases.Any(a => a.StartsWith(lowerQuery))) return 4;
        if (aliases.Any(a => Regex.IsMatch(a, boundaryPattern))) return 5;

        return 6; // bare substring match only (vendor, or mid-word collision)
    }

    public async Task<List<CategoryCount>> CategoriesAsync()
    {
        var sql = new QueryDefinition("SELECT c.category, COUNT(1) AS count FROM c GROUP BY c.category");
        var iter = _container.GetItemQueryIterator<CategoryCount>(sql);
        var results = new List<CategoryCount>();
        while (iter.HasMoreResults)
        {
            results.AddRange(await iter.ReadNextAsync());
        }
        return results.OrderByDescending(x => x.Count).ToList();
    }

    public async Task<ExamCatalogEntry?> GetByIdAsync(string id)
    {
        // Cross-partition — id alone doesn't tell us the category (partition key). Not a hot
        // path (candidate room load, once per exam session; admin edit).
        var sql = new QueryDefinition("SELECT * FROM c WHERE c.id = @id").WithParameter("@id", id);
        var results = await DrainIterator(_container.GetItemQueryIterator<ExamCatalogEntry>(sql));
        return results.FirstOrDefault();
    }

    public async Task DeleteAsync(string id, string category)
    {
        await _container.DeleteItemAsync<ExamCatalogEntry>(id, new PartitionKey(category));
    }

    public async Task UpsertAsync(ExamCatalogEntry entry)
    {
        await _container.UpsertItemAsync(entry, new PartitionKey(entry.Category));
    }

    private static async Task<List<ExamCatalogEntry>> DrainIterator(FeedIterator<ExamCatalogEntry> iter)
    {
        var results = new List<ExamCatalogEntry>();
        while (iter.HasMoreResults)
        {
            results.AddRange(await iter.ReadNextAsync());
        }
        return results;
    }
}
