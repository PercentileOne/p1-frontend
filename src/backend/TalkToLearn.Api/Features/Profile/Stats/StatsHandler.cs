using System.Text.Json.Serialization;
using MediatR;
using Microsoft.Azure.Cosmos;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Infrastructure.Cosmos;

namespace TalkToLearn.Api.Features.Profile.Stats;

public class StatsHandler(CosmosService cosmos, ILogger<StatsHandler> logger)
    : IRequestHandler<StatsQuery, Result<ProfileStats>>
{
    private const int WeeklyGoal = 5;

    public async Task<Result<ProfileStats>> Handle(StatsQuery query, CancellationToken ct)
    {
        var container = cosmos.GetContainer("lessonHistory");

        var entries = new List<HistoryEntry>();
        try
        {
            var q = new QueryDefinition("SELECT * FROM c WHERE c.userId = @uid ORDER BY c.recordedAt DESC")
                .WithParameter("@uid", query.UserId);

            using var iter = container.GetItemQueryIterator<HistoryEntry>(q,
                requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(query.UserId) });

            while (iter.HasMoreResults)
            {
                var page = await iter.ReadNextAsync(ct);
                entries.AddRange(page);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to query lessonHistory for user {UserId}", query.UserId);
            return Result<ProfileStats>.Failure("Failed to load stats.", 500);
        }

        if (entries.Count == 0)
            return Result<ProfileStats>.Success(EmptyStats());

        var totalTalks   = entries.Count;
        var bestScore    = entries.Max(e => e.Overall);
        var avgScore     = (int)entries.Average(e => e.Overall);
        var totalMinutes = (int)(entries.Sum(e => e.DurationSeconds) / 60.0);
        var lifetimePts  = totalTalks * 200;

        // Weekly done — entries in last 7 days
        var cutoff     = DateTime.UtcNow.AddDays(-7);
        var weeklyDone = entries.Count(e =>
            DateTime.TryParse(e.RecordedAt, out var d) && d >= cutoff);

        // Streak — consecutive days with at least one session (today = day 1)
        var streak = ComputeStreak(entries);

        // Recent 6 sessions
        var recent = entries.Take(6).Select(e => new RecentSession(
            Subject:         e.Subject,
            Overall:         e.Overall,
            Grade:           Grade(e.Overall),
            DurationSeconds: e.DurationSeconds,
            RecordedAt:      e.RecordedAt
        )).ToList();

        // Top 3 subjects by count
        var top = entries
            .GroupBy(e => e.Subject.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(g => new TopSubject(g.Key, g.Count()))
            .OrderByDescending(s => s.Count)
            .Take(3)
            .ToList();

        return Result<ProfileStats>.Success(new ProfileStats(
            TotalTalks:     totalTalks,
            BestScore:      bestScore,
            AvgScore:       avgScore,
            TotalMinutes:   totalMinutes,
            LifetimePoints: lifetimePts,
            Streak:         streak,
            WeeklyDone:     weeklyDone,
            WeeklyGoal:     WeeklyGoal,
            RecentSessions: recent,
            TopSubjects:    top
        ));
    }

    private static int ComputeStreak(List<HistoryEntry> entries)
    {
        var dates = entries
            .Select(e => DateTime.TryParse(e.RecordedAt, out var d) ? (DateTime?)d.Date : null)
            .Where(d => d.HasValue)
            .Select(d => d!.Value)
            .Distinct()
            .OrderByDescending(d => d)
            .ToList();

        if (dates.Count == 0) return 0;

        var today     = DateTime.UtcNow.Date;
        var yesterday = today.AddDays(-1);

        // Streak must include today or yesterday to be active
        if (dates[0] < yesterday) return 0;

        var streak  = 1;
        var current = dates[0];
        for (var i = 1; i < dates.Count; i++)
        {
            if (current.AddDays(-1) == dates[i])
            {
                streak++;
                current = dates[i];
            }
            else break;
        }
        return streak;
    }

    private static string Grade(int overall) =>
        overall >= 90 ? "Outstanding" :
        overall >= 80 ? "Excellent"   :
        overall >= 70 ? "Good"        :
        overall >= 60 ? "Developing"  : "Keep Practising";

    private static ProfileStats EmptyStats() => new(
        TotalTalks: 0, BestScore: 0, AvgScore: 0, TotalMinutes: 0,
        LifetimePoints: 0, Streak: 0, WeeklyDone: 0, WeeklyGoal: WeeklyGoal,
        RecentSessions: [], TopSubjects: []);

    private class HistoryEntry
    {
        [JsonPropertyName("subject")]         public string Subject         { get; set; } = "";
        [JsonPropertyName("overall")]         public int    Overall         { get; set; }
        [JsonPropertyName("durationSeconds")] public int    DurationSeconds { get; set; }
        [JsonPropertyName("recordedAt")]      public string RecordedAt      { get; set; } = "";
    }
}
