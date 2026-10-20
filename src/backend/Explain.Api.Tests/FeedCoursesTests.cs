using Courses = Explain.Api.Features.FeedCourses.Endpoint;

namespace Explain.Api.Tests;

// The feed's courses strip (2026-10-20): which addresses are allowed, how a page is read, and how a moved course is caught.
public class FeedCoursesTests
{
    [Theory]
    [InlineData("https://www.coursera.org/learn/learning-how-to-learn", "https://www.coursera.org/learn/learning-how-to-learn")]
    [InlineData("  https://cs50.harvard.edu/x/#week0 ", "https://cs50.harvard.edu/x/")]                                        // fragment dropped
    [InlineData("https://www.coursera.org/learn/negotiation?utm_source=a&utm_medium=b&fbclid=1&page=2", "https://www.coursera.org/learn/negotiation?page=2")]
    [InlineData("https://learn.microsoft.com/en-us/training/paths/x/", "https://learn.microsoft.com/en-us/training/paths/x/")]
    [InlineData("https://sub.edx.org/learn", "https://sub.edx.org/learn")]                                                  // a subdomain of an allowed provider
    public void An_https_address_on_an_official_provider_is_cleaned_and_kept(string typed, string expected) => Assert.Equal(expected, Courses.NormaliseUrl(typed));

    [Theory]
    [InlineData("http://www.coursera.org/learn/x")]                    // not https
    [InlineData("https://evil.example/learn/x")]
    [InlineData("https://coursera.org.evil.example/learn/x")]          // look-alike host
    [InlineData("https://notcoursera.org/learn/x")]                    // ends with the name but is not a subdomain
    [InlineData("https://user:pw@www.coursera.org/learn/x")]
    [InlineData("https://www.coursera.org:8443/learn/x")]
    [InlineData("not a url")]
    [InlineData("")]
    [InlineData(null)]
    public void Anything_else_is_refused(string? typed) => Assert.Null(Courses.NormaliseUrl(typed));

    [Fact]
    public void A_course_id_is_stable_for_one_address_and_different_for_another()
    {
        var a = Courses.CourseId("https://www.coursera.org/learn/negotiation");
        Assert.True(Courses.IsCourseId(a));
        Assert.Equal(a, Courses.CourseId("https://WWW.coursera.org/learn/negotiation"));
        Assert.NotEqual(a, Courses.CourseId("https://www.coursera.org/learn/public-speaking"));
        Assert.False(Courses.IsCourseId("zzzzzzzzzzzzzzzzzzzz"));
        Assert.False(Courses.IsCourseId(null));
    }

    [Theory]
    [InlineData("free", "free")]
    [InlineData(" Free To Audit ", "free-to-audit")]
    [InlineData("PAID", "paid")]
    [InlineData("cheap", null)]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void Cost_is_one_of_three_words_or_nothing(string? typed, string? expected) => Assert.Equal(expected, Courses.CleanCost(typed));

    [Fact]
    public void A_moved_course_is_not_the_same_page_but_a_slash_or_www_or_query_is()
    {
        var asked = new Uri("https://learndigital.example/course/digital-marketing");
        Assert.False(Courses.SamePage(asked, new Uri("https://grow.google/intl/uk/")));
        Assert.True(Courses.SamePage(new Uri("https://www.coursera.org/learn/x"), new Uri("https://coursera.org/learn/x/")));
        Assert.True(Courses.SamePage(new Uri("https://www.coursera.org/learn/x"), new Uri("https://www.coursera.org/Learn/X?lang=en")));
        Assert.False(Courses.SamePage(new Uri("https://www.coursera.org/learn/x"), new Uri("https://www.coursera.org/browse")));
    }

    [Fact]
    public void The_provider_name_is_ours_not_the_page_s()
    {
        Assert.Equal("Coursera", Courses.ProviderName("https://www.coursera.org/learn/x", "Some Odd Name"));
        Assert.Equal("Harvard CS50", Courses.ProviderName("https://cs50.harvard.edu/x/", null));
        Assert.Equal("Google Skills", Courses.ProviderName("https://www.cloudskillsboost.google/", null));
    }

    private static readonly Uri Page = new("https://www.coursera.org/learn/x");

    [Fact]
    public void A_page_gives_its_open_graph_title_picture_and_site_name_decoded_and_tidy()
    {
        var html = """
            <html><head><title>Fallback title</title>
            <meta property="og:title" content="  Learning &amp; How   to Learn ">
            <meta content="/img/cover.png" property="og:image">
            <meta property="og:site_name" content="Coursera"></head></html>
            """;
        var r = Courses.ReadPage(html, Page);
        Assert.Null(r.Error);
        Assert.Equal("Learning & How to Learn", r.Title);
        Assert.Equal("https://www.coursera.org/img/cover.png", r.ImageUrl);    // made absolute
        Assert.Equal("Coursera", r.SiteName);
    }

    [Fact]
    public void A_page_with_no_open_graph_title_falls_back_to_its_title_tag()
    {
        var r = Courses.ReadPage("<html><head><title>CS50x 2026</title></head></html>", Page);
        Assert.Equal("CS50x 2026", r.Title);
        Assert.Null(r.ImageUrl);
    }

    [Fact]
    public void A_page_with_no_title_is_refused()
    {
        Assert.Contains("no title", Courses.ReadPage("<html><head></head><body>hi</body></html>", Page).Error);
        Assert.Contains("no title", Courses.ReadPage("<title>   </title>", Page).Error);
    }

    [Fact]
    public void A_picture_that_is_not_https_is_dropped()
    {
        var r = Courses.ReadPage("<title>T</title><meta property=\"og:image\" content=\"http://example.com/a.png\">", Page);
        Assert.Null(r.ImageUrl);
        Assert.Equal("T", r.Title);
    }

    [Theory]
    [InlineData("https://www.udemy.com/course/the-complete-web-development-bootcamp/", true)]
    [InlineData("https://www.skillshare.com/en/classes/x/123", true)]
    [InlineData("https://www.pluralsight.com/courses/x", true)]
    [InlineData("https://www.linkedin.com/learning/interview-tips", true)]
    [InlineData("https://www.coursera.org/learn/x", false)]
    [InlineData("https://www.udacity.com/course/x", false)]                 // readable, so checked like the official providers
    public void Big_paid_platforms_are_accepted_but_marked_as_hand_checked(string url, bool handChecked)
    {
        var clean = Courses.NormaliseUrl(url);
        Assert.NotNull(clean);
        Assert.Equal(handChecked, Courses.IsHandChecked(clean!));
    }

    [Theory]
    [InlineData("https://www.linkedin.com/in/someone")]                     // a profile is not a course
    [InlineData("https://www.linkedin.com/posts/abc")]
    [InlineData("https://www.linkedin.com/company/x/learning/")]
    [InlineData("https://udemy.com.evil.example/course/x")]
    public void Only_courses_on_those_platforms_are_accepted(string url) => Assert.Null(Courses.NormaliseUrl(url));

    [Fact]
    public void A_hand_checked_course_shows_the_platform_s_name_as_provider()
    {
        Assert.Equal("Udemy", Courses.ProviderName("https://www.udemy.com/course/x/", "Whatever"));
        Assert.Equal("LinkedIn Learning", Courses.ProviderName("https://www.linkedin.com/learning/x", null));
    }
}
