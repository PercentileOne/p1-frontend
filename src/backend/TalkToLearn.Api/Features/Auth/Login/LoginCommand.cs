using MediatR;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Features.Auth.Register;

namespace TalkToLearn.Api.Features.Auth.Login;

public record LoginCommand(string Email, string Password)
    : IRequest<Result<AuthResponse>>;
