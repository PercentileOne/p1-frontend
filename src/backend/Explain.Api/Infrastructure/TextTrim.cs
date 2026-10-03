namespace Explain.Api.Infrastructure;

/// <summary>Shortens model-written text without ever cutting a word in half (a hard character cut showed "…and a" and "geomet" to real visitors, 2026-10-03).</summary>
public static class TextTrim
{
    /// <summary>The text unchanged if it fits; otherwise cut back to the last full sentence (when that keeps at least 40% of the limit), else the last full word with an ellipsis.</summary>
    public static string ToSentence(string text, int max)
    {
        text = (text ?? "").Trim();
        if (text.Length <= max) return text;
        var cut = text[..max];
        var end = cut.LastIndexOfAny(['.', '?', '!']);
        if (end >= max * 0.4) return cut[..(end + 1)].TrimEnd();
        var space = cut.LastIndexOf(' ');
        return (space > 0 ? cut[..space] : cut).TrimEnd(' ', ',', ';', ':', '-', '—') + "…";
    }
}
