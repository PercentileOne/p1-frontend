using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Explain.Api.Infrastructure.Storage;

/// <summary>
/// Permanent home for Name Bank clips. D-ID's own result_url is a pre-signed S3 link that
/// expires within 24 hours (confirmed live, 2026-08-30 — X-Amz-Expires=86400) — completely
/// unsuitable for something meant to be cached and served forever, so every generated clip
/// gets downloaded and re-hosted here immediately once D-ID reports it done.
///
/// Public-read (not private + SAS, unlike TtsCacheService/ProfileImageStorageService) is a
/// deliberate choice: these are generic interviewer greeting clips, not personal candidate
/// data — there's nothing sensitive to protect, and a public blob gives a genuinely permanent
/// URL with no expiry to manage at all, which is exactly what "cache forever" needs.
/// </summary>
public class NameGreetingVideoStorageService
{
    private const string ContainerName = "name-greeting-videos";
    private readonly BlobContainerClient? _container;

    public bool IsConfigured => _container is not null;

    public NameGreetingVideoStorageService(IConfiguration config)
    {
        var connectionString = config.GetConnectionString("BlobStorage");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            _container = null;
            return;
        }
        _container = new BlobContainerClient(connectionString, ContainerName);
    }

    public async Task InitialiseAsync()
    {
        if (_container is null) return;
        await _container.CreateIfNotExistsAsync(PublicAccessType.Blob);
    }

    public async Task<string> DownloadAndStoreAsync(string sourceUrl, string blobKey, HttpClient httpClient, CancellationToken ct)
    {
        if (_container is null)
            throw new InvalidOperationException("Blob storage is not configured (ConnectionStrings:BlobStorage is missing).");

        var bytes = await httpClient.GetByteArrayAsync(sourceUrl, ct);
        var blob = _container.GetBlobClient($"{blobKey}.mp4");
        await blob.UploadAsync(new BinaryData(bytes), new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = "video/mp4" },
        });
        return blob.Uri.ToString();
    }
}
