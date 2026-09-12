using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Talks.Score;

public record ScoreCommand(
    string UserId,
    string Subject,
    string Transcript,
    int DurationSeconds,
    int TargetDurationSeconds,
    bool IsPersonalStory
) : IRequest<Result<ScoreResult>>;

public record ScoreResult(
    string Subject,
    int Overall,
    string Grade,
    DimensionScore Clarity,
    DimensionScore Structure,
    DimensionScore Depth,
    DimensionScore Accuracy,
    DimensionScore Confidence,
    DimensionScore Engagement,
    DimensionScore TimeManagement,
    string OverallFeedback,
    int WordCount
);

public record DimensionScore(int Score, string Description);
