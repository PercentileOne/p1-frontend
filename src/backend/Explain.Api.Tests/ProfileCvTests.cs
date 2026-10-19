using Explain.Api.Features.CvAnalysis;
using P = Explain.Api.Features.CvAnalysis.ProfileEndpoint;

namespace Explain.Api.Tests;

// The CV Analysis tab on a profile (2026-10-19): off until switched on, who may see it, and which saved analysis it shows.
public class ProfileCvTests
{
    private static CvAnalysisHistoryRecord Rec(string id, string created, string portal = "candidate") => new(
        id, "owner", "Sam", created, new AnalysisResult("Sam", [], [], [], [], [], ""), [], portal);

    [Theory]
    [InlineData("me", "me", false, true)]       // your own, always, so you can preview it
    [InlineData("me", "me", true, true)]
    [InlineData("other", "me", true, true)]     // anyone, once it is switched on
    [InlineData("other", "me", false, false)]   // nobody else while it is off (the default)
    public void Other_people_see_it_only_while_it_is_switched_on(string viewer, string owner, bool enabled, bool expected) =>
        Assert.Equal(expected, P.CanSee(viewer, owner, enabled));

    [Fact]
    public void The_named_analysis_is_shown_if_it_is_among_the_persons_own()
    {
        var chosen = P.ChooseRecord([Rec("old", "2026-10-01T00:00:00Z"), Rec("new", "2026-10-19T00:00:00Z")], "old");
        Assert.Equal("old", chosen!.id);
    }

    [Fact]
    public void Otherwise_the_newest_analysis_is_shown()
    {
        var records = new[] { Rec("a", "2026-10-01T00:00:00Z"), Rec("c", "2026-10-19T09:00:00Z"), Rec("b", "2026-10-10T00:00:00Z") };
        Assert.Equal("c", P.ChooseRecord(records, null)!.id);
        Assert.Equal("c", P.ChooseRecord(records, "no-such-id")!.id);   // a deleted or foreign id falls back to the newest
    }

    [Fact]
    public void Only_candidate_portal_analyses_can_be_shown_never_a_recruiters_assessment()
    {
        Assert.Null(P.ChooseRecord([Rec("r", "2026-10-19T00:00:00Z", "recruiter")], null));
        Assert.Null(P.ChooseRecord([Rec("p", "2026-10-19T00:00:00Z", "public")], "p"));
        Assert.Equal("c", P.ChooseRecord([Rec("r", "2026-10-20T00:00:00Z", "recruiter"), Rec("c", "2026-10-19T00:00:00Z")], null)!.id);
    }

    [Fact]
    public void With_nothing_saved_there_is_nothing_to_show() => Assert.Null(P.ChooseRecord([], null));

    [Fact]
    public void What_others_see_has_no_weaknesses()
    {
        var withWeaknesses = Rec("a", "2026-10-19T00:00:00Z") with
        {
            analysis = new AnalysisResult("Sam", [new SkillLevel("C#", 9, null)], [], ["Strong."], ["Little cloud."], ["Dates overlap."], "script")
        };
        var view = Explain.Api.Features.CvAnalysis.Endpoint.ToPublicView(P.ChooseRecord([withWeaknesses], null)!);
        Assert.Empty(view.analysis.Weaknesses);
        Assert.Empty(view.analysis.Inconsistencies);
        Assert.Equal("", view.analysis.NarrativeScript);
    }
}
