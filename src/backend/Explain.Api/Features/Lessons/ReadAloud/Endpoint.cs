using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Lessons.ReadAloud;

public static class Endpoint
{
    // LearnPanel is only reachable via /dashboard, which RequirePermission already gates —
    // so a caller here is always logged in. Same permission as its sibling Lessons endpoints
    // (GoDeeper, ExpandConcept). Subscription-tier gating is a separate, deliberate later step.
    public static void Map(WebApplication app) =>
        app.MapPost("/lessons/read-aloud", async (Request req, IMediator mediator) =>
            (await mediator.Send(new ReadAloudCommand(req.Text, req.Gender))).ToHttpResult())
           .WithName("LessonReadAloud").WithTags("Lessons")
           .RequireAuthorization(Permissions.PracticeInterview);

    private record Request(string Text, string Gender);
}
