using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Follows;

/// <summary>
/// Following another person (2026-10-18). The Follows table and the Follow button on a profile existed from the start, but the button only changed what was on screen and nothing was saved.
/// This makes it real: follow, unfollow, and "do I follow them, and how many follow them". One row per pair (the table has a unique index), so following twice changes nothing.
/// The first thing that depends on it is a person's liked videos, which only the people who follow them can see, and only when they have switched that on (Features/FeedVideos).
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        var group = app.MapGroup("/api/follows").RequireAuthorization(Permissions.PracticeInterview).WithTags("Follows");

        group.MapGet("/{userId}", async (string userId, HttpContext ctx, AppDbContext db, CancellationToken ct) =>
        {
            var me = UserId(ctx); if (me is null) return Results.Unauthorized();
            return Results.Ok(await StateAsync(db, me, userId, ct));
        });

        group.MapPut("/{userId}", async (string userId, FollowRequest req, HttpContext ctx, AppDbContext db, CancellationToken ct) =>
        {
            var me = UserId(ctx); if (me is null) return Results.Unauthorized();
            if (!CanFollow(me, userId)) return Results.BadRequest(new { error = "You cannot follow yourself." });
            if (!await db.Users.AnyAsync(u => u.Id == userId, ct)) return Results.NotFound();

            var existing = await db.Follows.FirstOrDefaultAsync(f => f.FollowerId == me && f.FolloweeId == userId, ct);
            if (req.On && existing is null) db.Follows.Add(new Follow { FollowerId = me, FolloweeId = userId });
            else if (!req.On && existing is not null) db.Follows.Remove(existing);
            await db.SaveChangesAsync(ct);
            return Results.Ok(await StateAsync(db, me, userId, ct));
        });
    }

    // ---- pure rules (tested) ----

    public static bool CanFollow(string follower, string followee) => !string.IsNullOrEmpty(followee) && follower != followee;

    // ---- shaping ----

    public static async Task<FollowState> StateAsync(AppDbContext db, string me, string userId, CancellationToken ct) =>
        new(await db.Follows.AnyAsync(f => f.FollowerId == me && f.FolloweeId == userId, ct),
            await db.Follows.CountAsync(f => f.FolloweeId == userId, ct));

    public static Task<bool> FollowsAsync(AppDbContext db, string follower, string followee, CancellationToken ct) =>
        db.Follows.AnyAsync(f => f.FollowerId == follower && f.FolloweeId == followee, ct);

    private static string? UserId(HttpContext ctx) => ctx.User.FindFirst("sub")?.Value is { Length: > 0 } s ? s : null;

    public record FollowRequest(bool On);
    public record FollowState(bool following, int followers);
}
