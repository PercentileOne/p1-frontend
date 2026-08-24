using System.Net.Http.Json;
using MediatR;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Storage;

namespace Explain.Api.Features.Lessons.ReadAloud;

public class ReadAloudHandler(
    TtsCacheService cache,
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<ReadAloudHandler> logger)
    : IRequestHandler<ReadAloudCommand, Result<ReadAloudDto>>
{
    private const string Model = "eleven_turbo_v2";
    private const int MaxConcurrentGenerations = 3; // ElevenLabs concurrency is finite too — don't hammer it on a long lesson's first read

    public async Task<Result<ReadAloudDto>> Handle(ReadAloudCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Text))
            return Result<ReadAloudDto>.Failure("Text is required.");

        var apiKey = config["ElevenLabs:ApiKey"];
        var voiceId = cmd.Gender == "male" ? config["ElevenLabs:VoiceTech"] : config["ElevenLabs:VoiceHr"];
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(voiceId))
            return Result<ReadAloudDto>.Failure("Read Aloud voice isn't configured.", 500);

        var chunks = TextChunker.Chunk(PhoneticSanitiser.Sanitise(cmd.Text));
        if (chunks.Count == 0)
            return Result<ReadAloudDto>.Failure("Nothing to read.");

        var client = httpFactory.CreateClient();
        var semaphore = new SemaphoreSlim(MaxConcurrentGenerations);

        try
        {
            var results = await Task.WhenAll(chunks.Select(async chunk =>
            {
                await semaphore.WaitAsync(ct);
                try { return await ResolveChunkAsync(chunk, voiceId, apiKey, client, ct); }
                finally { semaphore.Release(); }
            }));

            return Result<ReadAloudDto>.Success(new ReadAloudDto(results.ToList()));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Read Aloud generation failed for a {Count}-chunk lesson", chunks.Count);
            return Result<ReadAloudDto>.Failure("Voice generation failed. Please try again.", 500);
        }
    }

    private async Task<ReadAloudChunkDto> ResolveChunkAsync(
        string chunk, string voiceId, string apiKey, HttpClient client, CancellationToken ct)
    {
        var key = TtsCacheService.KeyFor(voiceId, chunk);

        var cached = await cache.GetReadUrlIfCachedAsync(key);
        if (cached is not null)
            return new ReadAloudChunkDto(chunk, cached);

        using var msg = new HttpRequestMessage(HttpMethod.Post, $"https://api.elevenlabs.io/v1/text-to-speech/{voiceId}");
        msg.Headers.Add("xi-api-key", apiKey);
        msg.Content = JsonContent.Create(new
        {
            text = chunk,
            model_id = Model,
            voice_settings = new { stability = 0.5, similarity_boost = 0.75 },
        });

        using var resp = await client.SendAsync(msg, ct);
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"ElevenLabs returned {resp.StatusCode} for a {chunk.Length}-char chunk");

        await using var responseStream = await resp.Content.ReadAsStreamAsync(ct);
        using var buffer = new MemoryStream();
        await responseStream.CopyToAsync(buffer, ct);
        buffer.Position = 0;

        var url = await cache.UploadAndGetReadUrlAsync(key, buffer, "audio/mpeg");
        return new ReadAloudChunkDto(chunk, url);
    }
}
