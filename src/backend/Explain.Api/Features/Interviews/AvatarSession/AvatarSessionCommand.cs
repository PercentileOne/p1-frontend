using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Interviews.AvatarSession;

// Role selects which avatar_id gets requested — "hr" (Amina), "technical" (Wayne), or
// "michelle" (the pre-interview briefing host, live since 2026-09-17). Each seat runs its own
// LiveAvatar session; this command mints one session token at a time, called once per seat by
// useLiveAvatarSession. Michelle's is short-lived by design — connected only for the briefing,
// disconnected before Amina/Wayne take over — not a third seat that runs the whole interview.
public record AvatarSessionCommand(string Role) : IRequest<Result<AvatarSessionDto>>;

public record AvatarSessionDto(string SessionId, string SessionToken, bool IsSandbox);
