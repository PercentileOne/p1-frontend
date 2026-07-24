using MediatR;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Features.Profile.GetProfile;
using TalkToLearn.Api.Features.Profile.Stats;
using TalkToLearn.Api.Features.Profile.UpdateProfile;

namespace TalkToLearn.Api.Features.Profile;

public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // GET /profile/stats — aggregated stats from lessonHistory Cosmos container
        app.MapGet("/profile/stats", async (HttpContext ctx, IMediator mediator) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var result = await mediator.Send(new StatsQuery(userId));
            return result.IsSuccess
                ? Results.Ok(result.Value)
                : Results.Problem(result.Error, statusCode: result.StatusCode);
        }).RequireAuthorization();

        // GET /profile — returns the current user's Cosmos profile document
        app.MapGet("/profile", async (HttpContext ctx, IMediator mediator) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var result = await mediator.Send(new GetProfileQuery(userId));
            return result.IsSuccess
                ? Results.Ok(result.Value)
                : Results.Problem(result.Error, statusCode: result.StatusCode);
        }).RequireAuthorization();

        // PUT /profile — upserts the current user's Cosmos profile
        app.MapPut("/profile", async (HttpContext ctx, UpdateProfileRequest req, IMediator mediator) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var cmd    = new UpdateProfileCommand(
                userId, req.FirstName, req.LastName, req.Bio,
                req.JobRole, req.JobTitle, req.Company, req.Phone, req.Avatar, req.Interests,
                req.LifeStage, req.DreamRoleTitle, req.DreamRoleIndustry, req.DreamRoleSalary, req.DreamRoleTimeline);
            var result = await mediator.Send(cmd);

            return result.IsSuccess
                ? Results.Ok(result.Value)
                : Results.Problem(result.Error, statusCode: result.StatusCode);
        }).RequireAuthorization();
    }
}

public record UpdateProfileRequest(
    string? FirstName,
    string? LastName,
    string? Bio,
    string? JobRole,
    string? JobTitle,
    string? Company,
    string? Phone,
    string? Avatar,
    List<string>? Interests,
    string? LifeStage,
    string? DreamRoleTitle,
    string? DreamRoleIndustry,
    string? DreamRoleSalary,
    string? DreamRoleTimeline);
