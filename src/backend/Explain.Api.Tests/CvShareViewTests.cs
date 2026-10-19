using Explain.Api.Features.CvAnalysis;
using Cv = Explain.Api.Features.CvAnalysis.Endpoint;

namespace Explain.Api.Tests;

// Sharing a CV analysis publicly (2026-10-19): a candidate's or anonymous visitor's share shows only the positives, and nothing internal is ever sent to someone with the link.
public class CvShareViewTests
{
    private static AnalysisResult Analysis() => new(
        "Sam Jones",
        [new SkillLevel("C# and .NET", 9, "15 years"), new SkillLevel("Azure", 6, null)],
        ["Software Architect"],
        ["You bring deep commercial experience."],
        ["Little recent cloud work."],
        ["Dates overlap in 2014."],
        "Your strengths are deep. Your weakness is cloud.");

    private static CvAnalysisHistoryRecord Record(string portal, SavedHotTopics? hot = null) => new(
        "rec-1", "owner-secret-id", "Sam Jones", "2026-10-19T09:00:00Z", Analysis(),
        [new SavedRoleMatch("Software Architect", "c1", "Software Architect", 65000, 140000)],
        portal, true, "tok123", hot);

    [Theory]
    [InlineData("candidate")]
    [InlineData("public")]
    public void A_candidates_or_anonymous_share_shows_only_the_positives(string portal)
    {
        var view = Cv.ToPublicView(Record(portal));
        Assert.True(view.positivesOnly);
        Assert.Empty(view.analysis.Weaknesses);
        Assert.Empty(view.analysis.Inconsistencies);
        Assert.Empty(view.analysis.Strengths);
        Assert.Equal("", view.analysis.NarrativeScript);   // the spoken walkthrough is built from the weaknesses too
        Assert.Equal(2, view.analysis.Skills.Count);       // what stays
        Assert.Single(view.roleMatches);
    }

    [Fact]
    public void A_recruiters_share_keeps_everything_because_it_is_a_hiring_assessment_for_colleagues()
    {
        var view = Cv.ToPublicView(Record("recruiter"));
        Assert.False(view.positivesOnly);
        Assert.Single(view.analysis.Weaknesses);
        Assert.Single(view.analysis.Inconsistencies);
        Assert.NotEmpty(view.analysis.NarrativeScript);
    }

    [Fact]
    public void The_public_view_never_carries_an_id_an_owner_or_the_token()
    {
        var json = System.Text.Json.JsonSerializer.Serialize(Cv.ToPublicView(Record("candidate")));
        Assert.DoesNotContain("owner-secret-id", json);
        Assert.DoesNotContain("rec-1", json);
        Assert.DoesNotContain("tok123", json);
        Assert.DoesNotContain("Little recent cloud work", json);
        Assert.DoesNotContain("Dates overlap", json);
        Assert.DoesNotContain("You bring deep commercial", json);
        Assert.DoesNotContain("Your weakness is cloud", json);
    }

    [Fact]
    public void The_whats_hot_snapshot_is_passed_through_to_the_public_view()
    {
        var hot = new SavedHotTopics("Software Architect", [new HotTopicItem("Event-Driven Architecture", "Asked about in interviews.")]);
        var view = Cv.ToPublicView(Record("public", hot));
        Assert.Equal("Software Architect", view.hotTopics!.role);
        Assert.Single(view.hotTopics.topics);
    }

    [Fact]
    public void Positives_only_applies_to_candidate_and_public_but_not_recruiter_or_unknown()
    {
        Assert.True(Cv.PositivesOnly("candidate"));
        Assert.True(Cv.PositivesOnly("public"));
        Assert.False(Cv.PositivesOnly("recruiter"));
        Assert.False(Cv.PositivesOnly(null));
    }

    [Fact]
    public void The_hot_topics_snapshot_is_cleaned_trimmed_and_capped()
    {
        var topics = Enumerable.Range(1, 12).Select(i => new HotTopicItem($"  Topic {i}  ", new string('x', 500))).ToList();
        topics.Insert(0, new HotTopicItem("   ", "a blank name is dropped"));
        var clean = Cv.CleanHotTopics(new SavedHotTopics("  Architect  ", topics))!;
        Assert.Equal("Architect", clean.role);
        Assert.Equal(Cv.MaxHotTopics, clean.topics.Count);
        Assert.Equal("Topic 1", clean.topics[0].Name);
        Assert.Equal(300, clean.topics[0].Reason.Length);
    }

    [Fact]
    public void No_role_or_no_usable_topics_means_nothing_is_stored()
    {
        Assert.Null(Cv.CleanHotTopics(null));
        Assert.Null(Cv.CleanHotTopics(new SavedHotTopics("  ", [new HotTopicItem("A", "b")])));
        Assert.Null(Cv.CleanHotTopics(new SavedHotTopics("Architect", [new HotTopicItem(" ", "b")])));
        Assert.Null(Cv.CleanHotTopics(new SavedHotTopics("Architect", [])));
    }
}
