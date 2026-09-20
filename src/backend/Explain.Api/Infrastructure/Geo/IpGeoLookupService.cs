using Azure.Storage.Blobs;
using MaxMind.GeoIP2;
using MaxMind.GeoIP2.Exceptions;

namespace Explain.Api.Infrastructure.Geo;

// AccuracyKm is MaxMind's own estimate of how far off the point could be (an honest "roughly here", not a fix).
public record IpGeoResult(string? Country, string? City, string? Region = null, int? AccuracyKm = null);

/// <summary>
/// Resolves a visitor's IP to a country/city for the system event log (see Features/Events).
/// Backed by MaxMind's GeoLite2 City database (.mmdb), downloaded once from blob storage
/// (ConnectionStrings:BlobStorage, container "geo-db") into memory at startup — not MaxMind's
/// web service API, so lookups are fully local/offline: no per-request external call, no rate
/// limit, unaffected if MaxMind's own API has an outage. The .mmdb file itself isn't committed
/// to git (it's ~65MB and MaxMind republishes a fresh one weekly); refreshing it later is just
/// a blob re-upload (`az storage blob upload -c geo-db -n GeoLite2-City.mmdb --overwrite`)
/// followed by an app restart, no redeploy needed.
///
/// Was previously backed by ip-api.com's free no-signup endpoint as a stopgap, because setting
/// up a MaxMind account needs a human — Francis did that 2026-09-15.
/// </summary>
public class IpGeoLookupService
{
    private const string ContainerName = "geo-db";
    private const string BlobName = "GeoLite2-City.mmdb";

    private readonly ILogger<IpGeoLookupService> _logger;

    // Loaded once, lazily, and awaited by every caller — the underlying Task caches its own
    // result, so this is a single ~65MB download the first time ResolveAsync is called, not
    // once per request.
    private readonly Lazy<Task<DatabaseReader?>> _reader;

    public IpGeoLookupService(IConfiguration config, ILogger<IpGeoLookupService> logger)
    {
        _logger = logger;
        _reader = new Lazy<Task<DatabaseReader?>>(() => LoadAsync(config));
    }

    private async Task<DatabaseReader?> LoadAsync(IConfiguration config)
    {
        var connectionString = config.GetConnectionString("BlobStorage");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            _logger.LogWarning("GeoLite2 database not loaded — ConnectionStrings:BlobStorage is missing.");
            return null;
        }

        try
        {
            var blob = new BlobContainerClient(connectionString, ContainerName).GetBlobClient(BlobName);
            var download = await blob.DownloadContentAsync();
            return new DatabaseReader(download.Value.Content.ToStream());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load GeoLite2 database from blob storage — geo lookups disabled.");
            return null;
        }
    }

    public async Task<IpGeoResult> ResolveAsync(string? ipAddress, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(ipAddress) || IsPrivateOrLoopback(ipAddress))
            return new IpGeoResult(null, null);

        var reader = await _reader.Value;
        if (reader is null) return new IpGeoResult(null, null);

        try
        {
            var city = reader.City(ipAddress);
            return new IpGeoResult(city.Country?.Name, city.City?.Name, city.MostSpecificSubdivision?.Name, city.Location?.AccuracyRadius);
        }
        catch (AddressNotFoundException)
        {
            // Private/reserved ranges IsPrivateOrLoopback doesn't already catch, or an IP the
            // database has no entry for — not an error, just nothing to report.
            return new IpGeoResult(null, null);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "IP geo lookup failed for {Ip}", ipAddress);
            return new IpGeoResult(null, null);
        }
    }

    private static bool IsPrivateOrLoopback(string ip) =>
        ip is "127.0.0.1" or "::1" || ip.StartsWith("10.") || ip.StartsWith("192.168.") ||
        ip.StartsWith("172.16.") || ip.StartsWith("172.17.") || ip.StartsWith("172.18.") || ip.StartsWith("172.19.") ||
        ip.StartsWith("172.2") || ip.StartsWith("172.30.") || ip.StartsWith("172.31.");
}
