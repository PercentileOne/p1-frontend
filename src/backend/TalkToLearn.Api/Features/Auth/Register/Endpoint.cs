using MediatR;

namespace TalkToLearn.Api.Features.Auth.Register;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/auth/register", async (Request req, IMediator mediator) =>
            (await mediator.Send(new RegisterCommand(req.Email, req.Password, req.FirstName, req.LastName, req.Age, req.Profession))).ToHttpResult())
           .WithName("Register").WithTags("Auth").AllowAnonymous();

    public record Request(string Email, string Password, string FirstName, string LastName, int? Age, string? Profession);
}
