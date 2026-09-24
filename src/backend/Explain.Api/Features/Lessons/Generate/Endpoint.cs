using System.Net;
using System.Security.Claims;
using MediatR;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Lessons.Generate;

public static class Endpoint
{
    // Public, no-login Learn (Francis, 2026-09-24: "accessible to everyone from the marketing
    // page... just mean 'accessible' without an account"). Reuses the exact same
    // GenerateLessonCommand/handler an authenticated candidate uses — including its Cosmos-shared
    // cache keyed by subject — so the expensive Anthropic call only ever happens once per unique
    // subject, ever, regardless of who (or how many anonymous visitors) asks for it. That cache
    // already does most of the cost-control work; this endpoint's own daily caps exist only to
    // stop a burst of never-before-seen subjects from one visitor/IP.
    private const int DefaultPerVisitorPerDay = 10;
    private const int DefaultGlobalPerDay = 300;

    public static void Map(WebApplication app)
    {
        app.MapPost("/lessons/generate", async (Request req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var userId = user.FindFirst("sub")?.Value ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            return (await mediator.Send(new GenerateLessonCommand(req.Subject, userId))).ToHttpResult();
        })
        .WithName("GenerateLesson").WithTags("Lessons")
        .RequireAuthorization(Permissions.PracticeInterview);

        app.MapPost("/api/learn/public/generate", async (Request req, HttpContext ctx, IMediator mediator, CosmosService cosmos, IConfiguration config) =>
        {
            if (string.IsNullOrWhiteSpace(req.Subject) || req.Subject.Trim().Length > 120)
                return Results.BadRequest(new { error = "Tell us what you'd like to learn about." });

            var capsEnabled = (await PlatformSettings.Endpoint.GetLearnCapsOrDefaultAsync(cosmos)).capsEnabled;
            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            if (capsEnabled &&
                (!(await CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync($"learn:public:ip:{ip}", config.GetValue("Learn:PublicPerVisitorPerDay", DefaultPerVisitorPerDay), cosmos)).allowed
                || !(await CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync("learn:public:global", config.GetValue("Learn:PublicGlobalPerDay", DefaultGlobalPerDay), cosmos)).allowed))
                return Results.Json(new { capped = true, message = "Lots of people are learning right now — please try again shortly." }, statusCode: (int)HttpStatusCode.TooManyRequests);

            var result = await mediator.Send(new GenerateLessonCommand(req.Subject.Trim(), "anonymous"));
            return result.ToHttpResult();
        })
        .WithName("GeneratePublicLesson").WithTags("Lessons")
        .AllowAnonymous();
    }

    private record Request(string Subject);
}
