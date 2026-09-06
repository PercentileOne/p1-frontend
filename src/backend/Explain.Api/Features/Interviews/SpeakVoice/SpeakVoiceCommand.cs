using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Interviews.SpeakVoice;

// Role mirrors ttsApi.ts's own role type — "hr" (Sarah), "technical" (James), "mike" (Mike's
// briefing/debrief). Text arrives already phonetic-sanitised by the caller (sanitiseForTTS in
// ttsApi.ts) — this endpoint doesn't re-sanitise, it's a straight proxy + cache.
public record SpeakVoiceCommand(string Text, string Role) : IRequest<Result<SpeakVoiceDto>>;

public record SpeakVoiceDto(string AudioUrl);
