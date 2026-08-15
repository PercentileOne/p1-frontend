using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using Microsoft.Extensions.Configuration;
using P1.CareersAgent.Models;
using System.Text.Json;

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
}
