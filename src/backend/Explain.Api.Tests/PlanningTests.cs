using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Planning = Explain.Api.Features.Planning.Endpoint;

namespace Explain.Api.Tests;

// Goals, reviews, favourite days, day notes and search (2026-10-18): which dates a review period covers, how goal progress is counted, and how search words match.
public class PlanningTests
{
    [Fact]
    public void A_week_runs_Monday_to_Sunday()
    {
        var (start, end) = Planning.Period("weekly", new DateOnly(2026, 10, 18));   // a Sunday
        Assert.Equal(new DateOnly(2026, 10, 12), start);
        Assert.Equal(new DateOnly(2026, 10, 18), end);
        Assert.Equal(new DateOnly(2026, 10, 12), Planning.Period("weekly", new DateOnly(2026, 10, 12)).start);   // the Monday itself
    }

    [Fact]
    public void A_week_can_cross_the_new_year()
    {
        var (start, end) = Planning.Period("weekly", new DateOnly(2026, 12, 31));
        Assert.Equal(new DateOnly(2026, 12, 28), start);
        Assert.Equal(new DateOnly(2027, 1, 3), end);
    }

    [Fact]
    public void A_month_and_a_year_cover_the_calendar()
    {
        Assert.Equal((new DateOnly(2028, 2, 1), new DateOnly(2028, 2, 29)), Planning.Period("monthly", new DateOnly(2028, 2, 10)));
        Assert.Equal((new DateOnly(2026, 1, 1), new DateOnly(2026, 12, 31)), Planning.Period("yearly", new DateOnly(2026, 10, 18)));
    }

    private static Planning.GoalDoc Goal(string status = "active", string track = "milestones", List<Planning.MilestoneDto>? ms = null, double? target = null, double? current = null) =>
        new("goal:x", "u", "goal", "t", "", "", "", "", status, track, ms ?? [], target, current, null, [], "", "", null);

    [Fact]
    public void Checklist_progress_is_the_share_of_steps_done()
    {
        var g = Goal(ms: [new("a", "one", true), new("b", "two", false), new("c", "three", false), new("d", "four", true)]);
        Assert.Equal(50, Planning.Progress(g));
        Assert.Equal(0, Planning.Progress(Goal()));   // no steps yet
    }

    [Fact]
    public void Number_progress_is_capped_at_100_and_needs_a_target()
    {
        Assert.Equal(50, Planning.Progress(Goal(track: "number", target: 24, current: 12)));
        Assert.Equal(100, Planning.Progress(Goal(track: "number", target: 10, current: 15)));
        Assert.Equal(0, Planning.Progress(Goal(track: "number", target: null, current: 5)));
    }

    [Fact]
    public void A_completed_goal_is_always_100()
    {
        Assert.Equal(100, Planning.Progress(Goal(status: "completed", ms: [new("a", "one", false)])));
    }

    [Fact]
    public void Search_words_are_lower_cased_distinct_and_at_most_six()
    {
        Assert.Equal(["marketing", "study"], Planning.Terms("  Marketing   STUDY marketing "));
        Assert.Equal(6, Planning.Terms("a bb cc dd ee ff gg hh").Count);
    }

    [Fact]
    public void Too_little_typed_finds_nothing()
    {
        Assert.Empty(Planning.Terms(null));
        Assert.Empty(Planning.Terms("   "));
        Assert.Empty(Planning.Terms("a"));
        Assert.NotEmpty(Planning.Terms("ab"));
    }

    [Fact]
    public void Every_word_must_appear_in_any_case()
    {
        var terms = Planning.Terms("marketing study");
        Assert.True(Planning.Matches("I must STUDY more on Marketing.", terms));
        Assert.False(Planning.Matches("I must study more.", terms));
        Assert.False(Planning.Matches("", terms));
        Assert.False(Planning.Matches("anything", []));
    }

    [Fact]
    public void A_snippet_is_one_line_around_the_first_match_with_ellipses()
    {
        var text = string.Concat(Enumerable.Repeat("word ", 40)) + "marketing is the thing\nto study" + string.Concat(Enumerable.Repeat(" more", 60));
        var snip = Planning.Snip(text, Planning.Terms("marketing"));
        Assert.Contains("marketing", snip);
        Assert.DoesNotContain("\n", snip);
        Assert.StartsWith("…", snip);
        Assert.EndsWith("…", snip);
        Assert.True(snip.Length <= 175);
        Assert.Equal("Short note", Planning.Snip("Short note", Planning.Terms("note")));   // nothing cut, no ellipses
    }

    [Fact]
    public void Planning_routes_build()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddAuthentication();
        builder.Services.AddAuthorization();
        builder.Services.AddSingleton<Explain.Api.Infrastructure.Cosmos.CosmosService>(_ => null!);
        var app = builder.Build();
        Planning.Map(app);
        var patterns = ((IEndpointRouteBuilder)app).DataSources.SelectMany(d => d.Endpoints).OfType<RouteEndpoint>().Select(r => (r.RoutePattern.RawText ?? "").TrimEnd('/')).ToList();   // a group's own route comes out as "/api/goals/"; routing treats the two alike
        foreach (var route in new[] { "/api/goals", "/api/goals/{id}", "/api/goals/{id}/updates", "/api/reviews/period", "/api/reviews/{cadence}/{date}", "/api/next-interviews",
                                       "/api/favourite-days/{date}", "/api/day-notes/{date}", "/api/notes-search" })
            Assert.Contains(route, patterns);
    }
}
