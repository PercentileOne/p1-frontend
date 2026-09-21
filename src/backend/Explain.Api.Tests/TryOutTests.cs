using TryOut = Explain.Api.Features.TryOut.Endpoint;

namespace Explain.Api.Tests;

public class TryOutTests
{
    [Theory]
    [InlineData("Marketing Manager at Nike", "Marketing Manager at Nike")]
    [InlineData("  A-level   Biology ", "A-level Biology")]
    [InlineData("Driving theory\ntest", "Driving theorytest")]   // control characters are dropped, never passed to the model
    public void Topics_are_trimmed_and_cleaned(string raw, string expected) => Assert.Equal(expected, TryOut.CleanTopic(raw));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("a")]
    [InlineData("   ")]
    public void Empty_or_tiny_topics_are_rejected(string? raw) => Assert.Null(TryOut.CleanTopic(raw));

    [Fact] public void Very_long_topics_are_rejected() => Assert.Null(TryOut.CleanTopic(new string('x', 91)));

    [Fact]
    public void Only_answered_questions_are_kept_and_lengths_are_capped()
    {
        var cleaned = TryOut.CleanAnswers(
        [
            new("Q1?", "A real answer"),
            new("Q2?", "   "),                        // blank -> dropped
            new(new string('q', 900), new string('a', 5000)),
            new("Q4?", "beyond the third"),           // only the first three are considered
        ]);
        Assert.Equal(2, cleaned.Count);
        Assert.Equal(400, cleaned[1].Question.Length);
        Assert.Equal(1500, cleaned[1].Answer.Length);
    }

    [Fact]
    public void Model_output_is_clamped_and_padded_to_one_entry_per_answer()
    {
        var wild = new TryOut.FeedbackModelResult(250, "  Nice  ", new TryOut.DimensionScores(-3, 11, 5, 99, 0),
            [new(15, " good ", "better")], "  practise X ");
        var n = TryOut.Normalise(wild, 3);
        Assert.Equal(100, n.Overall);
        Assert.Equal("Nice", n.Headline);
        Assert.Equal(0, n.Dimensions!.Clarity);
        Assert.Equal(10, n.Dimensions.Relevance);
        Assert.Equal(10, n.Dimensions.Depth);
        Assert.Equal(3, n.Questions!.Count);
        Assert.Equal(10, n.Questions[0].Score);
        Assert.Null(n.Questions[2].Feedback);         // padded
    }
}
