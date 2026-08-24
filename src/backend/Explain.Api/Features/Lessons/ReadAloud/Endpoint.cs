using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Lessons.ReadAloud;

public static class Endpoint
{
    // Anonymous for now, same as the Learn module itself (localStorage-based user id, no
    // login required). Subscription gating is a deliberate later step, not missing here.
    public static void Map(WebApplication app) =>
        app.MapPost("/lessons/read-aloud", async (Request req, IMediator mediator) =>
            (await mediator.Send(new ReadAloudCommand(req.Text, req.Gender))).ToHttpResult())
           .WithName("LessonReadAloud").WithTags("Lessons")
           .AllowAnonymous();

    private record Request(string Text, string Gender);
}
