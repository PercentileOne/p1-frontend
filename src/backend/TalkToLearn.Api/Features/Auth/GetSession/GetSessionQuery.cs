using MediatR;
using TalkToLearn.Api.Common;

namespace TalkToLearn.Api.Features.Auth.GetSession;

public record GetSessionQuery(string? Token) : IRequest<Result<SessionDto>>;

public record SessionDto(string UserId, string Email, string Name, string FirstName, string Role);
