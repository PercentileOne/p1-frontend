using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Interviews.AvatarAudio;

// Role mirrors SpeakVoiceCommand's exactly — same voice-selection logic, same candidate-facing
// personas. This is a sibling to SpeakVoice, not a replacement: SpeakVoice still serves the
// existing MP3 playback path everywhere in the app; this one exists purely to feed LiveAvatar's
// Lite mode, which requires raw PCM, not MP3 (see AvatarAudioHandler's doc comment).
public record AvatarAudioCommand(string Text, string Role) : IRequest<Result<AvatarAudioDto>>;

// PcmSampleRate is fixed at 24000 to match LiveAvatar's Lite-mode requirement exactly — see
// AvatarAudioHandler. Exposed here so the frontend never has to hardcode/assume it.
public record AvatarAudioDto(string AudioUrl, int PcmSampleRate);
