using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Domain.Profile;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Profile.Block;

/// <summary>
/// Per-profile blocking — the profile owner stops one user from commenting on their own
/// profile. Deliberately NOT a platform-wide ban/suspension (no such mechanic exists
/// anywhere in this codebase; that would touch login/auth and is a separate initiative).
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // POST /profile/block/{userId} — block userId from commenting on the caller's own profile.
        app.MapPost("/profile/block/{userId}", async (string userId, HttpContext ctx, CosmosService cosmos) =>
        {
            var callerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(callerId)) return Results.Unauthorized();
            if (userId == callerId) return Results.BadRequest(new { error = "You can't block yourself." });

            var container = cosmos.GetContainer("profiles");
            var profile = await GetOrCreateOwnProfileAsync(container, callerId);

            if (profile.BlockedUsers.Any(b => b.UserId == userId))
                return Results.Ok(new { blockedUsers = profile.BlockedUsers });

            var blockedName = "A user";
            try
            {
                var blockedResponse = await container.ReadItemAsync<UserProfile>(userId, new PartitionKey(userId));
                if (!string.IsNullOrWhiteSpace(blockedResponse.Resource.Name)) blockedName = blockedResponse.Resource.Name;
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* keep fallback name */ }

            profile.BlockedUsers.Add(new BlockedUserRef
            {
                UserId = userId,
                Name = blockedName,
                BlockedAt = DateTime.UtcNow.ToString("O"),
            });
            await container.UpsertItemAsync(profile, new PartitionKey(callerId));
            return Results.Ok(new { blockedUsers = profile.BlockedUsers });
        }).RequireAuthorization();

        // POST /profile/unblock/{userId}
        app.MapPost("/profile/unblock/{userId}", async (string userId, HttpContext ctx, CosmosService cosmos) =>
        {
            var callerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(callerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("profiles");
            var profile = await GetOrCreateOwnProfileAsync(container, callerId);

            profile.BlockedUsers.RemoveAll(b => b.UserId == userId);
            await container.UpsertItemAsync(profile, new PartitionKey(callerId));
            return Results.Ok(new { blockedUsers = profile.BlockedUsers });
        }).RequireAuthorization();
    }

    private static async Task<UserProfile> GetOrCreateOwnProfileAsync(Container container, string userId)
    {
        try
        {
            var response = await container.ReadItemAsync<UserProfile>(userId, new PartitionKey(userId));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            // Id must equal UserId — every profile lookup reads by id=userId (see
            // UserProfile.Create's comment on the same invariant).
            return new UserProfile { Id = userId, UserId = userId };
        }
    }
}
