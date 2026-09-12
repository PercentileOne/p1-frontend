using System.Security.Claims;
using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Talks.Score;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/talks/score", async (Request req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var userId = user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            return (await mediator.Send(new ScoreCommand(
                userId, req.Subject, req.Transcript, req.DurationSeconds, req.TargetDurationSeconds, req.IsPersonalStory))).ToHttpResult();
        })
        .WithName("ScoreTalk").WithTags("Talks")
        .RequireAuthorization(Permissions.PracticeInterview);

    private record Request(string Subject, string Transcript, int DurationSeconds, int TargetDurationSeconds, bool IsPersonalStory);
}
