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
    // code -> English name. Same 32 languages as the intake dropdown (src/frontend/src/data/interviewOptions.ts).
    private static readonly Dictionary<string, string> Names = new(StringComparer.OrdinalIgnoreCase)
    {
        ["en"] = "English", ["ar"] = "Arabic", ["bg"] = "Bulgarian", ["hr"] = "Croatian", ["cs"] = "Czech", ["da"] = "Danish", ["nl"] = "Dutch", ["fil"] = "Filipino",
        ["fi"] = "Finnish", ["fr"] = "French", ["de"] = "German", ["el"] = "Greek", ["hi"] = "Hindi", ["hu"] = "Hungarian", ["id"] = "Indonesian", ["it"] = "Italian",
        ["ja"] = "Japanese", ["ko"] = "Korean", ["ms"] = "Malay", ["no"] = "Norwegian", ["pl"] = "Polish", ["pt"] = "Portuguese", ["ro"] = "Romanian", ["ru"] = "Russian",
        ["sk"] = "Slovak", ["es"] = "Spanish", ["sv"] = "Swedish", ["ta"] = "Tamil", ["tr"] = "Turkish", ["uk"] = "Ukrainian", ["vi"] = "Vietnamese", ["zh"] = "Chinese (Mandarin)",
    };

    /// <summary>The English name of a supported language code ("fr" → "French"), or null if it isn't one of the 32.</summary>
    public static string? NameFor(string? code) =>
        !string.IsNullOrWhiteSpace(code) && Names.TryGetValue(code.Trim(), out var n) ? n : null;

    public static string? Normalise(string? code) =>
        !string.IsNullOrWhiteSpace(code) && Names.ContainsKey(code.Trim()) ? code.Trim().ToLowerInvariant() : null;
}
