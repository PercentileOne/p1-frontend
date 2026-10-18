using System.Net;
using Videos = Explain.Api.Features.FeedVideos.Endpoint;

namespace Explain.Api.Tests;

// The feed's video strip (2026-10-18): reading a YouTube link, the theme list, and what YouTube's oEmbed answer means for whether a video may be shown.
public class FeedVideosTests
{
    [Theory]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s")]
    [InlineData("https://m.youtube.com/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://youtu.be/dQw4w9WgXcQ?si=abc")]
    [InlineData("https://www.youtube.com/shorts/dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/embed/dQw4w9WgXcQ")]
    [InlineData("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")]
    [InlineData("www.youtube.com/live/dQw4w9WgXcQ")]
    [InlineData("  dQw4w9WgXcQ  ")]
    public void A_video_id_is_found_in_every_kind_of_YouTube_link(string link)
    {
        Assert.Equal("dQw4w9WgXcQ", Videos.ParseVideoId(link));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("hello")]
    [InlineData("https://vimeo.com/123456789")]
    [InlineData("https://www.youtube.com/watch")]
    [InlineData("https://www.youtube.com/@RickAstleyYT")]
    [InlineData("https://www.youtube.com/watch?v=tooshort")]
    [InlineData("https://evil.example/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ")]
    public void Anything_that_is_not_a_YouTube_video_link_is_refused(string? link)
    {
        Assert.Null(Videos.ParseVideoId(link));
    }

    [Fact]
    public void Only_the_listed_themes_are_accepted()
    {
        Assert.Equal("pitching", Videos.CleanTheme(" Pitching "));
        Assert.Equal("software-and-cloud", Videos.CleanTheme("software-and-cloud"));
        Assert.Null(Videos.CleanTheme("cats"));
        Assert.Null(Videos.CleanTheme(null));
    }

    [Fact]
    public void A_good_oEmbed_answer_gives_the_title_and_channel_from_YouTube()
    {
        var r = Videos.ReadOEmbed(HttpStatusCode.OK, "{\"title\":\"A pitch\",\"author_name\":\"Shark Tank\",\"author_url\":\"https://www.youtube.com/@sharktank\"}");
        Assert.Null(r.Error);
        Assert.Equal("A pitch", r.Title);
        Assert.Equal("Shark Tank", r.Channel);
        Assert.Equal("https://www.youtube.com/@sharktank", r.ChannelUrl);
    }

    [Fact]
    public void Embedding_switched_off_missing_and_unreadable_answers_are_all_refused_in_plain_words()
    {
        Assert.Contains("switched embedding off", Videos.ReadOEmbed(HttpStatusCode.Unauthorized, "").Error);
        Assert.Contains("could not find", Videos.ReadOEmbed(HttpStatusCode.NotFound, "").Error);
        Assert.Contains("did not answer", Videos.ReadOEmbed(HttpStatusCode.InternalServerError, "").Error);
        Assert.Contains("could not be read", Videos.ReadOEmbed(HttpStatusCode.OK, "not json").Error);
        Assert.Contains("title and channel", Videos.ReadOEmbed(HttpStatusCode.OK, "{\"title\":\"\"}").Error);
    }
}
