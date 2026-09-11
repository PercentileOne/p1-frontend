using MediatR;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Domain.Profile;
using Explain.Api.Features.Profile.GetProfile;
using Explain.Api.Features.Profile.GetPublicProfile;
using Explain.Api.Features.Profile.Stats;
using Explain.Api.Features.Profile.UpdateProfile;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Storage;

namespace Explain.Api.Features.Profile;

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

        // GET /profile/{userId} — trimmed public projection of another user's profile,
        // used to view someone else's profile (Like/Comment target). Never returns
        // phone or dream-role fields.
        app.MapGet("/profile/{userId}", async (string userId, HttpContext ctx, IMediator mediator, CosmosService cosmos) =>
        {
            var viewerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(viewerId))
                return Results.Unauthorized();

            var result = await mediator.Send(new GetPublicProfileQuery(userId));
            if (result.IsSuccess && viewerId != userId)
                await IncrementCounterAsync(cosmos, userId, "/profileViews");

            return result.IsSuccess
                ? Results.Ok(result.Value)
                : Results.Problem(result.Error, statusCode: result.StatusCode);
        }).RequireAuthorization();

        // GET /profile/engagement — the dashboard's "Your Profile Buzz" card: real profile
        // views and real shared-interview views (both in profileViewCounters, incremented here
        // and in Interviews/Endpoint.cs's shared-view route), plus real likes via the existing
        // reactions container.
        app.MapGet("/profile/engagement", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

            var counters = cosmos.GetContainer("profileViewCounters");
            int profileViews = 0, interviewViews = 0;
            try
            {
                var doc = await counters.ReadItemAsync<ProfileViewCounterDoc>(userId, new PartitionKey(userId));
                profileViews = doc.Resource.profileViews;
                interviewViews = doc.Resource.interviewViews;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { /* no views yet */ }

            var reactions = cosmos.GetContainer("reactions");
            var likeQuery = new QueryDefinition("SELECT VALUE COUNT(1) FROM c WHERE c.targetId = @tid AND c.targetType = 'profile'")
                .WithParameter("@tid", userId);
            using var likeFeed = reactions.GetItemQueryIterator<int>(likeQuery, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(userId) });
            var likePage = await likeFeed.ReadNextAsync();
            var likes = likePage.FirstOrDefault();

            return Results.Ok(new { profileViews, interviewViews, likes });
        }).RequireAuthorization();

        // PUT /profile — upserts the current user's Cosmos profile
        app.MapPut("/profile", async (HttpContext ctx, UpdateProfileRequest req, IMediator mediator) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            var cmd = new UpdateProfileCommand(
                UserId: userId,
                FirstName: req.FirstName, LastName: req.LastName, Bio: req.Bio,
                JobRole: req.JobRole, JobTitle: req.JobTitle, Company: req.Company, Phone: req.Phone,
                Avatar: req.Avatar, Interests: req.Interests,
                LifeStage: req.LifeStage, DreamRoleTitle: req.DreamRoleTitle, DreamRoleIndustry: req.DreamRoleIndustry,
                DreamRoleSalary: req.DreamRoleSalary, DreamRoleTimeline: req.DreamRoleTimeline,
                Location: req.Location, Banner: req.Banner, FavouriteFilms: req.FavouriteFilms, Projects: req.Projects,
                CommentsEnabled: req.CommentsEnabled, SearchableByRecruiters: req.SearchableByRecruiters,
                EmploymentTypePreference: req.EmploymentTypePreference, RemotePreference: req.RemotePreference);
            var result = await mediator.Send(cmd);

            return result.IsSuccess
                ? Results.Ok(result.Value)
                : Results.Problem(result.Error, statusCode: result.StatusCode);
        }).RequireAuthorization();

        // POST /profile/avatar, POST /profile/banner — multipart/form-data: "file"
        app.MapPost("/profile/avatar", async (HttpRequest req, ProfileImageStorageService images, IMediator mediator) =>
            await UploadProfileImageAsync(req, images, mediator, "avatar")).RequireAuthorization().DisableAntiforgery();

        app.MapPost("/profile/banner", async (HttpRequest req, ProfileImageStorageService images, IMediator mediator) =>
            await UploadProfileImageAsync(req, images, mediator, "banner")).RequireAuthorization().DisableAntiforgery();
    }

    // Patch-or-create atomic increment, same shape as CareerCoach/Endpoint.cs's daily-usage
    // counter — patch an existing doc, or create one at 1 if this candidate has never been
    // viewed before, with a retry-on-Conflict fallback for the rare concurrent-first-view race.
    // Best-effort: a view counter failing must never break the profile/interview fetch it rides
    // along with, so callers don't propagate exceptions from this.
    internal static async Task IncrementCounterAsync(CosmosService cosmos, string candidateId, string counterPath)
    {
        var container = cosmos.GetContainer("profileViewCounters");
        try
        {
            try
            {
                await container.PatchItemAsync<ProfileViewCounterDoc>(candidateId, new PartitionKey(candidateId), [PatchOperation.Increment(counterPath, 1)]);
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                var doc = counterPath == "/profileViews"
                    ? new ProfileViewCounterDoc(candidateId, candidateId, 1, 0)
                    : new ProfileViewCounterDoc(candidateId, candidateId, 0, 1);
                try
                {
                    await container.CreateItemAsync(doc, new PartitionKey(candidateId));
                }
                catch (CosmosException createEx) when (createEx.StatusCode == System.Net.HttpStatusCode.Conflict)
                {
                    await container.PatchItemAsync<ProfileViewCounterDoc>(candidateId, new PartitionKey(candidateId), [PatchOperation.Increment(counterPath, 1)]);
                }
            }
        }
        catch { /* view counters are a nice-to-have, never worth failing the real request over */ }
    }

    private static readonly Dictionary<string, string> AllowedImageTypes = new()
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
    };
    private const long MaxImageBytes = 5L * 1024 * 1024; // 5MB — generous for a profile photo

    private static async Task<IResult> UploadProfileImageAsync(
        HttpRequest req, ProfileImageStorageService images, IMediator mediator, string kind)
    {
        var userId = req.HttpContext.User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
        if (!req.HasFormContentType) return Results.BadRequest(new { error = "Expected multipart/form-data" });
        if (!images.IsConfigured) return Results.Problem("Image storage is not configured.", statusCode: 503);

        var form = await req.ReadFormAsync();
        var file = form.Files["file"];
        if (file is null || file.Length == 0) return Results.BadRequest(new { error = "file is required" });
        if (file.Length > MaxImageBytes) return Results.BadRequest(new { error = "Image must be 5MB or smaller." });
        if (file.ContentType is null || !AllowedImageTypes.TryGetValue(file.ContentType, out var ext))
            return Results.BadRequest(new { error = "Only JPEG, PNG, or WEBP images are allowed." });

        await using (var stream = file.OpenReadStream())
        {
            await images.UploadAsync(userId, kind, ext, stream, file.ContentType);
        }

        var url = images.GetReadUrl(userId, kind, ext);
        if (url is null) return Results.Problem("Failed to generate image URL.", statusCode: 500);

        var cmd = kind == "avatar"
            ? new UpdateProfileCommand(UserId: userId, FirstName: null, LastName: null, Bio: null,
                JobRole: null, JobTitle: null, Company: null, Phone: null, Avatar: url, Interests: null)
            : new UpdateProfileCommand(UserId: userId, FirstName: null, LastName: null, Bio: null,
                JobRole: null, JobTitle: null, Company: null, Phone: null, Avatar: null, Interests: null, Banner: url);

        var result = await mediator.Send(cmd);
        return result.IsSuccess ? Results.Ok(new { url }) : Results.Problem(result.Error, statusCode: result.StatusCode);
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
    string? DreamRoleTimeline,
    string? Location = null,
    string? Banner = null,
    List<string>? FavouriteFilms = null,
    List<ProfileProject>? Projects = null,
    bool? CommentsEnabled = null,
    bool? SearchableByRecruiters = null,
    string? EmploymentTypePreference = null,
    string? RemotePreference = null);

public record ProfileViewCounterDoc(string id, string candidateId, int profileViews, int interviewViews);
