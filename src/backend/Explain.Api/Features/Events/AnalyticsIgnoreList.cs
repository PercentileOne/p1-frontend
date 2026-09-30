using Explain.Api.Infrastructure.Cosmos;
using Microsoft.Azure.Cosmos;

namespace Explain.Api.Features.Events;

/// <summary>
/// The owner's own IP addresses, set on the admin funnel page ("Ignored addresses"). Visits from these are never counted in the funnel (applied
/// when the numbers are calculated, so old visits are covered too) and — since Francis, 2026-09-30: "block any logs going in for my IP address; I've
/// deleted over 500 today" — are no longer written to the event log at all.
///
/// One shared, cached copy: the event intake asks "is this address ignored?" on EVERY event, so it must not read the database each time. The list
/// is refreshed at most once a minute; saving a new list from the admin page calls <see cref="Invalidate"/> so the change is seen at once on this
/// server. If the database can't be read, the last known list stays in use (and a retry follows shortly) — logging is never blocked by it, and a
/// failed read can never make events from everyone else disappear.
/// </summary>
public class AnalyticsIgnoreList
{
    private sealed record Snapshot(HashSet<string> Ips, DateTime LoadedAt);

    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(60);
    private static readonly TimeSpan RetryAfterFailure = TimeSpan.FromSeconds(10);

    private readonly Func<Task<HashSet<string>>> _load;
    private readonly Func<DateTime> _now;
    private readonly ILogger? _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private volatile Snapshot _snapshot = new([], DateTime.MinValue);

    public AnalyticsIgnoreList(CosmosService cosmos, ILogger<AnalyticsIgnoreList> logger)
        : this(() => ReadFromCosmosAsync(cosmos), () => DateTime.UtcNow, logger) { }

    /// <summary>For tests: supply the loader and the clock.</summary>
    public AnalyticsIgnoreList(Func<Task<HashSet<string>>> load, Func<DateTime> now, ILogger? logger = null)
    {
        _load = load; _now = now; _logger = logger;
    }

    /// <summary>True when this address is on the list. A missing/unknown address is never ignored.</summary>
    public async Task<bool> IsIgnoredAsync(string? ip) =>
        !string.IsNullOrWhiteSpace(ip) && (await GetAsync()).Contains(ip);

    /// <summary>The current list (cached for up to a minute).</summary>
    public async Task<HashSet<string>> GetAsync()
    {
        var snap = _snapshot;
        if (_now() - snap.LoadedAt < Ttl) return snap.Ips;

        await _gate.WaitAsync();
        try
        {
            snap = _snapshot;
            if (_now() - snap.LoadedAt < Ttl) return snap.Ips;   // someone else refreshed while we waited
            try
            {
                _snapshot = new Snapshot(await _load(), _now());
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Could not refresh the ignored-address list; keeping the last known one.");
                _snapshot = new Snapshot(snap.Ips, _now() - Ttl + RetryAfterFailure);   // try again in a few seconds, not every event
            }
            return _snapshot.Ips;
        }
        finally { _gate.Release(); }
    }

    /// <summary>Forget the cached list so the next check re-reads it (called right after the admin saves a new list).</summary>
    public void Invalidate() => _snapshot = new Snapshot(_snapshot.Ips, DateTime.MinValue);

    public record AnalyticsIgnoreSetting(string id, string pk, List<string> ips, DateTimeOffset updatedAt, string updatedBy);

    private static async Task<HashSet<string>> ReadFromCosmosAsync(CosmosService cosmos)
    {
        try
        {
            var resp = await cosmos.GetContainer("platformSettings").ReadItemAsync<AnalyticsIgnoreSetting>("analyticsIgnore", new PartitionKey("analyticsIgnore"));
            return new HashSet<string>(resp.Resource.ips ?? []);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return []; }   // nothing saved yet = an empty list, not a failure
    }
}
