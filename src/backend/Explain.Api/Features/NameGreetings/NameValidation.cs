namespace Explain.Api.Features.NameGreetings;

/// <summary>
/// Cheap gate before ever spending money generating a clip — same "reject the free way first"
/// instinct as the Careers feature's MissingCareerFunction.LooksMalformed, tuned for first
/// names rather than job titles (allows apostrophes/hyphens for names like O'Brien, Anne-Marie).
/// </summary>
public static class NameValidation
{
    public static bool LooksImplausible(string name)
    {
        var trimmed = name.Trim();
        if (trimmed.Length is 0 or > 40) return true;
        if (!trimmed.Any(char.IsLetter)) return true;

        var letterish = trimmed.Count(c => char.IsLetter(c) || c is ' ' or '\'' or '-');
        if ((double)letterish / trimmed.Length < 0.8) return true;

        // Reject 4x-repeated-char spam (keyboard mashing) — same check as Careers' own gate.
        var run = 1;
        for (var i = 1; i < trimmed.Length; i++)
        {
            run = trimmed[i] == trimmed[i - 1] ? run + 1 : 1;
            if (run >= 4) return true;
        }
        return false;
    }
}
