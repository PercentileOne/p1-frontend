using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Lessons.Score;

public record ScoreCommand(
    string UserId,
    string Subject,
    string Transcript,
    int DurationSeconds
) : IRequest<Result<ScoreResult>>;

public record ScoreResult(
    string Subject,
    int Overall,
    string Grade,
    DimensionScore Clarity,
    DimensionScore Depth,
    DimensionScore Accuracy,
    DimensionScore Structure,
    DimensionScore Confidence,
    string OverallFeedback,
    int WordCount
);

public record DimensionScore(int Score, string Description);
