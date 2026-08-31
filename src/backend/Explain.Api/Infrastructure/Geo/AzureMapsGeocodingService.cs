using System.Text.Json;

namespace Explain.Api.Infrastructure.Geo;

// Country is the full name ("United Kingdom"), not the ISO code — deliberately, so it can be
// stored/compared directly against the frontend's plain-English country dropdown without a
// separate code-to-name lookup table.
public record GeocodeResult(double Lat, double Lon, string? Country);

/// <summary>
/// Turns a free-text location (e.g. "Shoreditch, London, UK") into coordinates + a country
/// code via Azure Maps' Search/Get Search Address API. Server-side only, per this codebase's
/// standing rule that no third-party API key ever ships to the browser. Best-effort throughout
/// — a failed/unconfigured geocode never blocks a profile save or a search; the caller falls
/// back to plain-text location matching.
/// </summary>
public class AzureMapsGeocodingService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<AzureMapsGeocodingService> logger)
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(config["AzureMaps:SubscriptionKey"]);

    public async Task<GeocodeResult?> GeocodeAsync(string query, CancellationToken ct = default)
    {
        var key = config["AzureMaps:SubscriptionKey"];
        if (string.IsNullOrWhiteSpace(key)) return null;

        var client = httpClientFactory.CreateClient("AzureMaps");
        var url = $"/search/address/json?api-version=1.0&subscription-key={Uri.EscapeDataString(key)}&query={Uri.EscapeDataString(query)}&limit=1";

        try
        {
            using var response = await client.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Azure Maps geocode returned {Status} for {Query}", response.StatusCode, query);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var results = doc.RootElement.TryGetProperty("results", out var r) ? r : default;
            if (results.ValueKind != JsonValueKind.Array || results.GetArrayLength() == 0) return null;

            var top = results[0];
            var position = top.GetProperty("position");
            var lat = position.GetProperty("lat").GetDouble();
            var lon = position.GetProperty("lon").GetDouble();
            string? country = top.TryGetProperty("address", out var addr) && addr.TryGetProperty("country", out var c) && c.ValueKind == JsonValueKind.String
                ? c.GetString()
                : null;

            return new GeocodeResult(lat, lon, country);
        }
        catch (Exception ex)
        {
            // Network error, malformed response, cancelled request — never let a geocode
            // failure break the profile save or search request that triggered it.
            logger.LogWarning(ex, "Azure Maps geocode failed for {Query}", query);
            return null;
        }
    }
}
