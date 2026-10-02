using Explain.Api.Features.CvAnalysis;

namespace Explain.Api.Tests;

public class CvAnalyzerStatsTests
{
    private static readonly DateTime Now = new(2026, 10, 2, 12, 0, 0, DateTimeKind.Utc);

    private static CvUseDoc Use(string day, string visitor, string? country, string? city = null, string source = "marketing", bool signedIn = false) =>
        new(Guid.NewGuid().ToString(), day[..7], day, day + "T10:00:00.0000000+00:00", visitor, signedIn, source, country, city, null);

    [Fact]
    public void Counts_analyses_and_distinct_visitors_inside_the_window_only()
    {
        var rows = new[]
        {
            Use("2026-10-02", "a", "United Kingdom", "Colchester"),
            Use("2026-10-02", "a", "United Kingdom", "Colchester"),   // same person twice
            Use("2026-10-01", "b", "United States", "Chicago"),
            Use("2026-09-01", "c", "France", "Paris"),                // outside a 7-day window
        };
        var s = CvAnalyzerStats.Summarise(rows, 7, Now);
        Assert.Equal(3, s.Analyses);
        Assert.Equal(2, s.Visitors);
        Assert.Equal(7, s.ByDay.Count);
        Assert.Equal(2, s.ByDay.Last().Analyses);
        Assert.Equal(1, s.ByDay.Last().Visitors);
    }

    [Fact]
    public void Groups_by_country_and_town_most_used_first()
    {
        var rows = new[]
        {
            Use("2026-10-02", "a", "United Kingdom", "Colchester"),
            Use("2026-10-02", "b", "United Kingdom", "Leeds"),
            Use("2026-10-02", "c", "United Kingdom", "Leeds"),
            Use("2026-10-02", "d", "India", "Pune"),
        };
        var s = CvAnalyzerStats.Summarise(rows, 7, Now);
        Assert.Equal("United Kingdom", s.ByCountry[0].Country);
        Assert.Equal(3, s.ByCountry[0].Analyses);
        Assert.Equal("Leeds", s.ByTown[0].City);
        Assert.Equal(2, s.ByTown[0].Visitors);
    }

    [Fact]
    public void Missing_country_is_shown_as_Unknown_and_source_split_is_counted()
    {
        var rows = new[]
        {
            Use("2026-10-02", "a", null, source: "marketing"),
            Use("2026-10-02", "b", "", source: "candidate", signedIn: true),
        };
        var s = CvAnalyzerStats.Summarise(rows, 7, Now);
        Assert.Equal("Unknown", s.ByCountry.Single().Country);
        Assert.Equal(1, s.SignedInAnalyses);
        Assert.Equal(1, s.AnonymousAnalyses);
        Assert.Equal(2, s.BySource.Count);
    }

    [Theory]
    [InlineData("https://www.theinterviewchair.com", "marketing")]
    [InlineData("https://candidate.theinterviewchair.com", "candidate")]
    [InlineData("https://recruiter.interviewme.global", "recruiter")]
    [InlineData("https://example.com", "other")]
    [InlineData("", "other")]
    public void Source_comes_from_the_page_that_sent_the_request(string origin, string expected) =>
        Assert.Equal(expected, CvAnalyzerStats.SourceFromOrigin(origin));

    [Fact]
    public void Visitor_hash_is_stable_salted_and_does_not_contain_the_address()
    {
        var h1 = CvAnalyzerStats.VisitorHash("ip:203.0.113.9", "salt-1");
        Assert.Equal(h1, CvAnalyzerStats.VisitorHash("ip:203.0.113.9", "salt-1"));
        Assert.NotEqual(h1, CvAnalyzerStats.VisitorHash("ip:203.0.113.9", "salt-2"));
        Assert.NotEqual(h1, CvAnalyzerStats.VisitorHash("ip:203.0.113.10", "salt-1"));
        Assert.DoesNotContain("203", h1);
    }

    [Theory]
    [InlineData("  Jane@Example.COM ", "jane@example.com")]
    [InlineData("a@b.co", "a@b.co")]
    [InlineData("not-an-email", null)]
    [InlineData("two@@example.com", null)]
    [InlineData("spaces in@example.com", null)]
    [InlineData("a@nodot", null)]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void Email_cleaning_accepts_sensible_addresses_only(string? raw, string? expected) =>
        Assert.Equal(expected, CvAnalyzerStats.CleanEmail(raw));

    [Theory]
    [InlineData("  Francis ", "Francis")]
    [InlineData("<b>Sam</b>", "bSam/b")]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData(null, null)]
    public void Name_cleaning_trims_and_strips_markup(string? raw, string? expected) =>
        Assert.Equal(expected, CvAnalyzerStats.CleanName(raw));

    [Fact]
    public void Long_names_are_clipped()
    {
        var n = CvAnalyzerStats.CleanName(new string('x', 200));
        Assert.Equal(60, n!.Length);
    }

    [Fact]
    public void Same_email_always_gets_the_same_id_so_signing_up_twice_is_one_row() =>
        Assert.Equal(CvAnalyzerStats.OptInId("jane@example.com"), CvAnalyzerStats.OptInId("jane@example.com"));
}
