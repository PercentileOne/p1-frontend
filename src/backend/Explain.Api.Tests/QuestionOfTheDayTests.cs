using Qotd = Explain.Api.Features.QuestionOfTheDay.Endpoint;

namespace Explain.Api.Tests;

// Question of the Day (2026-10-18): which topic is used, which day counts, how the streak is counted, and that the answer is never sent early.
public class QuestionOfTheDayTests
{
    private static readonly DateOnly Today = new(2026, 10, 18);

    [Fact]
    public void The_persons_own_topic_wins_over_everything_else()
    {
        Assert.Equal("Kubernetes", Qotd.ResolveTopic("  Kubernetes ", "Nurse", "Engineer", "Dev", "Pilot"));
    }

    [Fact]
    public void Topic_falls_back_through_alert_title_role_and_dream_role()
    {
        Assert.Equal("Nurse", Qotd.ResolveTopic(null, "Nurse", "Engineer", null, null));
        Assert.Equal("Engineer", Qotd.ResolveTopic("", " ", "Engineer", "Dev", null));
        Assert.Equal("Dev", Qotd.ResolveTopic(null, null, null, "Dev", "Pilot"));
        Assert.Equal("Pilot", Qotd.ResolveTopic(null, null, "", null, "Pilot"));
        Assert.Null(Qotd.ResolveTopic(null, null, null, null, null));
    }

    [Fact]
    public void A_long_topic_is_cut_to_the_limit()
    {
        var topic = Qotd.CleanTopic(new string('a', 200));
        Assert.Equal(Qotd.MaxTopic, topic!.Length);
    }

    [Fact]
    public void Only_today_and_a_day_either_side_count_as_the_day()
    {
        var now = new DateTime(2026, 10, 18, 9, 0, 0, DateTimeKind.Utc);
        Assert.Equal(Today, Qotd.ResolveDay(null, now));
        Assert.Equal(Today, Qotd.ResolveDay("2026-10-18", now));
        Assert.Equal(new DateOnly(2026, 10, 19), Qotd.ResolveDay("2026-10-19", now));   // somewhere ahead of UK time
        Assert.Equal(new DateOnly(2026, 10, 17), Qotd.ResolveDay("2026-10-17", now));
        Assert.Null(Qotd.ResolveDay("2026-10-25", now));
        Assert.Null(Qotd.ResolveDay("not a date", now));
    }

    [Fact]
    public void A_streak_counts_consecutive_days_ending_today()
    {
        Assert.Equal(3, Qotd.Streak(["2026-10-18", "2026-10-17", "2026-10-16", "2026-10-13"], Today));
        Assert.Equal(0, Qotd.Streak([], Today));
    }

    [Fact]
    public void A_streak_survives_until_today_is_over()
    {
        Assert.Equal(2, Qotd.Streak(["2026-10-17", "2026-10-16"], Today));   // today not answered yet
        Assert.Equal(0, Qotd.Streak(["2026-10-16", "2026-10-15"], Today));   // yesterday missed, the streak is gone
    }

    [Fact]
    public void The_reply_hides_the_correct_answer_until_the_question_is_answered()
    {
        var q = new Qotd.QuestionDay("qotd:2026-10-18", "u", "qotd", "2026-10-18", "Nurse", "Q?", ["a", "b", "c", "d"], 2, null, null, null, "t");
        var before = Qotd.Reply(q, [q], Today, false);
        Assert.False(before.answered);
        Assert.Null(before.correctIndex);
        Assert.Null(before.selectedIndex);
        Assert.Null(before.isCorrect);

        var done = q with { answeredAt = "t2", selectedIndex = 1, isCorrect = false };
        var after = Qotd.Reply(done, [done], Today, false);
        Assert.True(after.answered);
        Assert.Equal(2, after.correctIndex);
        Assert.Equal(1, after.selectedIndex);
        Assert.False(after.isCorrect);
        Assert.Equal(1, after.answeredTotal);
        Assert.Equal(0, after.correctTotal);
        Assert.Equal(1, after.streak);   // a wrong answer still keeps the daily habit going
    }

    [Fact]
    public void Totals_count_answered_and_correct_days()
    {
        QuestionDayFactory.Make("2026-10-18", true, out var a);
        QuestionDayFactory.Make("2026-10-17", false, out var b);
        var reply = Qotd.Reply(a, [a, b], Today, false);
        Assert.Equal(2, reply.answeredTotal);
        Assert.Equal(1, reply.correctTotal);
        Assert.Equal(2, reply.streak);
    }

    private static class QuestionDayFactory
    {
        public static void Make(string date, bool correct, out Qotd.QuestionDay day) =>
            day = new Qotd.QuestionDay("qotd:" + date, "u", "qotd", date, "Nurse", "Q?", ["a", "b", "c", "d"], 0, "t", correct ? 0 : 1, correct, "t");
    }
}
