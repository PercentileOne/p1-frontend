using System.Security.Cryptography;
using System.Text;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace Explain.Api.Infrastructure.Storage;

/// <summary>
/// Content-addressed cache for generated TTS audio clips. The blob key is a hash of
/// (voiceId, text), so the same lesson paragraph read by any number of candidates is
/// synthesised once and served to everyone after that — the thing that keeps ElevenLabs
/// cost bounded for long, frequently-reread lesson content (unlike a one-off script such
/// as the career guide, which never gets reread the same way).
/// </summary>
public class TtsCacheService
{
    private const string ContainerName = "tts-cache";
    private readonly BlobContainerClient? _container;

    public bool IsConfigured => _container is not null;

    public TtsCacheService(IConfiguration config)
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

    public static string KeyFor(string voiceId, string text)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{voiceId}|{text}"));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public async Task<string?> GetReadUrlIfCachedAsync(string key, TimeSpan? validFor = null)
    {
        if (_container is null) return null;
        var blob = _container.GetBlobClient(BlobPath(key));
        if (!await blob.ExistsAsync()) return null;
        return SasUrl(blob, validFor);
    }

    public async Task<string> UploadAndGetReadUrlAsync(string key, Stream content, string contentType, TimeSpan? validFor = null)
    {
        if (_container is null)
            throw new InvalidOperationException("Blob storage is not configured (ConnectionStrings:BlobStorage is missing).");

        var blob = _container.GetBlobClient(BlobPath(key));
        await blob.UploadAsync(content, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType },
        });
        return SasUrl(blob, validFor)
            ?? throw new InvalidOperationException("Blob storage is configured but cannot generate SAS URLs.");
    }

    private string? SasUrl(BlobClient blob, TimeSpan? validFor)
    {
        if (!blob.CanGenerateSasUri) return null;
        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = _container!.Name,
            BlobName = blob.Name,
            Resource = "b",
            ExpiresOn = DateTimeOffset.UtcNow.Add(validFor ?? TimeSpan.FromHours(6)),
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Read);
        return blob.GenerateSasUri(sasBuilder).ToString();
    }

    private static string BlobPath(string key) => $"{key}.mp3";
}
