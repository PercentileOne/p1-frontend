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
    public void A_new_person_has_an_evening_section_with_an_evening_gratitude_note()
    {
        var t = Routines.DefaultTemplate("u1");
        Assert.Contains("Evening", t.sections);
        Assert.Contains(t.items, i => i.section == "Evening" && i.kind == "text" && i.text.Contains("gratitude", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(t.items, i => i.section == "Evening" && i.kind == "check");
    }

    [Fact]
    public void Adding_to_a_section_the_day_does_not_have_creates_it()
    {
        var existing = new List<string> { "Morning", "Check in" };
        Assert.Equal(("Morning", false, (string?)null), Routines.ResolveSection(existing, "Morning"));
        Assert.Equal(("Check in", false, (string?)null), Routines.ResolveSection(existing, "  check IN "));   // same section, whatever the case
        Assert.Equal(("Evening", true, (string?)null), Routines.ResolveSection(existing, " Evening "));
        Assert.Equal(("Morning", false, (string?)null), Routines.ResolveSection(existing, null));            // no name: the first section
        Assert.Equal(60, Routines.ResolveSection(existing, new string('x', 90)).section.Length);
    }

    [Fact]
    public void A_new_section_is_refused_once_the_page_is_full()
    {
        var full = Enumerable.Range(1, Routines.MaxSections).Select(n => "S" + n).ToList();
        var (_, isNew, error) = Routines.ResolveSection(full, "One more");
        Assert.False(isNew);
        Assert.NotNull(error);
        Assert.Null(Routines.ResolveSection(full, "S3").error);   // an existing one is still fine
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

    private static Routines.SectionsRequest Cats(string[][] keep, params (string was, string? moveTo)[] removed) =>
        new(keep.Select(k => new Routines.SectionEdit(k[0] == "" ? null : k[0], k[1])).ToList(),
            removed.Select(r => new Routines.SectionRemoval(r.was, r.moveTo)).ToList());

    [Fact]
    public void Categories_can_be_renamed_and_reordered()
    {
        var current = new[] { "Morning", "Plan for today", "Evening" };
        var (names, remap, error) = Routines.PlanSectionEdits(current, new HashSet<string>(current),
            Cats([["Evening", "Evening"], ["Morning", "My morning"], ["Plan for today", "Plan for today"]]));
        Assert.Null(error);
        Assert.Equal(["Evening", "My morning", "Plan for today"], names);
        Assert.Equal("My morning", remap["Morning"]);
        Assert.False(remap.ContainsKey("Evening"));
    }

    [Fact]
    public void A_new_category_has_no_old_name()
    {
        var (names, remap, error) = Routines.PlanSectionEdits(["Morning"], new HashSet<string> { "Morning" },
            Cats([["Morning", "Morning"], ["", "Gym"]]));
        Assert.Null(error);
        Assert.Equal(["Morning", "Gym"], names);
        Assert.Empty(remap);
    }

    [Fact]
    public void Deleting_a_category_with_items_needs_somewhere_to_put_them()
    {
        var current = new[] { "Morning", "Evening" };
        var items = new HashSet<string>(current);
        var (_, _, noTarget) = Routines.PlanSectionEdits(current, items, Cats([["Morning", "Morning"]], ("Evening", null)));
        Assert.NotNull(noTarget);

        var (names, remap, error) = Routines.PlanSectionEdits(current, items, Cats([["Morning", "Morning"]], ("Evening", "Morning")));
        Assert.Null(error);
        Assert.Equal(["Morning"], names);
        Assert.Equal("Morning", remap["Evening"]);      // its items go to Morning

        var (_, _, emptyOk) = Routines.PlanSectionEdits(current, new HashSet<string> { "Morning" }, Cats([["Morning", "Morning"]], ("Evening", null)));
        Assert.Null(emptyOk);                           // an empty category can simply go
    }

    [Fact]
    public void Category_names_are_checked()
    {
        var cur = new[] { "A", "B" };
        var none = new HashSet<string>();
        Assert.NotNull(Routines.PlanSectionEdits(cur, none, Cats([["A", "  "], ["B", "B"]])).error);                      // blank
        Assert.NotNull(Routines.PlanSectionEdits(cur, none, Cats([["A", "Same"], ["B", "same"]])).error);                // duplicate, any case
        Assert.NotNull(Routines.PlanSectionEdits(cur, none, Cats([])).error);                                           // none left
        var many = Enumerable.Range(0, Routines.MaxSections + 1).Select(n => new[] { "", "C" + n }).ToArray();
        Assert.NotNull(Routines.PlanSectionEdits(cur, none, Cats(many)).error);                                         // too many
    }

    [Theory]
    [InlineData("essential", null, "essential")]
    [InlineData("LOW", null, "low")]
    [InlineData("standard", true, "standard")]       // an explicit priority wins over the old flag
    [InlineData(null, true, "essential")]            // an old document with only the essential flag
    [InlineData(null, false, "standard")]
    [InlineData("nonsense", null, "standard")]
    public void Priority_is_essential_standard_or_low(string? priority, bool? essentialFlag, string expected)
        => Assert.Equal(expected, Routines.NormalisePriority(priority, essentialFlag));

    [Fact]
    public void A_priority_travels_with_the_item_and_keeps_the_essential_flag_in_step()
    {
        var (_, items, error) = Routines.Clean(["Morning"],
        [
            new("a", "Quiet", "Morning", "check", false, null, "essential"),
            new("b", "Read", "Morning", "check", true, null, "low"),     // the explicit priority wins over a stale flag
            new("c", "Walk", "Morning", "check", false, null),
        ]);
        Assert.Null(error);
        Assert.Equal(["essential", "low", "standard"], items.Select(i => i.priority));
        Assert.Equal([true, false, false], items.Select(i => i.essential));

        var day = Routines.BuildDay("u1", new DateOnly(2026, 10, 15), new Routines.TemplateDoc("template", "u1", "template", ["Morning"], items, ""));
        Assert.Equal(["essential", "low", "standard"], day.items.Select(i => i.priority));
    }

    [Fact]
    public void The_default_routine_has_stable_ids_so_edits_can_find_its_items_again()
    {
        var a = Routines.DefaultTemplate("u1");
        var b = Routines.DefaultTemplate("u1");
        Assert.Equal(a.items.Select(i => i.id), b.items.Select(i => i.id));
        Assert.Equal(a.items.Count, a.items.Select(i => i.id).Distinct().Count());
    }

    private static Routines.DayItem Day(string id, string section, string text = "") => new(id, text == "" ? id : text, section, "check", false, null, "template");

    [Fact]
    public void Reordering_a_section_moves_only_that_sections_items_and_leaves_the_rest_in_place()
    {
        var items = new List<Routines.DayItem> { Day("m1", "Morning"), Day("e1", "Evening"), Day("m2", "Morning"), Day("m3", "Morning"), Day("e2", "Evening") };
        var r = Routines.ReorderSection(items, i => i.section, i => i.id, "Morning", ["m3", "m1", "m2"]);
        Assert.Equal(["m3", "e1", "m1", "m2", "e2"], r.Select(i => i.id));        // the evening items did not move
    }

    [Fact]
    public void Reordering_ignores_unknown_ids_and_keeps_forgotten_items_at_the_end()
    {
        var items = new List<Routines.DayItem> { Day("a", "S"), Day("b", "S"), Day("c", "S") };
        var r = Routines.ReorderSection(items, i => i.section, i => i.id, "S", ["c", "zzz", "c"]);
        Assert.Equal(["c", "a", "b"], r.Select(i => i.id));
    }

    [Fact]
    public void Reordering_the_template_keeps_hidden_items_where_they_were()
    {
        // The template has a Sunday-only item between two daily ones; today (not a Sunday) shows only the daily ones.
        var t = new List<Routines.TemplateItem>
        {
            new("a", "Quiet", "Morning", "check", false, null),
            new("s", "Plan the week", "Morning", "check", false, new Routines.RuleDto([0], null, "Sunday")),
            new("b", "Bed", "Morning", "check", false, null),
        };
        var today = new List<Routines.DayItem> { Day("b", "Morning", "Bed"), Day("a", "Morning", "Quiet") };   // the person moved Bed above Quiet
        var r = Routines.ReorderTemplate(t, today);
        Assert.Equal(["b", "s", "a"], r.Select(i => i.id));                        // Plan the week keeps its middle slot
    }

    [Fact]
    public void Reordering_the_template_finds_items_by_wording_when_ids_do_not_match()
    {
        var t = new List<Routines.TemplateItem>
        {
            new("t1", "Quiet", "Morning", "check", false, null),
            new("t2", "Bed", "Morning", "check", false, null),
        };
        var today = new List<Routines.DayItem> { Day("old-bed", "Morning", "bed"), Day("old-quiet", "Morning", "QUIET") };   // ids from before ids were stable
        var r = Routines.ReorderTemplate(t, today);
        Assert.Equal(["t2", "t1"], r.Select(i => i.id));
    }

    [Fact]
    public void The_tree_lists_each_month_that_has_days_newest_first_across_years()
    {
        var months = Routines.MonthsWithDays(["2026-10-13", "2026-10-14", "2026-12-31", "2027-01-02", "not a date", null, "2026-11-05"]);
        Assert.Equal(["2027-01", "2026-12", "2026-11", "2026-10"], months);
        Assert.Empty(Routines.MonthsWithDays([]));
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
