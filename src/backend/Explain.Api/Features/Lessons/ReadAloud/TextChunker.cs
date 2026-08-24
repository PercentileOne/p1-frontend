using System.Text;
using System.Text.RegularExpressions;

namespace Explain.Api.Features.Lessons.ReadAloud;

/// <summary>
/// Splits lesson text into small, independently-cacheable, independently-playable clips.
/// Sentence-bounded rather than fixed-length, so audio never cuts off mid-word, and short
/// enough to give the frontend player a fine-enough grain for pause/resume.
/// </summary>
public static class TextChunker
{
    private const int TargetChars = 260;

    public static List<string> Chunk(string text)
    {
        var sentences = Regex.Split(text.Trim(), @"(?<=[.!?])\s+")
            .Where(s => !string.IsNullOrWhiteSpace(s));

        var chunks = new List<string>();
        var current = new StringBuilder();
        foreach (var sentence in sentences)
        {
            if (current.Length > 0 && current.Length + sentence.Length > TargetChars)
            {
                chunks.Add(current.ToString().Trim());
                current.Clear();
            }
            current.Append(sentence).Append(' ');
        }
        if (current.Length > 0) chunks.Add(current.ToString().Trim());
        return chunks;
    }
}
