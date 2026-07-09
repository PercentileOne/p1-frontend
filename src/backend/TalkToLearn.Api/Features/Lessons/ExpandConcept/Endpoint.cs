using MediatR;

namespace TalkToLearn.Api.Features.Lessons.ExpandConcept;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/lessons/expand", async (Request req, IMediator mediator) =>
            (await mediator.Send(new ExpandConceptQuery(req.Subject, req.ConceptTitle, req.ConceptBody))).ToHttpResult())
           .WithName("ExpandConcept").WithTags("Lessons").AllowAnonymous();

    private record Request(string Subject, string ConceptTitle, string ConceptBody);
}
