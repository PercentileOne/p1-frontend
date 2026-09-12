using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Talks.WayneTips;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/talks/wayne-tips", async (Request req, IMediator mediator) =>
            (await mediator.Send(new WayneTipsCommand(req.Subject, req.IsPersonalStory))).ToHttpResult())
           .WithName("WayneTalkTips").WithTags("Talks")
           .RequireAuthorization(Permissions.PracticeInterview);

    private record Request(string Subject, bool IsPersonalStory);
}
