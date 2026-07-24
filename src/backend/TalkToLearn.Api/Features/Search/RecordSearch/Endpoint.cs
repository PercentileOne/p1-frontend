using MediatR;

namespace TalkToLearn.Api.Features.Search.RecordSearch;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapPost("/searches/record", async (Request req, IMediator mediator) =>
            (await mediator.Send(new RecordSearchCommand(req.UserId, req.Subject, req.Category))).ToHttpResult())
           .WithName("RecordSearch").WithTags("Search").AllowAnonymous();

    private record Request(string UserId, string Subject, string? Category);
}
