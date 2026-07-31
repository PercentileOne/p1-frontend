using MediatR;
using TalkToLearn.Api.Common;

namespace TalkToLearn.Api.Features.Lessons.ExpandConcept;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/lessons/expand", async (Request req, IMediator mediator) =>
            (await mediator.Send(new ExpandConceptQuery(req.Subject, req.ConceptTitle, req.ConceptBody))).ToHttpResult())
           .WithName("ExpandConcept").WithTags("Lessons")
           .RequireAuthorization(Permissions.PracticeInterview);

    private record Request(string Subject, string ConceptTitle, string ConceptBody);
}
