using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Auth.Register;

public record RegisterCommand(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    int? Age,
    string? Profession)
    : IRequest<Result<AuthResponse>>;

public record AuthResponse(string Token, UserDto User);

public record UserDto(string Id, string Email, string Name, string FirstName, string Username, string Role);
