using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Auth.Register;

public record RegisterCommand(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    int? Age,
    string? Profession,
    string? Role = null) // "recruiter" to self-register as one; anything else/omitted → Candidate. Never trust this for Client/Admin/SuperAdmin.
    : IRequest<Result<AuthResponse>>;

public record AuthResponse(string Token, UserDto User);

public record UserDto(string Id, string Email, string Name, string FirstName, string Username, string Role);
