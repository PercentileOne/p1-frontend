using System.Text;
using System.Text.Json;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Events;

/// <summary>
/// The "keep it forever, cheaply" half of the system event log. Same in-process BackgroundService
/// convention as Features/LearnAlerts/LearnAlertsSendService.cs — no new Azure resource, this App
/// Service is already always-on.
///
/// Deliberately NOT a "move data after the 10-day TTL" job — Cosmos gives no pre-expiry hook, so
/// trying to catch documents right before they age out is unreliable by construction. Instead this
/// archives every event continuously, every 5 minutes, into a plain Blob container (reusing the
/// existing p1coreb258 storage account — see ConnectionStrings:BlobStorage — rather than a genuine
/// Data Lake Gen2/HNS account, which doesn't exist today and isn't worth provisioning until
/// something actually needs to run big-data-style queries directly over the raw archive).
/// The systemEvents Cosmos container's own 10-day TTL then just quietly drops its copy later —
/// by then it's already safely durable elsewhere.
///
/// Also maintains eventDailySummaries — small, permanent (no TTL) per-day/per-event-type counters,
/// so a future "activity over time" chart never has to scan the archive.
/// </summary>
public class EventsArchiveService(
    CosmosService cosmos,
    IConfiguration config,
    ILogger<EventsArchiveService> logger) : BackgroundService
{
    private static readonly TimeSpan TickInterval = TimeSpan.FromMinutes(5);
    private const string ArchiveContainerName = "system-events-archive";
    private const string StateDocId = "eventArchiveState";

    private readonly BlobContainerClient? _archiveContainer = BuildContainerClient(config);

    private static BlobContainerClient? BuildContainerClient(IConfiguration config)
    {
        var connectionString = config.GetConnectionString("BlobStorage");
        return string.IsNullOrWhiteSpace(connectionString) ? null : new BlobContainerClient(connectionString, ArchiveContainerName);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_archiveContainer is not null)
        {
            try { await _archiveContainer.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: stoppingToken); }
            catch (Exception ex) { logger.LogWarning(ex, "Could not create system-events-archive container — archiving will be skipped until this is fixed."); }
        }

        // Staggered after LearnAlerts' own 30s startup delay, same reasoning: don't race Cosmos
        // container creation during app boot.
        await Task.Delay(TimeSpan.FromSeconds(45), stoppingToken);

        using var timer = new PeriodicTimer(TickInterval);
        do
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Events archive tick failed");
            }
        } while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        if (_archiveContainer is null) return; // not configured — hot Cosmos copy still works fine on its own, just no permanent archive yet

        var settingsContainer = cosmos.GetContainer("platformSettings");
        var since = await ReadLastArchivedAtAsync(settingsContainer, ct);

        var eventsContainer = cosmos.GetContainer("systemEvents");
        var query = new QueryDefinition("SELECT * FROM c WHERE c.createdAt > @since ORDER BY c.createdAt ASC")
            .WithParameter("@since", since);
        var events = new List<SystemEventDoc>();
        using (var feed = eventsContainer.GetItemQueryIterator<SystemEventDoc>(query))
            while (feed.HasMoreResults)
                events.AddRange(await feed.ReadNextAsync(ct));

        if (events.Count == 0) return;
        logger.LogInformation("Events archive: {Count} new events to archive", events.Count);

        var sb = new StringBuilder();
        foreach (var e in events) sb.AppendLine(JsonSerializer.Serialize(e));
        var blobPath = $"{DateTimeOffset.UtcNow:yyyy/MM/dd}/events-{Guid.NewGuid():N}.jsonl";
        await _archiveContainer.GetBlobClient(blobPath).UploadAsync(new BinaryData(sb.ToString()), overwrite: true, ct);

        await IncrementDailySummariesAsync(events, ct);

        var newest = events.Max(e => e.createdAt)!; // never null — events.Count == 0 already returned above
        await WriteLastArchivedAtAsync(settingsContainer, newest, ct);
    }

    private async Task IncrementDailySummariesAsync(List<SystemEventDoc> events, CancellationToken ct)
    {
        var summaries = cosmos.GetContainer("eventDailySummaries");
        // Best-effort per group, same "one bad item shouldn't strand the batch" convention as
        // LearnAlertsSendService's per-alert try/catch — read-modify-write, not an atomic Patch:
        // at this traffic volume (one tick every 5 minutes) a lost increment from a genuine
        // concurrent write is not a realistic risk worth the extra complexity.
        foreach (var group in events.GroupBy(e => (Day: DateTimeOffset.Parse(e.createdAt).ToString("yyyy-MM-dd"), e.eventType, Portal: e.portal ?? "unknown")))
        {
            var docId = $"{group.Key.Day}:{group.Key.eventType}:{group.Key.Portal}";
            try
            {
                EventDailySummaryDoc existing;
                try
                {
                    var resp = await summaries.ReadItemAsync<EventDailySummaryDoc>(docId, new PartitionKey("summary"), cancellationToken: ct);
                    existing = resp.Resource;
                }
                catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    existing = new EventDailySummaryDoc(docId, "summary", group.Key.Day, group.Key.eventType, group.Key.Portal, 0);
                }

                var updated = existing with { count = existing.count + group.Count() };
                await summaries.UpsertItemAsync(updated, new PartitionKey("summary"), cancellationToken: ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to update daily summary for {DocId}", docId);
            }
        }
    }

    private static async Task<string> ReadLastArchivedAtAsync(Container settingsContainer, CancellationToken ct)
    {
        try
        {
            var resp = await settingsContainer.ReadItemAsync<ArchiveStateDoc>(StateDocId, new PartitionKey("pk"), cancellationToken: ct);
            return resp.Resource.lastArchivedAt;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // First run ever — only look back 1 day rather than the container's full (currently
            // empty, but future-proofing) history, so a redeploy can never trigger a huge backfill.
            return DateTimeOffset.UtcNow.AddDays(-1).ToString("o");
        }
    }

    private static async Task WriteLastArchivedAtAsync(Container settingsContainer, string newest, CancellationToken ct)
    {
        var doc = new ArchiveStateDoc(StateDocId, "pk", newest);
        await settingsContainer.UpsertItemAsync(doc, new PartitionKey("pk"), cancellationToken: ct);
    }

    private record ArchiveStateDoc(string id, string pk, string lastArchivedAt);
}

public record EventDailySummaryDoc(string id, string pk, string day, string eventType, string portal, int count);
