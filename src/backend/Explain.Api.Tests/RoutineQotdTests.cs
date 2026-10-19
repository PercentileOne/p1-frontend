using Routines = Explain.Api.Features.Routines.Endpoint;

namespace Explain.Api.Tests;

// The self-ticking "answer my Question of the Day" routine item (2026-10-19): it ticks when the question has really been answered, and never by hand.
public class RoutineQotdTests
{
    private static Routines.DayDoc Day(Dictionary<string, bool>? ticks = null) => new(
        "day:2026-10-19", "u", "day", "2026-10-19", ["Morning"],
        [new Routines.DayItem("q", "Answer my Question of the Day", "Morning", "qotd", false, null, "template"),
         new Routines.DayItem("c", "Make the bed", "Morning", "check", true, null, "template")],
        ticks ?? new(), new(), "t");

    [Fact]
    public void The_new_kind_is_accepted_and_unknown_kinds_still_become_a_plain_tick()
    {
        Assert.Equal("qotd", Routines.NormaliseKind("qotd"));
        Assert.Equal("check", Routines.NormaliseKind("nonsense"));
        Assert.Equal("read", Routines.NormaliseKind("read"));
    }

    [Fact]
    public void Answering_the_question_ticks_the_item()
    {
        var day = Routines.WithAutoTicks(Day(), qotdAnswered: true);
        Assert.True(day.@checked["q"]);
    }

    [Fact]
    public void Until_it_is_answered_the_item_is_not_ticked_even_if_it_was_ticked_by_hand_or_left_over()
    {
        var day = Routines.WithAutoTicks(Day(new() { ["q"] = true }), qotdAnswered: false);
        Assert.False(day.@checked.ContainsKey("q"));
    }

    [Fact]
    public void Other_items_ticks_are_left_exactly_as_they_were()
    {
        var day = Routines.WithAutoTicks(Day(new() { ["c"] = true }), qotdAnswered: true);
        Assert.True(day.@checked["c"]);
        Assert.True(day.@checked["q"]);
        var back = Routines.WithAutoTicks(day, qotdAnswered: false);
        Assert.True(back.@checked["c"]);
        Assert.False(back.@checked.ContainsKey("q"));
    }

    [Fact]
    public void Nothing_changes_and_the_same_day_comes_back_when_it_already_matches()
    {
        var answered = Routines.WithAutoTicks(Day(), true);
        Assert.Same(answered, Routines.WithAutoTicks(answered, true));
        var plain = Day();
        Assert.Same(plain, Routines.WithAutoTicks(plain, false));
    }

    [Fact]
    public void A_day_with_no_self_ticking_item_is_never_touched()
    {
        var day = Day() with { items = [new Routines.DayItem("c", "Make the bed", "Morning", "check", true, null, "template")], @checked = new() { ["c"] = true } };
        Assert.False(Routines.HasAutoItems(day));
        Assert.Same(day, Routines.WithAutoTicks(day, true));
        Assert.Same(day, Routines.WithAutoTicks(day, false));
    }

    [Fact]
    public void The_item_counts_towards_the_days_progress_once_it_is_ticked()
    {
        var before = Routines.Summary(Routines.WithAutoTicks(Day(), false));
        var after = Routines.Summary(Routines.WithAutoTicks(Day(), true));
        Assert.Equal(2, before.total);
        Assert.Equal(0, before.done);
        Assert.Equal(1, after.done);
    }

    [Fact]
    public void A_template_item_of_the_new_kind_appears_on_the_day_as_that_kind()
    {
        var template = new Routines.TemplateDoc("template", "u", "template", ["Morning"], [new Routines.TemplateItem("q", "Answer my Question of the Day", "Morning", "qotd", false, null)], "t");
        var day = Routines.BuildDay("u", new DateOnly(2026, 10, 19), template);
        Assert.Equal("qotd", day.items.Single().kind);
        Assert.True(Routines.HasAutoItems(day));
    }
}
