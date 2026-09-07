using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Interviews.AvatarSession;

// No params yet — every session currently requests the same (sandbox) avatar. Once real
// Sarah/James avatars exist in the LiveAvatar dashboard, this will need a role so the handler
// can map "hr"/"technical" to their own avatar_id, the same way SpeakVoiceCommand's Role already
// selects an ElevenLabs voice.
public record AvatarSessionCommand : IRequest<Result<AvatarSessionDto>>;

public record AvatarSessionDto(string SessionId, string SessionToken, bool IsSandbox);
