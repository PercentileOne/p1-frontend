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
    string? Role = null, // anything but candidate is refused (recruiters/employers are onboarded by us). Never trust this for Employer/Admin/SuperAdmin.
    string? Next = null)   // where the person was headed (only "/subscription" is honoured); carried through the verification email so it works on any device
    : IRequest<Result<AuthResponse>>;

public record AuthResponse(string Token, UserDto User);

public record UserDto(string Id, string Email, string Name, string FirstName, string Username, string Role,
    string? OrgId = null, string? OrgName = null, string? OrgRole = null);
