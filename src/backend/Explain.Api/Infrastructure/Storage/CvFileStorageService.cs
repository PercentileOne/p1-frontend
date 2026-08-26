using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace Explain.Api.Infrastructure.Storage;

/// <summary>
/// The actual CV file a recruiter uploads for an interview prep — kept alongside the
/// extracted cvText on InterviewPrep (see Features.InterviewPreps.Endpoint), which stays
/// the source of truth the AI grounds questions on. This service exists purely so the
/// candidate gets a real, viewable/downloadable attachment back, not just a wall of
/// extracted text — see the fix landed 2026-08-26 after that gap was reported live.
///
/// Same pattern as BlobStorageService (interview recordings): private container, no public
/// access, read access only via a short-lived per-request SAS URL.
/// </summary>
public class CvFileStorageService
{
    private const string ContainerName = "interview-prep-cvs";
    private readonly BlobContainerClient? _container;

    public bool IsConfigured => _container is not null;

    public CvFileStorageService(IConfiguration config)
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

    public async Task UploadAsync(string recruiterId, string prepId, string extension, Stream content, string contentType)
    {
        if (_container is null)
            throw new InvalidOperationException("Blob storage is not configured (ConnectionStrings:BlobStorage is missing).");

        var blob = _container.GetBlobClient(BlobPath(recruiterId, prepId, extension));
        await blob.UploadAsync(content, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType },
        });
    }

    /// <summary>A time-limited signed URL for the CV file, or null if not configured/no file stored.</summary>
    public string? GetReadUrl(string recruiterId, string prepId, string? extension, TimeSpan? validFor = null)
    {
        if (_container is null || string.IsNullOrEmpty(extension)) return null;
        var blob = _container.GetBlobClient(BlobPath(recruiterId, prepId, extension));
        if (!blob.CanGenerateSasUri) return null;

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = _container.Name,
            BlobName = blob.Name,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(validFor ?? TimeSpan.FromDays(7)),
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);
        return blob.GenerateSasUri(sasBuilder).ToString();
    }

    private static string BlobPath(string recruiterId, string prepId, string extension) => $"{recruiterId}/{prepId}{extension}";
}
