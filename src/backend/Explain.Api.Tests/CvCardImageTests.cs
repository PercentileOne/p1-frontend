using Explain.Api.Features.CvAnalysis;
using Card = Explain.Api.Features.CvAnalysis.CvCardImage;

namespace Explain.Api.Tests;

// The picture on a shared CV analysis link (2026-10-19): the right size, the right skills and roles, and nothing that could show a weakness.
public class CvCardImageTests
{
    private static SharedCvView View(string? name = "Francis Cobbinah", int skills = 8, int roles = 3) => new(
        name, "2026-10-19T09:00:00Z",
        new AnalysisResult(name, Enumerable.Range(1, skills).Select(i => new SkillLevel($"Skill {i}", i <= 3 ? 9 : 5 + (i % 3), null)).ToList(), [], [], [], [], ""),
        Enumerable.Range(1, roles).Select(i => new SavedRoleMatch($"Role {i}", $"c{i}", $"Career {i}", 40000, 90000)).ToList(),
        null, "public", true);

    private static (int w, int h) PngSize(byte[] png) =>
        ((png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19], (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23]);

    [Fact]
    public void The_card_is_a_1200_by_630_png()
    {
        var png = Card.Build(View());
        Assert.Equal(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, png.Take(8).ToArray());   // the PNG signature
        Assert.Equal((1200, 630), PngSize(png));
        Assert.InRange(png.Length, 5_000, 4_000_000);   // a real picture, and well under LinkedIn's 5 MB limit
    }

    [Fact]
    public void The_card_still_draws_with_no_name_one_skill_no_roles_and_very_long_text()
    {
        Assert.Equal((1200, 630), PngSize(Card.Build(View(name: null, skills: 1, roles: 0))));
        var long_ = new string('W', 300);
        var view = View(name: long_) with { analysis = new AnalysisResult(long_, [new SkillLevel(long_, 99, null), new SkillLevel("x", -4, null)], [], [], [], [], "") };
        Assert.Equal((1200, 630), PngSize(Card.Build(view)));
    }

    [Fact]
    public void Only_the_five_strongest_skills_are_shown_strongest_first()
    {
        var shown = Card.TopSkills(View(skills: 8));
        Assert.Equal(5, shown.Count);
        Assert.True(shown.Zip(shown.Skip(1), (a, b) => a.Level >= b.Level).All(x => x));
        Assert.Equal(new[] { "Skill 1", "Skill 2", "Skill 3" }, shown.Take(3).Select(s => s.Name));   // the three at level 9, in their original order
    }

    [Fact]
    public void Only_the_first_three_roles_are_shown_and_blank_ones_are_skipped()
    {
        Assert.Equal(3, Card.TopRoles(View(roles: 6)).Count);
        var view = View(roles: 2) with { roleMatches = [new SavedRoleMatch("a", "c", " ", 1, 2), new SavedRoleMatch("b", "c", "Nurse", 1, 2)] };
        Assert.Equal(new[] { "Nurse" }, Card.TopRoles(view));
    }

    [Theory]
    [InlineData("Short", 10, "Short")]
    [InlineData("  padded  ", 10, "padded")]
    [InlineData("This is a rather long skill name", 12, "This is a r…")]
    public void Long_lines_are_cut_with_an_ellipsis(string text, int max, string expected)
    {
        Assert.Equal(expected, Card.Fit(text, max));
        Assert.True(Card.Fit(text, max).Length <= max);
    }

    [Theory]
    [InlineData(-3, 1)]
    [InlineData(0, 1)]
    [InlineData(7, 7)]
    [InlineData(10, 10)]
    [InlineData(99, 10)]
    public void A_bar_always_stays_inside_its_track(int level, int expected) => Assert.Equal(expected, Card.BarLevel(level));

    [Theory]
    [InlineData("BdcingBzRA.png", "BdcingBzRA")]
    [InlineData("BdcingBzRA.PNG", "BdcingBzRA")]
    [InlineData("BdcingBzRA", null)]            // no .png
    [InlineData("Bdc.png", null)]               // too short
    [InlineData("../../secret.png", null)]      // not a plain token
    [InlineData("Bdcing BzRA.png", null)]
    [InlineData("a%00b%00c%00d.png", null)]
    [InlineData(".png", null)]
    [InlineData("", null)]
    public void Only_a_plain_token_with_png_is_asked_for(string file, string? expected) => Assert.Equal(expected, Explain.Api.Features.CvAnalysis.Endpoint.ParseCardToken(file));

    [Fact]
    public void The_token_limit_is_forty_characters()
    {
        Assert.NotNull(Explain.Api.Features.CvAnalysis.Endpoint.ParseCardToken(new string('a', 40) + ".png"));
        Assert.Null(Explain.Api.Features.CvAnalysis.Endpoint.ParseCardToken(new string('a', 41) + ".png"));
    }

    [Fact]
    public void The_card_is_built_only_from_the_public_positives_view()
    {
        // The builder takes a SharedCvView, which for a candidate's or anonymous share has no weaknesses in it at all. This pins that the card has no weakness-shaped input.
        var members = typeof(Card).GetMethods().Where(m => m.Name == "Build").SelectMany(m => m.GetParameters()).Select(p => p.ParameterType).ToList();
        Assert.Equal(new[] { typeof(SharedCvView) }, members);
    }
}
