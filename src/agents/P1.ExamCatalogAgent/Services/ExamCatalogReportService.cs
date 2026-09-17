using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Configuration;
using P1.ExamCatalogAgent.Models;

namespace P1.ExamCatalogAgent.Services;

// Separate container from CosmosExamCatalogService's "examCatalog" — these are candidate-typed
// names with no matching entry yet, not catalog records, mirrors MissingCareerReportService.cs's
// exact reasoning for keeping the two apart. Serverless Cosmos account, so
// CreateContainerIfNotExistsAsync provisions itself on first use.
//
// No AI plausibility check yet (Phase 2 adds one, mirroring OpenAiEnricher.ClassifyJobTitleAsync)
// — every report lands as Plausible=true/AiNote="" until then, same lenient default the Careers
// version fails open to on any AI error anyway.
public class ExamCatalogReportService
{
    private readonly Database _database;
    private readonly string _containerId;
    private Container? _container;

    public ExamCatalogReportService(IConfiguration config)
    {
        var connectionString = config["CosmosConnectionString"]
            ?? throw new InvalidOperationException("CosmosConnectionString not configured");
        var dbName = config["CosmosDatabaseName"] ?? "interviewme";
        _containerId = config["CosmosMissingReportsContainerName"] ?? "examCatalogReports";

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
        _container ??= (await _database.CreateContainerIfNotExistsAsync(_containerId, "/normalizedName")).Container;
        return _container;
    }

    public async Task ReportAsync(string name, string category)
    {
        var container = await GetContainerAsync();
        var normalized = Normalize(name);
        var now = DateTime.UtcNow.ToString("o");

        try
        {
            var existing = await container.ReadItemAsync<ExamCatalogReport>(normalized, new PartitionKey(normalized));
            var doc = existing.Resource;
            doc.ReportCount++;
            doc.LastReportedAt = now;
            await container.UpsertItemAsync(doc, new PartitionKey(normalized));
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            var doc = new ExamCatalogReport
            {
                Id = normalized,
                NormalizedName = normalized,
                Name = name,
                Category = category,
                ReportCount = 1,
                FirstReportedAt = now,
                LastReportedAt = now,
                Status = "pending",
                Plausible = true,
                AiNote = "",
            };
            await container.UpsertItemAsync(doc, new PartitionKey(normalized));
        }
    }

    public async Task<List<ExamCatalogReport>> ListAsync(string? status = null)
    {
        var container = await GetContainerAsync();
        var sql = status is null
            ? "SELECT * FROM c ORDER BY c.reportCount DESC"
            : "SELECT * FROM c WHERE c.status = @status ORDER BY c.reportCount DESC";
        var query = new QueryDefinition(sql);
        if (status is not null) query = query.WithParameter("@status", status);

        var iter = container.GetItemQueryIterator<ExamCatalogReport>(query);
        var results = new List<ExamCatalogReport>();
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
            await container.PatchItemAsync<ExamCatalogReport>(id, new PartitionKey(id),
                new[] { PatchOperation.Replace("/status", status) });
            return true;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    private static string Normalize(string name) => name.Trim().ToLowerInvariant();
}
