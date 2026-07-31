using MediatR;

namespace Explain.Api.Features.Auth.Login;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/auth/login", async (Request req, IMediator mediator) =>
            (await mediator.Send(new LoginCommand(req.Email, req.Password))).ToHttpResult())
           .WithName("Login").WithTags("Auth").AllowAnonymous();

    public record Request(string Email, string Password);
}
