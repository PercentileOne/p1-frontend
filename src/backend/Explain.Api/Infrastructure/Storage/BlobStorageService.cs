using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Explain.Api.Infrastructure.Storage;

/// <summary>
/// Interview recording storage. Configure via ConnectionStrings:BlobStorage — until that's
/// set, IsConfigured is false and callers should skip video upload rather than throw, so
/// interview data (answers, scores, share links) still persists without a recording attached.
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
        // Public blob-level read access: a saved interview is explicitly shared by the
        // candidate, so the recording needs to be fetchable via a plain URL without a SAS token.
        await _container.CreateIfNotExistsAsync(PublicAccessType.Blob);
    }

    /// <returns>The public URL of the uploaded blob.</returns>
    public async Task<string> UploadAsync(string candidateId, string interviewId, Stream content, string contentType)
    {
        if (_container is null)
            throw new InvalidOperationException("Blob storage is not configured (ConnectionStrings:BlobStorage is missing).");

        var blob = _container.GetBlobClient($"{candidateId}/{interviewId}.webm");
        await blob.UploadAsync(content, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType },
        });
        return blob.Uri.ToString();
    }
}
