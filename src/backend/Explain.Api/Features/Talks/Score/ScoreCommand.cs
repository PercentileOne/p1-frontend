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
    int WordCount,
    // The distinct, concrete points a listener would actually walk away with — not a quality
    // judgment like the six dimensions above, a literal count of what stuck. An empty list is a
    // real, meaningful result (the talk didn't land anything memorable), not a missing value.
    IReadOnlyList<string> Takeaways
);

public record DimensionScore(int Score, string Description);
