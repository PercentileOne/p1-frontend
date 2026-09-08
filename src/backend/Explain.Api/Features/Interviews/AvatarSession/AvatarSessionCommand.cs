using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Interviews.AvatarSession;

// Role selects which avatar_id gets requested — "hr" (Amina) or "technical" (Wayne), the same
// two seats SpeakVoiceCommand's Role already picks a voice for. Both seats run their own
// concurrent LiveAvatar session; this command mints one session token at a time, called once
// per seat by useLiveAvatarSession.
public record AvatarSessionCommand(string Role) : IRequest<Result<AvatarSessionDto>>;

public record AvatarSessionDto(string SessionId, string SessionToken, bool IsSandbox);
