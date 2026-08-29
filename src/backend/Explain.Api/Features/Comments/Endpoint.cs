using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Domain.Profile;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Comments;

/// <summary>
/// Comments left on a profile. Only enabled when the profile owner has explicitly turned
/// them on (UserProfile.CommentsEnabled, default false) — see Features/Profile/Block for
/// the companion per-profile block list a blocked commenter is checked against.
/// </summary>
public static class Endpoint
{
    private const int MaxTextLength = 1000;

    public static void Map(WebApplication app)
    {
        // GET /profile/{userId}/comments — visible comments on one profile, newest first.
        app.MapGet("/profile/{userId}/comments", async (string userId, HttpContext ctx, CosmosService cosmos) =>
        {
            var callerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(callerId)) return Results.Unauthorized();

            var comments = await ListVisibleCommentsAsync(cosmos, userId);
            return Results.Ok(comments.OrderByDescending(c => c.createdAt));
        }).RequireAuthorization();

        // POST /profile/{userId}/comments — post a comment on someone's profile.
        app.MapPost("/profile/{userId}/comments", async (string userId, CreateCommentRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var callerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(callerId)) return Results.Unauthorized();

            var text = req.Text?.Trim() ?? "";
            if (text.Length == 0) return Results.BadRequest(new { error = "Comment can't be empty." });
            if (text.Length > MaxTextLength) return Results.BadRequest(new { error = $"Comment must be {MaxTextLength} characters or fewer." });
            if (HasRepeatedCharSpam(text)) return Results.BadRequest(new { error = "That comment looks like spam." });

            var profilesContainer = cosmos.GetContainer("profiles");
            UserProfile targetProfile;
            try
            {
                var response = await profilesContainer.ReadItemAsync<UserProfile>(userId, new PartitionKey(userId));
                targetProfile = response.Resource;
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound(new { error = "Profile not found." });
            }

            if (!targetProfile.CommentsEnabled)
                return Results.Problem("This profile isn't accepting comments right now.", statusCode: 403);
            if (targetProfile.BlockedUsers.Any(b => b.UserId == callerId))
                return Results.Problem("You've been blocked from commenting on this profile.", statusCode: 403);

            string authorName = ctx.User.FindFirst("name")?.Value ?? "A candidate";
            string? authorAvatarUrl = null;
            try
            {
                var callerResponse = await profilesContainer.ReadItemAsync<UserProfile>(callerId, new PartitionKey(callerId));
                if (!string.IsNullOrWhiteSpace(callerResponse.Resource.Name)) authorName = callerResponse.Resource.Name;
                authorAvatarUrl = callerResponse.Resource.Avatar;
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* fall back to JWT name */ }

            var comment = new ProfileComment(
                id: Guid.NewGuid().ToString(),
                profileUserId: userId,
                authorUserId: callerId,
                authorName: authorName,
                authorAvatarUrl: authorAvatarUrl,
                text: text,
                createdAt: DateTimeOffset.UtcNow,
                status: "visible",
                reportCount: 0,
                reportedByUserIds: [],
                lastReportedAt: null);

            var commentsContainer = cosmos.GetContainer("profile-comments");
            await commentsContainer.UpsertItemAsync(comment, new PartitionKey(userId));
            return Results.Ok(comment);
        }).RequireAuthorization();

        // DELETE /comments/{id}?profileUserId=... — the author, or the profile owner, can remove a comment.
        app.MapDelete("/comments/{id}", async (string id, string profileUserId, HttpContext ctx, CosmosService cosmos) =>
        {
            var callerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(callerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("profile-comments");
            ProfileComment existing;
            try
            {
                existing = await container.ReadItemAsync<ProfileComment>(id, new PartitionKey(profileUserId));
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }

            if (callerId != existing.authorUserId && callerId != profileUserId)
                return Results.Forbid();

            var updated = existing with { status = "deleted" };
            await container.UpsertItemAsync(updated, new PartitionKey(profileUserId));
            return Results.NoContent();
        }).RequireAuthorization();

        // POST /comments/{id}/report?profileUserId=... — flag a comment for admin review.
        app.MapPost("/comments/{id}/report", async (string id, string profileUserId, HttpContext ctx, CosmosService cosmos) =>
        {
            var callerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(callerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("profile-comments");
            ProfileComment existing;
            try
            {
                existing = await container.ReadItemAsync<ProfileComment>(id, new PartitionKey(profileUserId));
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }

            if (existing.reportedByUserIds.Contains(callerId))
                return Results.Ok(existing); // already reported by this user — no-op, not an error

            var updated = existing with
            {
                reportCount = existing.reportCount + 1,
                reportedByUserIds = [.. existing.reportedByUserIds, callerId],
                lastReportedAt = DateTimeOffset.UtcNow,
            };
            await container.UpsertItemAsync(updated, new PartitionKey(profileUserId));
            return Results.Ok(updated);
        }).RequireAuthorization();
    }

    internal static async Task<List<ProfileComment>> ListVisibleCommentsAsync(CosmosService cosmos, string profileUserId)
    {
        var container = cosmos.GetContainer("profile-comments");
        var query = new QueryDefinition("SELECT * FROM c WHERE c.profileUserId = @pid AND c.status = 'visible'")
            .WithParameter("@pid", profileUserId);
        var comments = new List<ProfileComment>();
        using var feed = container.GetItemQueryIterator<ProfileComment>(
            query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(profileUserId) });
        while (feed.HasMoreResults)
            comments.AddRange(await feed.ReadNextAsync());
        return comments;
    }

    // Cheap spam gate mirroring MissingCareerFunction.LooksMalformed's repeated-char check —
    // deliberately NOT the letterish-ratio check from that heuristic, since real comments
    // legitimately use punctuation/emoji a job title never would.
    private static bool HasRepeatedCharSpam(string text)
    {
        var run = 1;
        for (var i = 1; i < text.Length; i++)
        {
            run = text[i] == text[i - 1] ? run + 1 : 1;
            if (run >= 4) return true;
        }
        return false;
    }
}

public record CreateCommentRequest(string Text);

public record ProfileComment(
    string id,
    string profileUserId,
    string authorUserId,
    string authorName,
    string? authorAvatarUrl,
    string text,
    DateTimeOffset createdAt,
    string status,
    int reportCount,
    List<string> reportedByUserIds,
    DateTimeOffset? lastReportedAt);
