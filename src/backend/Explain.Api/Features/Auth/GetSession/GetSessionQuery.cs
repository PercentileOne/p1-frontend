using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Auth.GetSession;

public record GetSessionQuery(string? Token) : IRequest<Result<SessionDto>>;

public record SessionDto(string UserId, string Email, string Name, string FirstName, string Role, IReadOnlyList<string> Permissions);
