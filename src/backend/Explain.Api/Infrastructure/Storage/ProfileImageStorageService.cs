using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace Explain.Api.Infrastructure.Storage;

/// <summary>
/// Profile avatar and banner photos. Same pattern as CvFileStorageService/BlobStorageService:
/// private container, no public access, read access only via a short-lived per-request SAS
/// URL. `kind` is "avatar" or "banner" — both share one small container rather than two.
///
/// Known, accepted shortcut for Phase 1: the caller mints a long-lived (365-day) SAS once at
/// upload time and stores it directly as UserProfile.Avatar/Banner, matching how Avatar
/// already behaved before this service existed. It will silently 403 after a year with
/// nothing to auto-refresh it. The fully-correct fix — store only the extension and resolve
/// a fresh SAS on every GET /profile, exactly like Interviews/Endpoint.cs already does for
/// videoUrl — is a clean, contained fast-follow, not done here to keep this phase scoped.
/// </summary>
public class ProfileImageStorageService
{
    private const string ContainerName = "profile-images";
    private readonly BlobContainerClient? _container;

    public bool IsConfigured => _container is not null;

    public ProfileImageStorageService(IConfiguration config)
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

    public async Task UploadAsync(string userId, string kind, string extension, Stream content, string contentType)
    {
        if (_container is null)
            throw new InvalidOperationException("Blob storage is not configured (ConnectionStrings:BlobStorage is missing).");

        var blob = _container.GetBlobClient(BlobPath(userId, kind, extension));
        await blob.UploadAsync(content, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType },
        });
    }

    /// <summary>A time-limited signed URL for the image, or null if not configured.</summary>
    public string? GetReadUrl(string userId, string kind, string extension, TimeSpan? validFor = null)
    {
        if (_container is null) return null;
        var blob = _container.GetBlobClient(BlobPath(userId, kind, extension));
        if (!blob.CanGenerateSasUri) return null;

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = _container.Name,
            BlobName = blob.Name,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(validFor ?? TimeSpan.FromDays(365)),
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);
        return blob.GenerateSasUri(sasBuilder).ToString();
    }

    // Old blobs under a previous extension (e.g. re-uploading as .png after an earlier
    // .jpg) are intentionally left orphaned — private container, no user-facing symptom,
    // just a known, accepted storage-cost gap rather than a surprise.
    private static string BlobPath(string userId, string kind, string extension) => $"{userId}/{kind}{extension}";
}
