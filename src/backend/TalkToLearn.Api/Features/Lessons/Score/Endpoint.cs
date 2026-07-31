using System.Security.Claims;
using MediatR;
using TalkToLearn.Api.Common;

namespace TalkToLearn.Api.Features.Lessons.Score;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/lessons/score", async (Request req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var userId = user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            return (await mediator.Send(new ScoreCommand(userId, req.Subject, req.Transcript, req.DurationSeconds))).ToHttpResult();
        })
        .WithName("ScoreLesson").WithTags("Lessons")
        .RequireAuthorization(Permissions.PracticeInterview);

    private record Request(string Subject, string Transcript, int DurationSeconds);
}
