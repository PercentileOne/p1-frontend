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

    [Fact]
    public void A_read_aloud_passage_keeps_its_length_and_counts_with_one_tick()
    {
        var passage = string.Join('\n', Enumerable.Repeat("Every good and great thing will come true today.", 20));
        Assert.True(passage.Length > Routines.MaxText);
        var (_, items, error) = Routines.Clean(["First"], [new("", passage, "First", "read", true, null)]);
        Assert.Null(error);
        Assert.Equal("read", items[0].kind);
        Assert.Equal(passage, items[0].text);                       // not cut to one-line length
        Assert.Equal(Routines.MaxText, Routines.TextLimit("check"));
        Assert.Equal(Routines.MaxReadText, Routines.TextLimit("read"));

        var day = new Routines.DayDoc("day:2026-10-13", "u1", "day", "2026-10-13", ["First"],
            [new("r", passage, "First", "read", true, null, "template")], new() { ["r"] = true }, new(), "");
        var s = Routines.Summary(day);
        Assert.Equal(1, s.essentialsTotal);
        Assert.Equal(1, s.essentialsDone);
    }

    [Fact]
    public void A_very_long_passage_is_cut_at_the_read_limit()
    {
        var (_, items, _) = Routines.Clean(["First"], [new("", new string('a', 5000), "First", "read", false, null)]);
        Assert.Equal(Routines.MaxReadText, items[0].text.Length);
    }

    private static Routines.TemplateItem Item(string text, string section = "Morning", string kind = "check", bool essential = false, Routines.RuleDto? rule = null)
        => new("x", text, section, kind, essential, rule);

    [Fact]
    public void Importing_in_replace_mode_swaps_the_template_and_ignores_client_ids()
    {
        var current = Routines.DefaultTemplate("u1");
        var req = new Routines.ImportRequest("2026-10-13", "replace", ["First", "Morning"],
            [Item("Declarations", "First", "read", true), Item("Make the bed", "Morning"), Item("Make the bed too", "Morning")]);
        var (t, newIds, error) = Routines.ApplyImport("u1", current, req);
        Assert.Null(error);
        Assert.Equal(["First", "Morning"], t!.sections);
        Assert.Equal(3, t.items.Count);
        Assert.Equal(3, newIds.Count);
        Assert.DoesNotContain(t.items, i => i.id == "x");            // the client's id was never trusted
        Assert.All(t.items, i => Assert.Contains(i.id, newIds));
    }

    [Fact]
    public void Importing_in_add_mode_keeps_what_is_there()
    {
        var current = Routines.DefaultTemplate("u1");
        var req = new Routines.ImportRequest("2026-10-13", "add", ["Evening"], [Item("Check calendar", "Evening")]);
        var (t, _, error) = Routines.ApplyImport("u1", current, req);
        Assert.Null(error);
        Assert.Equal(current.items.Count + 1, t!.items.Count);
        Assert.Contains("Evening", t.sections);
        Assert.Contains("Morning", t.sections);
    }

    [Fact]
    public void Importing_nothing_or_too_much_is_refused_with_a_reason()
    {
        var current = Routines.DefaultTemplate("u1");
        var (t1, _, e1) = Routines.ApplyImport("u1", current, new Routines.ImportRequest("2026-10-13", "replace", ["A"], []));
        Assert.Null(t1); Assert.NotNull(e1);
        var many = Enumerable.Range(0, Routines.MaxItems + 1).Select(n => Item("item " + n)).ToList();
        var (t2, _, e2) = Routines.ApplyImport("u1", current, new Routines.ImportRequest("2026-10-13", "replace", ["Morning"], many));
        Assert.Null(t2); Assert.NotNull(e2);
    }

    [Fact]
    public void Replacing_a_day_keeps_what_was_already_ticked_and_typed()
    {
        var current = Routines.DefaultTemplate("u1");
        var today = Routines.BuildDay("u1", Tuesday, current);
        var ticked = today.items[0].id;
        var typed = today.items.First(i => i.kind == "text").id;
        today = today with { @checked = new() { [ticked] = true }, values = new() { [typed] = "grateful" } };

        var req = new Routines.ImportRequest("2026-10-13", "replace", ["Morning"], [Item("Pray"), Item("Stretch")]);
        var (t, newIds, _) = Routines.ApplyImport("u1", current, req);
        var day = Routines.ApplyImportToDay(today, "u1", t!, newIds, Tuesday, replace: true);

        Assert.Contains(day.items, i => i.id == ticked);              // morning's tick survives
        Assert.Contains(day.items, i => i.id == typed);
        Assert.True(day.@checked[ticked]);
        Assert.Equal("grateful", day.values[typed]);
        Assert.Contains(day.items, i => i.text == "Pray");
        Assert.Equal(2 + 2, day.items.Count);                         // the two kept + the two imported
        Assert.DoesNotContain(day.items, i => i.text == "Read something");   // untouched old items are gone
    }

    [Fact]
    public void Imported_rule_items_only_appear_on_the_days_they_cover()
    {
        var current = Routines.DefaultTemplate("u1");
        var req = new Routines.ImportRequest("2026-10-13", "replace", ["Plan"],
            [Item("Plan the week", "Plan", "check", false, new Routines.RuleDto([0], null, "Sunday")), Item("Pray", "Plan")]);
        var (t, newIds, _) = Routines.ApplyImport("u1", current, req);
        var tuesday = Routines.ApplyImportToDay(null, "u1", t!, newIds, Tuesday, true);
        var sunday = Routines.ApplyImportToDay(null, "u1", t!, newIds, Sunday, true);
        Assert.Single(tuesday.items);
        Assert.Equal(2, sunday.items.Count);
    }
}
