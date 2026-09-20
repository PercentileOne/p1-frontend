namespace Explain.Api.Features.Interviews;

/// <summary>
/// The interview's spoken language, forwarded to ElevenLabs as `language_code` (Francis, 2026-09-20: Wayne began an English
/// interview in English, then suddenly spoke "some strange language"). eleven_flash_v2_5 is multilingual and, with no
/// language_code, GUESSES the language from the text — a line with an unusual proper noun or a short fragment can be
/// guessed wrong. The caller already knows the interview language (chosen at intake), so it is now always passed.
/// Same 32 languages as the intake dropdown (InterviewPackStart.tsx LANGUAGES); anything else is ignored, never forwarded.
/// </summary>
public static class TtsLanguage
{
    private static readonly HashSet<string> Supported = new(StringComparer.OrdinalIgnoreCase)
    {
        "en","ar","bg","hr","cs","da","nl","fil","fi","fr","de","el","hi","hu","id","it","ja","ko","ms","no","pl","pt","ro","ru","sk","es","sv","ta","tr","uk","vi","zh",
    };

    public static string? Normalise(string? code) =>
        !string.IsNullOrWhiteSpace(code) && Supported.Contains(code.Trim()) ? code.Trim().ToLowerInvariant() : null;
}
