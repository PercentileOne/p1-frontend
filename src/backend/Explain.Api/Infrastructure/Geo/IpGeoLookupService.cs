using System.Collections.Concurrent;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Azure.Storage.Blobs;
using MaxMind.GeoIP2;
using MaxMind.GeoIP2.Exceptions;

namespace Explain.Api.Infrastructure.Geo;

// AccuracyKm is the provider's own estimate of how far off the point could be (MaxMind gives one; IPinfo/Geoapify don't).
public record IpGeoResult(string? Country, string? City, string? Region = null, int? AccuracyKm = null);

/// <summary>
/// Resolves a visitor's IP to a country/city for the system event log (see Features/Events).
///
/// Provider is chosen by the app setting Geo:Provider — "ipinfo", "geoapify" or "maxmind" (the default). ipinfo/geoapify are web APIs
/// (keys Geo:IpInfoToken / Geo:GeoapifyKey, held server-side like every third-party key); if the chosen one has no key, errors, or
/// returns no city, the lookup quietly falls back to MaxMind's GeoLite2 City database (.mmdb, downloaded once from blob storage
/// ConnectionStrings:BlobStorage, container "geo-db", into memory at startup — fully local, no per-request external call).
/// Refreshing that file later is a blob re-upload (`az storage blob upload -c geo-db -n GeoLite2-City.mmdb --overwrite`) + an app restart.
///
/// Web-API results are cached per IP for a week (visitors repeat, and the free tiers are metered), so an IP is sent to the provider at
/// most once a week. Note this DOES send visitor IP addresses to a third party — the privacy policy must say so.
/// </summary>
public class IpGeoLookupService
{
    private const string ContainerName = "geo-db";
    private const string BlobName = "GeoLite2-City.mmdb";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromDays(7);
    private const int CacheMax = 20_000;

    private readonly ILogger<IpGeoLookupService> _logger;
    private readonly string _provider;
    private readonly string? _ipInfoToken;
    private readonly string? _geoapifyKey;

    // Deliberately a raw HttpClient, not IHttpClientFactory: the factory's default logging writes full request URLs (which for Geoapify
    // carry the API key) to the logs.
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(3) };
    private readonly ConcurrentDictionary<string, (IpGeoResult Result, DateTime At)> _cache = new();

    // Loaded once, lazily, and awaited by every caller — the underlying Task caches its own
    // result, so this is a single ~65MB download the first time ResolveAsync is called, not
    // once per request.
    private readonly Lazy<Task<DatabaseReader?>> _reader;

    public IpGeoLookupService(IConfiguration config, ILogger<IpGeoLookupService> logger)
    {
        _logger = logger;
        _provider = (config["Geo:Provider"] ?? "maxmind").Trim().ToLowerInvariant();
        _ipInfoToken = config["Geo:IpInfoToken"];
        _geoapifyKey = config["Geo:GeoapifyKey"];
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

        if (_provider is "ipinfo" or "geoapify")
        {
            if (_cache.TryGetValue(ipAddress, out var hit) && DateTime.UtcNow - hit.At < CacheTtl) return hit.Result;

            var remote = await LookupRemoteAsync(_provider, ipAddress, ct);
            if (remote is { City: not null })
            {
                if (_cache.Count >= CacheMax) _cache.Clear();
                _cache[ipAddress] = (remote, DateTime.UtcNow);
                return remote;
            }
            // Provider unconfigured, down, or had no city for this IP: fall through to the local database.
        }

        return await LookupMaxMindAsync(ipAddress);
    }

    /// <summary>One named provider, no fallback and no cache — for the admin comparison endpoint.</summary>
    public async Task<IpGeoResult?> LookupWithAsync(string provider, string ipAddress, CancellationToken ct = default) =>
        provider == "maxmind" ? await LookupMaxMindAsync(ipAddress) : await LookupRemoteAsync(provider, ipAddress, ct);

    private async Task<IpGeoResult> LookupMaxMindAsync(string ipAddress)
    {
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

    private async Task<IpGeoResult?> LookupRemoteAsync(string provider, string ipAddress, CancellationToken ct)
    {
        try
        {
            if (provider == "ipinfo")
            {
                if (string.IsNullOrWhiteSpace(_ipInfoToken)) return null;
                using var req = new HttpRequestMessage(HttpMethod.Get, $"https://ipinfo.io/{Uri.EscapeDataString(ipAddress)}");
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _ipInfoToken);
                req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                using var res = await Http.SendAsync(req, ct);
                if (!res.IsSuccessStatusCode) { _logger.LogWarning("IPinfo lookup returned {Status}", (int)res.StatusCode); return null; }
                return ParseIpInfo(await res.Content.ReadAsStringAsync(ct));
            }
            if (provider == "geoapify")
            {
                if (string.IsNullOrWhiteSpace(_geoapifyKey)) return null;
                using var res = await Http.GetAsync($"https://api.geoapify.com/v1/ipinfo?ip={Uri.EscapeDataString(ipAddress)}&apiKey={Uri.EscapeDataString(_geoapifyKey)}", ct);
                if (!res.IsSuccessStatusCode) { _logger.LogWarning("Geoapify lookup returned {Status}", (int)res.StatusCode); return null; }
                return ParseGeoapify(await res.Content.ReadAsStringAsync(ct));
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            // Timeouts and network errors are expected now and then — the caller falls back to the local database.
            _logger.LogWarning("{Provider} geo lookup failed: {Message}", provider, ex.Message);
        }
        return null;
    }

    // IPinfo: {"ip":"…","city":"…","region":"…","country":"GB","loc":"51.5,-0.1", …} — country is a 2-letter ISO code.
    public static IpGeoResult? ParseIpInfo(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var r = doc.RootElement;
        if (r.ValueKind != JsonValueKind.Object || r.TryGetProperty("bogon", out _)) return null;
        return new IpGeoResult(CountryName(Str(r, "country")), Str(r, "city"), Str(r, "region"));
    }

    // Geoapify: {"city":{"name":"…"},"state":{"name":"…"},"country":{"name":"…","iso_code":"GB"},"location":{…}, …}
    public static IpGeoResult? ParseGeoapify(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var r = doc.RootElement;
        if (r.ValueKind != JsonValueKind.Object) return null;
        return new IpGeoResult(Nested(r, "country", "name"), Nested(r, "city", "name"), Nested(r, "state", "name"));
    }

    private static string? Str(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(v.GetString()) ? v.GetString() : null;

    private static string? Nested(JsonElement e, string obj, string name) =>
        e.TryGetProperty(obj, out var o) && o.ValueKind == JsonValueKind.Object ? Str(o, name) : null;

    // Same English names MaxMind uses ("United Kingdom", "United States"), so the log doesn't mix "GB" and "United Kingdom".
    private static string? CountryName(string? iso)
    {
        if (string.IsNullOrWhiteSpace(iso)) return null;
        try { return new RegionInfo(iso).EnglishName; } catch (ArgumentException) { return iso; }
    }

    private static bool IsPrivateOrLoopback(string ip) =>
        ip is "127.0.0.1" or "::1" || ip.StartsWith("10.") || ip.StartsWith("192.168.") ||
        ip.StartsWith("172.16.") || ip.StartsWith("172.17.") || ip.StartsWith("172.18.") || ip.StartsWith("172.19.") ||
        ip.StartsWith("172.2") || ip.StartsWith("172.30.") || ip.StartsWith("172.31.");
}
