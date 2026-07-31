using MediatR;
using TalkToLearn.Api.Common;

namespace TalkToLearn.Api.Features.Lessons.GoDeeper;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/lessons/go-deeper", async (Request req, IMediator mediator) =>
            (await mediator.Send(new GoDeeperCommand(req.Subject, req.Category, req.ExistingConceptTitles))).ToHttpResult())
           .WithName("GoDeeperLesson").WithTags("Lessons")
           .RequireAuthorization(Permissions.PracticeInterview);

    private record Request(string Subject, string Category, List<string> ExistingConceptTitles);
}
