using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace Explain.Api.Infrastructure.Storage;

/// <summary>
/// Permanent home for Name Bank clips. D-ID's own result_url is a pre-signed S3 link that
/// expires within 24 hours (confirmed live, 2026-08-30 — X-Amz-Expires=86400) — completely
/// unsuitable for something meant to be cached and served forever, so every generated clip
/// gets downloaded and re-hosted here immediately once D-ID reports it done.
///
/// Private container + long-lived SAS (matching ProfileImageStorageService's exact pattern),
/// NOT public-read as first attempted — this account's `allowBlobPublicAccess` is disabled at
/// the Azure Storage account level (confirmed live, 2026-08-30: every real generation was
/// completing successfully on D-ID's side and then failing here, because
/// CreateContainerIfNotExistsAsync(PublicAccessType.Blob) is rejected outright by Azure when
/// the account itself disallows public containers). Changing that account-wide security
/// policy just for this one feature wasn't the right call — same accepted-shortcut trade-off
/// ProfileImageStorageService already lives with: a 365-day SAS, no auto-refresh, silently
/// 403s after a year with nothing to catch it yet.
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
        await _container.CreateIfNotExistsAsync(PublicAccessType.None);
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

        if (!blob.CanGenerateSasUri)
            throw new InvalidOperationException("Blob storage is configured but cannot generate SAS URLs.");

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = _container.Name,
            BlobName = blob.Name,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.AddDays(365),
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);
        return blob.GenerateSasUri(sasBuilder).ToString();
    }
}
