using Explain.Api.Features.Interviewers;
using Interviewers = Explain.Api.Features.Interviewers.Endpoint;

namespace Explain.Api.Tests;

// The interviewers registry (2026-10-07): what an admin may save, and which uploaded pictures are accepted.
public class InterviewersTests
{
    private static SaveInterviewerRequest Valid(Func<SaveInterviewerRequest, SaveInterviewerRequest>? change = null)
    {
        var r = new SaveInterviewerRequest("Haruto", "technical", "17dcea17-a918-4963-ad1b-742bc0e82d10", "voice123", "A calm, methodical technical interviewer.", 4, 3, 3, 3, 3, true, 40, null);
        return change is null ? r : change(r);
    }

    [Fact]
    public void A_complete_request_is_accepted_and_trimmed()
    {
        var (v, err) = Interviewers.Validate(Valid(r => r with { DisplayName = "  Haruto " }));
        Assert.Null(err);
        Assert.Equal("Haruto", v!.DisplayName);
        Assert.Equal("technical", v.Role);
    }

    [Theory]
    [InlineData("amina", true)]
    [InlineData("haruto-2", true)]
    [InlineData("A", false)]
    [InlineData("Amina", false)]
    [InlineData("../secret", false)]
    [InlineData("has space", false)]
    [InlineData("", false)]
    public void Ids_are_short_lowercase_slugs(string id, bool ok) => Assert.Equal(ok, Interviewers.IsValidId(id));

    [Theory]
    [InlineData("")]
    [InlineData("X")]
    [InlineData("<script>")]
    [InlineData("Name {with} braces")]
    public void Bad_names_are_refused(string name) => Assert.NotNull(Interviewers.Validate(Valid(r => r with { DisplayName = name })).Error);

    [Fact] public void An_unknown_role_is_refused() => Assert.NotNull(Interviewers.Validate(Valid(r => r with { Role = "ceo" })).Error);

    [Theory]
    [InlineData("abc def")]
    [InlineData("id;drop")]
    [InlineData("")]
    public void The_avatar_id_may_only_hold_letters_numbers_and_hyphens(string avatar) =>
        Assert.NotNull(Interviewers.Validate(Valid(r => r with { SpatiusAvatarId = avatar })).Error);

    [Fact]
    public void Personality_levels_are_kept_between_1_and_5()
    {
        var (v, _) = Interviewers.Validate(Valid(r => r with { Depth = 99, Strictness = -4, Warmth = null }));
        Assert.Equal(5, v!.Depth);
        Assert.Equal(1, v.Strictness);
        Assert.Equal(3, v.Warmth); // missing = middle
    }

    [Fact]
    public void A_description_over_160_characters_is_refused() =>
        Assert.NotNull(Interviewers.Validate(Valid(r => r with { Description = new string('a', 161) })).Error);

    [Fact]
    public void A_default_seat_must_match_the_role()
    {
        Assert.NotNull(Interviewers.Validate(Valid(r => r with { DefaultFor = "hr" })).Error);       // technical interviewer cannot be the HR default
        Assert.Null(Interviewers.Validate(Valid(r => r with { DefaultFor = "technical" })).Error);
    }

    [Fact]
    public void Only_jpg_png_and_webp_are_recognised_from_the_files_own_bytes()
    {
        Assert.Equal("jpg", Interviewers.SniffImage([0xFF, 0xD8, 0xFF, 0xE0, 0, 0])!.Value.Ext);
        Assert.Equal("png", Interviewers.SniffImage([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0])!.Value.Ext);
        Assert.Equal("webp", Interviewers.SniffImage("RIFF\0\0\0\0WEBPVP8 "u8)!.Value.Ext);
        Assert.Null(Interviewers.SniffImage("<svg xmlns='http://www.w3.org/2000/svg'></svg>"u8)); // scripts in an image are never accepted
        Assert.Null(Interviewers.SniffImage("GIF89a......"u8));
        Assert.Null(Interviewers.SniffImage([]));
    }
}
