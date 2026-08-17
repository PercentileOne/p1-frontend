using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace Explain.Api.Infrastructure.Storage;

/// <summary>
/// Interview recording storage. Configure via ConnectionStrings:BlobStorage — until that's
/// set, IsConfigured is false and callers should skip video upload rather than throw, so
/// interview data (answers, scores, share links) still persists without a recording attached.
///
/// The container is private, not public — recordings are read through short-lived SAS URLs
/// generated per-request (GetReadUrl), not a permanent public link. That avoids needing
/// "Allow Blob anonymous access" enabled account-wide just for this one feature.
/// </summary>
public class BlobStorageService
{
    private const string ContainerName = "interview-recordings";
    private readonly BlobContainerClient? _container;

    public bool IsConfigured => _container is not null;

    public BlobStorageService(IConfiguration config)
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

    public async Task UploadAsync(string candidateId, string interviewId, Stream content, string contentType)
    {
        if (_container is null)
            throw new InvalidOperationException("Blob storage is not configured (ConnectionStrings:BlobStorage is missing).");

        var blob = _container.GetBlobClient(BlobPath(candidateId, interviewId));
        await blob.UploadAsync(content, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType },
        });
    }

    /// <summary>A time-limited signed URL for the recording, or null if blob storage isn't configured.</summary>
    public string? GetReadUrl(string candidateId, string interviewId, TimeSpan? validFor = null)
    {
        if (_container is null) return null;
        var blob = _container.GetBlobClient(BlobPath(candidateId, interviewId));
        if (!blob.CanGenerateSasUri) return null;

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = _container.Name,
            BlobName = blob.Name,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(validFor ?? TimeSpan.FromHours(24)),
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);
        return blob.GenerateSasUri(sasBuilder).ToString();
    }

    public async Task DeleteAsync(string candidateId, string interviewId)
    {
        if (_container is null) return;
        await _container.GetBlobClient(BlobPath(candidateId, interviewId)).DeleteIfExistsAsync();
    }

    private static string BlobPath(string candidateId, string interviewId) => $"{candidateId}/{interviewId}.webm";
}
