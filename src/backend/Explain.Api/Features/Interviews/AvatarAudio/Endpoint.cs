using MediatR;

namespace Explain.Api.Features.Interviews.AvatarAudio;

public static class Endpoint
{
    // Anonymous — same precedent as /interviews/speak and /interviews/avatar-session.
    public static void Map(WebApplication app) =>
        app.MapPost("/interviews/avatar-audio", async (Request req, IMediator mediator) =>
            (await mediator.Send(new AvatarAudioCommand(req.Text, req.Role))).ToHttpResult())
           .WithName("InterviewAvatarAudio").WithTags("Interviews")
           .AllowAnonymous();

    private record Request(string Text, string Role);
}
