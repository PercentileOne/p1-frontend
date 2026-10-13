using Routines = Explain.Api.Features.Routines.Endpoint;

namespace Explain.Api.Tests;

// My Routines (2026-10-13): which if-then rules cover which date, what a new person starts with, and how progress is counted.
public class RoutinesTests
{
    private static readonly DateOnly Sunday = new(2026, 10, 11);        // a Sunday
    private static readonly DateOnly Tuesday = new(2026, 10, 13);
    private static readonly DateOnly LastOfOctober = new(2026, 10, 31); // a Saturday

    [Fact]
    public void No_rule_means_every_day()
    {
        Assert.True(Routines.Applies(null, Tuesday));
        Assert.True(Routines.Applies(new Routines.RuleDto(null, null, "x"), Tuesday));
    }

    [Fact]
    public void Weekday_rule_covers_only_those_days()
    {
        var sundays = new Routines.RuleDto([0], null, "Sunday");
        Assert.True(Routines.Applies(sundays, Sunday));
        Assert.False(Routines.Applies(sundays, Tuesday));
        var dialysis = new Routines.RuleDto([1, 3, 5], null, "Dialysis day");
        Assert.True(Routines.Applies(dialysis, Tuesday.AddDays(-1)));   // Monday
        Assert.False(Routines.Applies(dialysis, Tuesday));
    }

    [Fact]
    public void Last_day_of_month_rule_follows_the_calendar()
    {
        var last = new Routines.RuleDto(null, true, "Last day of the month");
        Assert.True(Routines.Applies(last, LastOfOctober));
        Assert.False(Routines.Applies(last, LastOfOctober.AddDays(-1)));
        Assert.True(Routines.Applies(last, new DateOnly(2028, 2, 29)));  // leap year
    }

    [Fact]
    public void A_rule_with_both_conditions_applies_when_either_matches()
    {
        var both = new Routines.RuleDto([0], true, "Plan");
        Assert.True(Routines.Applies(both, Sunday));
        Assert.True(Routines.Applies(both, LastOfOctober));
        Assert.False(Routines.Applies(both, Tuesday));
    }

    [Fact]
    public void Rules_are_cleaned()
    {
        Assert.Null(Routines.CleanRule(new Routines.RuleDto([], null, "nothing")));
        var r = Routines.CleanRule(new Routines.RuleDto([6, 0, 0, 9, -1], false, "  Weekend  "))!;
        Assert.Equal([0, 6], r.weekdays);
        Assert.Null(r.lastDayOfMonth);
        Assert.Equal("Weekend", r.label);
    }

    [Fact]
    public void A_new_person_starts_with_a_small_sensible_template_and_no_health_items()
    {
        var t = Routines.DefaultTemplate("u1");
        Assert.InRange(t.items.Count, 6, 12);
        Assert.Contains(t.items, i => i.essential);
        Assert.Contains(t.items, i => i.kind == "text");
        Assert.DoesNotContain(t.items, i => i.text.Contains("blood", StringComparison.OrdinalIgnoreCase) || i.text.Contains("medic", StringComparison.OrdinalIgnoreCase));
        Assert.All(t.items, i => Assert.Contains(i.section, t.sections));
        Assert.Equal(t.items.Count, t.items.Select(i => i.id).Distinct().Count());
    }

    [Fact]
    public void Template_cleaning_drops_blanks_fixes_sections_and_gives_ids()
    {
        var (sections, items, error) = Routines.Clean(["Morning", " ", "Morning", "Evening"],
        [
            new("", "  Stretch  ", "Nowhere", "check", true, null),
            new("a", "", "Morning", "check", false, null),
            new("b", "Read", "Evening", "weird", false, new Routines.RuleDto([1], null, null)),
        ]);
        Assert.Null(error);
        Assert.Equal(["Morning", "Evening"], sections);
        Assert.Equal(2, items.Count);
        Assert.Equal("Morning", items[0].section);        // unknown section falls back to the first
        Assert.False(string.IsNullOrEmpty(items[0].id));
        Assert.Equal("check", items[1].kind);              // unknown kind becomes a tick box
    }

    [Fact]
    public void Template_needs_a_section()
    {
        var (_, _, error) = Routines.Clean([], []);
        Assert.NotNull(error);
    }

    [Fact]
    public void Progress_counts_ticks_and_filled_numbers_but_not_notes()
    {
        var items = new List<Routines.DayItem>
        {
            new("a", "Quiet", "Morning", "check", true, null, "template"),
            new("b", "Bed", "Morning", "check", true, null, "template"),
            new("c", "Reading", "Morning", "number", false, null, "template"),
            new("d", "Gratitude", "Check in", "text", false, null, "template"),
        };
        var day = new Routines.DayDoc("day:2026-10-13", "u1", "day", "2026-10-13", ["Morning", "Check in"], items,
            new() { ["a"] = true }, new() { ["c"] = "12", ["d"] = "thanks" }, "");
        var s = Routines.Summary(day);
        Assert.Equal(1, s.essentialsDone);
        Assert.Equal(2, s.essentialsTotal);
        Assert.Equal(2, s.done);     // quiet + the number
        Assert.Equal(3, s.total);    // the note is not counted
    }

    [Fact]
    public void A_day_is_built_from_the_template_and_only_includes_rules_that_cover_it()
    {
        var template = Routines.DefaultTemplate("u1");
        var sunday = Routines.BuildDay("u1", Sunday, template);
        var tuesday = Routines.BuildDay("u1", Tuesday, template);
        Assert.Equal("day:2026-10-11", sunday.id);
        Assert.Equal(tuesday.items.Count + 1, sunday.items.Count);   // the Sunday-only item
        Assert.Contains(sunday.items, i => i.ruleLabel == "Sunday");
        Assert.DoesNotContain(tuesday.items, i => i.ruleLabel == "Sunday");
        Assert.Empty(tuesday.@checked);
    }

    [Theory]
    [InlineData("2026-10-13", true)]
    [InlineData("2026-13-01", false)]
    [InlineData("13/10/2026", false)]
    [InlineData("", false)]
    public void Dates_must_be_year_month_day(string s, bool ok) => Assert.Equal(ok, Routines.TryDate(s, out _));
}
