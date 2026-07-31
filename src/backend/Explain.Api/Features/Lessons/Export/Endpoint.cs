using MediatR;
using Explain.Api.Features.Lessons.Generate;

namespace Explain.Api.Features.Lessons.Export;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/lessons/export", async (Request req, IMediator mediator) =>
            (await mediator.Send(new ExportLessonCommand(req.RecipientEmail, req.RecipientName, req.Lesson))).ToHttpResult())
           .WithName("ExportLesson").WithTags("Lessons").AllowAnonymous();

    private record Request(string RecipientEmail, string RecipientName, LessonDto Lesson);
}
