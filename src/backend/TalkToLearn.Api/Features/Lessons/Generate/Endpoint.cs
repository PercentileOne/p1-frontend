using MediatR;

namespace TalkToLearn.Api.Features.Lessons.Generate;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/lessons/generate", async (Request req, IMediator mediator) =>
            (await mediator.Send(new GenerateLessonCommand(req.Subject, req.UserId))).ToHttpResult())
           .WithName("GenerateLesson").WithTags("Lessons").AllowAnonymous();

    private record Request(string Subject, string UserId);
}
