using MediatR;
using Explain.Api.Common;
using Explain.Api.Features.Auth.Register;

namespace Explain.Api.Features.Auth.Login;

public record LoginCommand(string Email, string Password)
    : IRequest<Result<AuthResponse>>;
