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
    public void Marks_go_on_the_front_without_duplicates_and_come_off_cleanly()
    {
        var marks = Videos.SetMark([], "aaaaaaaaaaa", true, "t1", 500);
        marks = Videos.SetMark(marks, "bbbbbbbbbbb", true, "t2", 500);
        Assert.Equal(["bbbbbbbbbbb", "aaaaaaaaaaa"], marks.Select(m => m.id));
        marks = Videos.SetMark(marks, "aaaaaaaaaaa", true, "t3", 500);   // marking again moves it to the front, not twice
        Assert.Equal(["aaaaaaaaaaa", "bbbbbbbbbbb"], marks.Select(m => m.id));
        marks = Videos.SetMark(marks, "aaaaaaaaaaa", false, "t4", 500);
        Assert.Equal(["bbbbbbbbbbb"], marks.Select(m => m.id));
        Assert.Equal(["bbbbbbbbbbb"], Videos.SetMark(marks, "zzzzzzzzzzz", false, "t5", 500).Select(m => m.id));   // removing what is not there changes nothing
    }

    [Fact]
    public void Only_the_newest_marks_are_kept_when_the_cap_is_reached()
    {
        var marks = new List<Videos.Mark>();
        foreach (var id in new[] { "aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc" }) marks = Videos.SetMark(marks, id, true, "t", 2);
        Assert.Equal(["ccccccccccc", "bbbbbbbbbbb"], marks.Select(m => m.id));
    }

    [Theory]
    [InlineData("me", "me", false, false, true)]      // your own, always
    [InlineData("me", "me", true, true, true)]
    [InlineData("fan", "owner", true, true, true)]    // a follower, with sharing on
    [InlineData("fan", "owner", false, true, false)]  // a follower, but sharing is off (the default)
    [InlineData("stranger", "owner", true, false, false)]   // sharing is on, but they do not follow
    [InlineData("stranger", "owner", false, false, false)]
    public void Liked_videos_are_visible_only_to_the_owner_or_a_follower_while_sharing_is_on(string viewer, string owner, bool shares, bool follows, bool expected)
    {
        Assert.Equal(expected, Videos.CanSeeLikes(viewer, owner, shares, follows));
    }

    [Fact]
    public void Sharing_is_off_unless_it_was_switched_on()
    {
        var fresh = new Videos.VideoState("feedvideo-state", "u", "feedvideo-state", [], [], "t");
        Assert.False(fresh.shareLikes);
    }

    [Fact]
    public void Nobody_can_follow_themselves_or_nobody()
    {
        Assert.False(Explain.Api.Features.Follows.Endpoint.CanFollow("a", "a"));
        Assert.False(Explain.Api.Features.Follows.Endpoint.CanFollow("a", ""));
        Assert.True(Explain.Api.Features.Follows.Endpoint.CanFollow("a", "b"));
    }

    [Fact]
    public void A_cached_public_list_is_served_for_thirty_seconds_and_not_after()
    {
        var then = new DateTime(2026, 10, 18, 12, 0, 0, DateTimeKind.Utc);
        Assert.True(Videos.CacheFresh(then, then.AddSeconds(29), Videos.PublicCacheSeconds));
        Assert.False(Videos.CacheFresh(then, then.AddSeconds(30), Videos.PublicCacheSeconds));
        Assert.False(Videos.CacheFresh(then, then.AddSeconds(-5), Videos.PublicCacheSeconds));   // a clock that went backwards is never trusted
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
