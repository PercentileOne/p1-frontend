using System.Net;
using MediatR;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Storage;

namespace Explain.Api.Features.Interviews.AvatarAudio;

// Same ElevenLabs-proxy-plus-blob-cache pattern as SpeakVoiceHandler, with one deliberate
// difference: LiveAvatar's Lite mode requires raw PCM (16-bit signed, 24kHz, no file headers),
// not MP3 — confirmed against the official liveavatar-debug skill, not guessed. ElevenLabs
// supports this directly via output_format=pcm_24000 (verified against their own API docs
// before writing this), so no separate transcoding step is needed — we just ask for a
// different format at generation time and cache that instead of the MP3.
//
// Deliberately a sibling to SpeakVoiceHandler, not a shared abstraction — every ElevenLabs
// call site in this app (SpeakVoice, ReadAloud) follows the same proxy+cache pattern
// independently rather than sharing a base class; this keeps that precedent.
public class AvatarAudioHandler(
    TtsCacheService cache,
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<AvatarAudioHandler> logger)
    : IRequestHandler<AvatarAudioCommand, Result<AvatarAudioDto>>
{
    private const string Model = "eleven_turbo_v2";
    private const int PcmSampleRate = 24000; // LiveAvatar Lite mode's required rate — not configurable

    private static readonly HttpStatusCode[] TransientStatuses = [HttpStatusCode.Conflict, HttpStatusCode.TooManyRequests];
    private const int MaxAttempts = 3;

    public async Task<Result<AvatarAudioDto>> Handle(AvatarAudioCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Text))
            return Result<AvatarAudioDto>.Failure("Text is required.");

        // Identical voice-selection logic to SpeakVoiceHandler — same personas, same voices,
        // kept in sync deliberately (copy, not shared helper, per this app's existing precedent).
        var voiceId = cmd.Role switch
        {
            "hr"        => config["ElevenLabs:VoiceInterviewHr"] ?? config["ElevenLabs:VoiceHr"],
            "mike"      => config["ElevenLabs:VoiceMike"] ?? config["ElevenLabs:VoiceTech"],
            "technical" => config["ElevenLabs:VoiceInterviewTechnical"] ?? config["ElevenLabs:VoiceTech"],
            _           => config["ElevenLabs:VoiceInterviewTechnical"] ?? config["ElevenLabs:VoiceTech"],
        };
        var apiKey = config["ElevenLabs:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(voiceId))
            return Result<AvatarAudioDto>.Failure("Interview voice isn't configured.", 500);

        // Amina/Wayne reported live as speaking noticeably too slowly — ElevenLabs' own
        // voice_settings.speed (0.7-1.2, default 1.0, verified against their docs before
        // adding this) is the real lever for pace, not something LiveAvatar controls; it just
        // lip-syncs to whatever audio we generate. Scoped to hr/technical only — Mike/MCQ
        // weren't reported as slow, and speeding up every voice equally wasn't asked for.
        var speed = cmd.Role is "hr" or "technical" ? 1.15 : 1.0;

        // Cache key folds speed in when non-default — otherwise a pre-existing cached clip
        // generated at the old 1.0 pace would keep being served forever after this change,
        // since KeyFor only hashes (voiceId, text). Default speed keeps the exact same key
        // as before (no cache-busting for Mike/MCQ, which never changed).
        var cacheVoiceId = speed != 1.0 ? $"{voiceId}@speed{speed}" : voiceId;
        var key = TtsCacheService.KeyFor(cacheVoiceId, cmd.Text);
        var cached = await cache.GetReadUrlIfCachedAsync(key, extension: "pcm");
        if (cached is not null)
            return Result<AvatarAudioDto>.Success(new AvatarAudioDto(cached, PcmSampleRate));

        var client = httpFactory.CreateClient();

        for (var attempt = 1; ; attempt++)
        {
            using var msg = new HttpRequestMessage(HttpMethod.Post,
                $"https://api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format=pcm_{PcmSampleRate}");
            msg.Headers.Add("xi-api-key", apiKey);
            msg.Content = System.Net.Http.Json.JsonContent.Create(new
            {
                text = cmd.Text,
                model_id = Model,
                voice_settings = new { stability = 0.5, similarity_boost = 0.75, speed },
            });

            using var resp = await client.SendAsync(msg, ct);
            if (!resp.IsSuccessStatusCode)
            {
                if (TransientStatuses.Contains(resp.StatusCode) && attempt < MaxAttempts)
                {
                    logger.LogWarning("ElevenLabs returned {Status} for a {Length}-char avatar line (attempt {Attempt}/{Max}) — retrying",
                        resp.StatusCode, cmd.Text.Length, attempt, MaxAttempts);
                    await Task.Delay(TimeSpan.FromMilliseconds(500 * attempt), ct);
                    continue;
                }

                var errorBody = await resp.Content.ReadAsStringAsync(ct);
                logger.LogError("ElevenLabs returned {Status} for a {Length}-char avatar line (voiceId={VoiceId}): {Body}",
                    resp.StatusCode, cmd.Text.Length, voiceId, errorBody);
                return Result<AvatarAudioDto>.Failure("Avatar voice generation failed.", 502);
            }

            await using var responseStream = await resp.Content.ReadAsStreamAsync(ct);
            using var buffer = new MemoryStream();
            await responseStream.CopyToAsync(buffer, ct);
            buffer.Position = 0;

            // audio/L16 is the standard MIME type for raw 16-bit linear PCM — accurate, unlike
            // reusing "audio/mpeg" would be here.
            var url = await cache.UploadAndGetReadUrlAsync(key, buffer, $"audio/L16;rate={PcmSampleRate}", extension: "pcm");
            return Result<AvatarAudioDto>.Success(new AvatarAudioDto(url, PcmSampleRate));
        }
    }
}
