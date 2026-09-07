using MediatR;

namespace Explain.Api.Features.Interviews.AvatarSession;

public static class Endpoint
{
    // Anonymous — same precedent as /interviews/speak: the interview room calls this before a
    // candidate is necessarily authenticated in every flow that reaches it (demo/prep links).
    public static void Map(WebApplication app) =>
        app.MapPost("/interviews/avatar-session", async (IMediator mediator) =>
            (await mediator.Send(new AvatarSessionCommand())).ToHttpResult())
           .WithName("InterviewAvatarSession").WithTags("Interviews")
           .AllowAnonymous();
}
