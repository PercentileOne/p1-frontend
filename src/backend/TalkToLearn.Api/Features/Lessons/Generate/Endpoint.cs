using System.Security.Claims;
using MediatR;
using TalkToLearn.Api.Common;

namespace TalkToLearn.Api.Features.Lessons.Generate;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/lessons/generate", async (Request req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var userId = user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            return (await mediator.Send(new GenerateLessonCommand(req.Subject, userId))).ToHttpResult();
        })
        .WithName("GenerateLesson").WithTags("Lessons")
        .RequireAuthorization(Permissions.PracticeInterview);

    private record Request(string Subject);
}
