using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.QuestionBank;

/// <summary>
/// A candidate's personal, explicitly-curated library of question+model-answer pairs
/// (Francis, 2026-09-17) — saved one at a time, only when they click "Save & Continue" on
/// AnswerRevealOverlay after using "Tell Me The Answer" mid-interview. See CosmosService.cs's
/// own comment on why this is a separate container from qaLog, not a filtered view of it.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/question-bank", async (SaveRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(req.QuestionText) || string.IsNullOrWhiteSpace(req.AnswerText))
                return Results.BadRequest(new { error = "Question and answer text are required." });

            var entry = new QuestionBankEntry(
                id: Guid.NewGuid().ToString(),
                candidateId: candidateId,
                questionText: req.QuestionText.Trim(),
                answerText: req.AnswerText.Trim(),
                questionType: string.IsNullOrWhiteSpace(req.QuestionType) ? null : req.QuestionType.Trim(),
                difficulty: string.IsNullOrWhiteSpace(req.Difficulty) ? null : req.Difficulty.Trim(),
                competencyTags: req.CompetencyTags is { Length: > 0 } ? req.CompetencyTags : null,
                jobTitle: string.IsNullOrWhiteSpace(req.JobTitle) ? null : req.JobTitle.Trim(),
                company: string.IsNullOrWhiteSpace(req.Company) ? null : req.Company.Trim(),
                interviewId: string.IsNullOrWhiteSpace(req.InterviewId) ? null : req.InterviewId.Trim(),
                savedAt: DateTimeOffset.UtcNow.ToString("o"));

            var container = cosmos.GetContainer("questionBank");
            await container.CreateItemAsync(entry, new PartitionKey(candidateId));

            return Results.Ok(entry);
        })
        .WithName("SaveQuestionBankEntry").WithTags("QuestionBank")
        .RequireAuthorization(Permissions.PracticeInterview);

        app.MapGet("/api/question-bank", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("questionBank");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.candidateId = @cid ORDER BY c.savedAt DESC")
                .WithParameter("@cid", candidateId);

            var items = new List<QuestionBankEntry>();
            using var feed = container.GetItemQueryIterator<QuestionBankEntry>(
                query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(candidateId) });
            while (feed.HasMoreResults)
                items.AddRange(await feed.ReadNextAsync());

            return Results.Ok(items);
        })
        .WithName("ListQuestionBank").WithTags("QuestionBank")
        .RequireAuthorization(Permissions.PracticeInterview);

        // Lets a candidate remove something they no longer want in their own library — the
        // one mutation a purely-additive "save" feature still genuinely needs.
        app.MapDelete("/api/question-bank/{id}", async (string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("questionBank");
            try
            {
                await container.DeleteItemAsync<QuestionBankEntry>(id, new PartitionKey(candidateId));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                // Already gone — deleting a delete is a success from the caller's point of view.
            }

            return Results.Ok(new { deleted = true });
        })
        .WithName("DeleteQuestionBankEntry").WithTags("QuestionBank")
        .RequireAuthorization(Permissions.PracticeInterview);
    }

    public record SaveRequest(
        string QuestionText,
        string AnswerText,
        string? QuestionType,
        string? Difficulty,
        string[]? CompetencyTags,
        string? JobTitle,
        string? Company,
        string? InterviewId);
}

public record QuestionBankEntry(
    string id,
    string candidateId,
    string questionText,
    string answerText,
    string? questionType,
    string? difficulty,
    string[]? competencyTags,
    string? jobTitle,
    string? company,
    string? interviewId,
    string savedAt);
