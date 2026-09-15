using MediatR;

namespace Explain.Api.Features.Auth.Login;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/auth/login", async (Request req, HttpContext ctx, IMediator mediator) =>
        {
            var ip = ctx.Connection.RemoteIpAddress?.ToString();
            var userAgent = ctx.Request.Headers.UserAgent.ToString() is { Length: > 0 } ua ? ua : null;
            return (await mediator.Send(new LoginCommand(req.Email, req.Password, ip, userAgent))).ToHttpResult();
        })
           .WithName("Login").WithTags("Auth").AllowAnonymous();

    public record Request(string Email, string Password);
}
