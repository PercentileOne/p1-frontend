using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Profile.Stats;

public record StatsQuery(string UserId) : IRequest<Result<ProfileStats>>;

public record ProfileStats(
    int   TotalTalks,
    int   BestScore,
    int   AvgScore,
    int   TotalMinutes,
    int   LifetimePoints,
    int   Streak,
    int   WeeklyDone,
    int   WeeklyGoal,
    List<RecentSession> RecentSessions,
    List<TopSubject>    TopSubjects
);

public record RecentSession(
    string Subject,
    int    Overall,
    string Grade,
    int    DurationSeconds,
    string RecordedAt
);

public record TopSubject(string Label, int Count);
