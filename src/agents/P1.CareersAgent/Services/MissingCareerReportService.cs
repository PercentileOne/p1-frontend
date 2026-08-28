using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using P1.CareersAgent.Models;

namespace P1.CareersAgent.Services;

// Separate container from CareerSearchFunction's "careers" — these are candidate-typed
// titles with no matching document, not career profiles, so mixing the two schemas into
// one container would let stray report rows leak into career search results. The account
// is serverless (percentileone-cosmos), so CreateContainerIfNotExistsAsync needs no
// throughput argument and provisions itself on first use — no manual Azure Portal step.
public class MissingCareerReportService
{
    private readonly Database _database;
    private readonly string _containerId;
    private Container? _container;

    public MissingCareerReportService(IConfiguration config)
    {
        var connectionString = config["CosmosConnectionString"]
            ?? throw new InvalidOperationException("CosmosConnectionString not configured");
        var dbName = config["CosmosDatabaseName"] ?? "interviewme";
        _containerId = config["CosmosMissingReportsContainerName"] ?? "career-reports";

        var client = new CosmosClient(connectionString, new CosmosClientOptions
        {
            SerializerOptions = new CosmosSerializationOptions
            {
                PropertyNamingPolicy = CosmosPropertyNamingPolicy.CamelCase
            }
        });

        _database = client.GetDatabase(dbName);
    }

    private async Task<Container> GetContainerAsync()
    {
        _container ??= (await _database.CreateContainerIfNotExistsAsync(_containerId, "/normalizedTitle")).Container;
        return _container;
    }

    public async Task ReportAsync(string title, string source)
    {
        var container = await GetContainerAsync();
        var normalized = Normalize(title);
        var now = DateTime.UtcNow.ToString("o");

        try
        {
            var existing = await container.ReadItemAsync<MissingCareerReport>(normalized, new PartitionKey(normalized));
            var doc = existing.Resource;
            doc.ReportCount++;
            doc.LastReportedAt = now;
            await container.UpsertItemAsync(doc, new PartitionKey(normalized));
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            var doc = new MissingCareerReport
            {
                Id = normalized,
                NormalizedTitle = normalized,
                Title = title,
                Source = source,
                ReportCount = 1,
                FirstReportedAt = now,
                LastReportedAt = now,
                Status = "pending",
            };
            await container.UpsertItemAsync(doc, new PartitionKey(normalized));
        }
    }

    public async Task<List<MissingCareerReport>> ListAsync(string? status = null)
    {
        var container = await GetContainerAsync();
        var sql = status is null
            ? "SELECT * FROM c ORDER BY c.reportCount DESC"
            : "SELECT * FROM c WHERE c.status = @status ORDER BY c.reportCount DESC";
        var query = new QueryDefinition(sql);
        if (status is not null) query = query.WithParameter("@status", status);

        var iter = container.GetItemQueryIterator<MissingCareerReport>(query);
        var results = new List<MissingCareerReport>();
        while (iter.HasMoreResults)
        {
            results.AddRange(await iter.ReadNextAsync());
        }
        return results;
    }

    public async Task<bool> UpdateStatusAsync(string id, string status)
    {
        var container = await GetContainerAsync();
        try
        {
            await container.PatchItemAsync<MissingCareerReport>(id, new PartitionKey(id),
                new[] { PatchOperation.Replace("/status", status) });
            return true;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    private static string Normalize(string title) => title.Trim().ToLowerInvariant();
}
