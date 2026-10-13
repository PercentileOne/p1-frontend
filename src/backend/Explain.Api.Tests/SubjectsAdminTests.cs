using Xunit;
using Subjects = Explain.Api.Features.SubjectsAdmin.Endpoint;

namespace Explain.Api.Tests;

public class SubjectsAdminTests
{
    [Theory]
    [InlineData("Marketing Manager", "Sales & Marketing")]
    [InlineData("Software Engineer", "IT & Software")]
    [InlineData("C# Software Developer", "IT & Software")]
    [InlineData("Head of Global Equities", "Finance")]
    [InlineData("Children's Mental Health Nurse", "Healthcare")]
    [InlineData("English Teacher", "Education")]
    [InlineData("Project Manager", "Management")]
    [InlineData("Electrical Engineer", "Engineering & Trades")]
    [InlineData("Beekeeper", "Other")]
    public void A_subject_gets_a_rough_category_from_its_words(string subject, string expected) =>
        Assert.Equal(expected, Subjects.Categorise(Subjects.Normalise(subject)));

    [Fact]
    public void The_same_subject_typed_differently_is_counted_once_and_demos_and_full_interviews_are_added()
    {
        var reply = Subjects.Build(
            [new("Marketing manager", 40, "2026-10-01T10:00:00Z"), new(" marketing  Manager. ", 60, "2026-10-02T10:00:00Z"), new("Teacher", 30, "2026-10-03T10:00:00Z")],
            [new("Marketing Manager", 3, DateTimeOffset.Parse("2026-10-05T10:00:00Z")), new("", 5, null)],
            30);

        var mm = Assert.Single(reply.subjects, s => s.category == "Sales & Marketing");
        Assert.Equal(2, mm.demos);
        Assert.Equal(50, mm.avgDemoScore);
        Assert.Equal(3, mm.fullInterviews);
        Assert.Equal(5, mm.total);
        Assert.Equal(2, reply.totals.distinctSubjects);
        Assert.Equal(3, reply.totals.demosCompleted);
        Assert.Equal("Sales & Marketing", reply.categories[0].category);
    }

    [Fact]
    public void Nothing_recorded_gives_an_empty_page_not_an_error()
    {
        var reply = Subjects.Build([], [], 0);
        Assert.Empty(reply.subjects);
        Assert.Equal(0, reply.totals.distinctSubjects);
    }
}
