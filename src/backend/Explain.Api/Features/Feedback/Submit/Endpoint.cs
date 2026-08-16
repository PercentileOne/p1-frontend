using System.Text.Json;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Feedback.Submit;

public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/feedback", Handle)
           .WithName("SubmitFeedback")
           .WithTags("Feedback")
           .AllowAnonymous();
    }

    private static async Task<IResult> Handle(Request req, AppDbContext db, ILogger<Program> logger)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return Results.BadRequest(new { error = "Name is required." });

        if (string.IsNullOrWhiteSpace(req.Thoughts) || req.Thoughts.Trim().Length < 10)
            return Results.BadRequest(new { error = "Please share a few thoughts." });

        var entry = new PortalFeedback
        {
            Name         = req.Name.Trim(),
            Email        = req.Email?.Trim(),
            Occupation   = req.Occupation?.Trim(),
            AgeGroup     = req.AgeGroup,
            HowHeard     = req.HowHeard,
            RatingsJson  = JsonSerializer.Serialize(req.Ratings ?? new Dictionary<string, int>()),
            Thoughts     = req.Thoughts.Trim(),
            Improvements = req.Improvements?.Trim(),
            Recommend    = req.Recommend,
            Source       = req.Source ?? "interviewme.global/feedback",
            SubmittedAt  = req.SubmittedAt ?? DateTime.UtcNow,
        };

        db.PortalFeedbacks.Add(entry);
        await db.SaveChangesAsync();

        logger.LogInformation("Feedback submitted by {Name} ({Email}) from {Source}", entry.Name, entry.Email ?? "anonymous", entry.Source);
        return Results.Ok(new { id = entry.Id, message = "Thank you for your feedback." });
    }

    private record Request(
        string                    Name,
        string?                   Email,
        string?                   Occupation,
        string?                   AgeGroup,
        string?                   HowHeard,
        Dictionary<string, int>?  Ratings,
        string                    Thoughts,
        string?                   Improvements,
        string?                   Recommend,
        string?                   Source,
        DateTime?                 SubmittedAt
    );
}
