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
    // Split out from Structure, 2026-09-14, per Francis's own request — the primacy/recency
    // effect trial lawyers build closing arguments around (listeners remember the opening and
    // closing far better than the middle) is important enough to score on its own rather than
    // being one clause inside Structure's description text.
    DimensionScore OpeningClosingStrength,
    DimensionScore TimeManagement,
    string OverallFeedback,
    int WordCount,
    // The distinct, concrete points a listener would actually walk away with — not a quality
    // judgment like the six dimensions above, a literal count of what stuck. An empty list is a
    // real, meaningful result (the talk didn't land anything memorable), not a missing value.
    IReadOnlyList<string> Takeaways
);

public record DimensionScore(int Score, string Description);
