using MediatR;

namespace TalkToLearn.Api.Features.Auth.GetSession;

public static class Endpoint
{
    public static void Map(WebApplication app) =>
        app.MapGet("/auth/me", async (HttpContext ctx, IMediator mediator) =>
        {
            var token = ctx.Request.Headers.Authorization.FirstOrDefault()?.Replace("Bearer ", "")
                        ?? ctx.Request.Cookies["ttl_session"];
            return (await mediator.Send(new GetSessionQuery(token))).ToHttpResult();
        })
        .WithName("GetSession").WithTags("Auth").AllowAnonymous();
}
