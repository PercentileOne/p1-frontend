using Explain.Api.Features.InterviewPreps;
using Preps = Explain.Api.Features.InterviewPreps.Endpoint;

namespace Explain.Api.Tests;

// The recruiter outcome report (2026-10-18): how a candidate's steps change a prep. The recruiter sees opened / started / questions answered / finished,
// never answers or scores, so nothing here can carry a score.
public class PrepProgressTests
{
    private static readonly DateTimeOffset T1 = new(2026, 10, 19, 9, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset T2 = T1.AddMinutes(5);
    private static readonly DateTimeOffset T3 = T1.AddMinutes(20);

    private static InterviewPrep Prep() => new("p1", "r1", "Sam", null, "Priya", "Shah", "priya@example.com", "Analyst", "Pro", T1, "spec", null, null, "sent", T1, null);

    [Fact]
    public void A_new_prep_has_no_progress()
    {
        var p = Prep();
        Assert.Null(p.openedAt); Assert.Null(p.startedAt); Assert.Null(p.finishedAt);
        Assert.Equal(0, p.answered); Assert.Equal(0, p.totalQuestions); Assert.Equal(0, p.attempts); Assert.Equal(0, p.completedAttempts);
    }

    [Fact]
    public void Opening_is_recorded_once_and_moves_status_on_from_sent()
    {
        var opened = Preps.ApplyProgress(Prep(), "opened", null, null, T1);
        Assert.Equal(T1, opened.openedAt);
        Assert.Equal("opened", opened.status);
        var again = Preps.ApplyProgress(opened, "opened", null, null, T2);
        Assert.Equal(T1, again.openedAt);                 // the first time is kept
        Assert.Equal(T2, again.lastActivityAt);
    }

    [Fact]
    public void Starting_sets_the_total_and_counts_a_go()
    {
        var started = Preps.ApplyProgress(Prep(), "started", null, 10, T1);
        Assert.Equal(T1, started.startedAt);
        Assert.Equal(10, started.totalQuestions);
        Assert.Equal(0, started.answered);
        Assert.Equal(1, started.attempts);
        Assert.Equal("started", started.status);
    }

    [Fact]
    public void Answers_only_count_up_within_a_go_and_never_pass_the_total()
    {
        var p = Preps.ApplyProgress(Prep(), "started", null, 5, T1);
        p = Preps.ApplyProgress(p, "answered", 2, 5, T2);
        Assert.Equal(2, p.answered);
        p = Preps.ApplyProgress(p, "answered", 1, 5, T2);          // a late, smaller report changes nothing
        Assert.Equal(2, p.answered);
        p = Preps.ApplyProgress(p, "answered", 99, 5, T3);
        Assert.Equal(5, p.answered);                                // clamped to the total
    }

    [Fact]
    public void Each_start_is_another_go_and_each_finished_go_counts_once()
    {
        var p = Prep();
        for (var go = 1; go <= 3; go++)
        {
            p = Preps.ApplyProgress(p, "started", null, 4, T1.AddHours(go));
            p = Preps.ApplyProgress(p, "answered", 4, 4, T1.AddHours(go).AddMinutes(10));
            p = Preps.ApplyProgress(p, "finished", 4, 4, T1.AddHours(go).AddMinutes(11));
            p = Preps.ApplyProgress(p, "finished", 4, 4, T1.AddHours(go).AddMinutes(12));   // reported twice: still one finished go
        }
        Assert.Equal(3, p.attempts);
        Assert.Equal(3, p.completedAttempts);
        Assert.Equal("finished", p.status);
        Assert.Equal(4, p.answered);
    }

    [Fact]
    public void A_go_that_is_started_but_not_finished_counts_as_a_go_only()
    {
        var p = Preps.ApplyProgress(Prep(), "started", null, 6, T1);
        p = Preps.ApplyProgress(p, "answered", 2, 6, T2);
        p = Preps.ApplyProgress(p, "finished", 6, 6, T2);           // finished once...
        p = Preps.ApplyProgress(p, "started", null, 6, T3);         // ...then a second go that is left half way
        p = Preps.ApplyProgress(p, "answered", 3, 6, T3);
        Assert.Equal(2, p.attempts);
        Assert.Equal(1, p.completedAttempts);
        Assert.Equal("started", p.status);
        Assert.Equal(3, p.answered);                                // the latest go
    }

    [Fact]
    public void Unknown_steps_and_wild_numbers_are_safe()
    {
        var p = Prep();
        Assert.Same(p, Preps.ApplyProgress(p, "scored", 5, 5, T1));    // there is no way to send a score
        Assert.Same(p, Preps.ApplyProgress(p, null, null, null, T1));
        var big = Preps.ApplyProgress(p, "started", null, 100000, T1);
        Assert.Equal(200, big.totalQuestions);
    }
}
