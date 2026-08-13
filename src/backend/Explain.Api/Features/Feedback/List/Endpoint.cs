using System.Text.Json;
using Explain.Api.Infrastructure.Sql;
using Microsoft.EntityFrameworkCore;

namespace Explain.Api.Features.Feedback.List;

public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/admin/feedback", Handle)
           .WithName("ListFeedback")
           .WithTags("Feedback")
           .RequireAuthorization(Explain.Api.Common.Permissions.ViewAdminPortal);
    }

    private static async Task<IResult> Handle(AppDbContext db, int page = 1, int size = 50)
    {
        var skip  = (page - 1) * size;
        var total = await db.PortalFeedbacks.CountAsync();

        var rows = await db.PortalFeedbacks
            .OrderByDescending(x => x.SubmittedAt)
            .Skip(skip)
            .Take(size)
            .Select(x => new
            {
                x.Id, x.Name, x.Email, x.Occupation, x.AgeGroup, x.HowHeard,
                Ratings     = JsonSerializer.Deserialize<Dictionary<string, int>>(x.RatingsJson),
                x.Thoughts, x.Improvements, x.Recommend, x.Source, x.SubmittedAt,
            })
            .ToListAsync();

        return Results.Ok(new { total, page, size, rows });
    }
}
