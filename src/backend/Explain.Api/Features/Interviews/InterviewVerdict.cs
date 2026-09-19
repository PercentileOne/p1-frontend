namespace Explain.Api.Features.Interviews;

/// <summary>
/// Pass / Keep on file / Fail for a finished interview (Francis, 2026-09-19: "we should have been doing this
/// from the start"). The mark scales with the difficulty the candidate chose — a company-specific interview
/// defaults its difficulty to that company's bar, so Google-style is harder to pass than a Beginner practice run.
///
/// MUST stay in step with src/frontend/src/lib/interviewVerdict.ts (the UI and Michelle's feedback use that copy;
/// this one is what a pass certificate is checked against, so a certificate can never be minted for a non-pass).
/// </summary>
public static class InterviewVerdict
{
    public const string Pass = "pass";
    public const string KeepOnFile = "keep-on-file";
    public const string Fail = "fail";

    // difficulty -> (pass mark, keep-on-file mark), in % of the overall score.
    private static readonly Dictionary<string, (int pass, int keep)> Marks = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Beginner"] = (60, 45),
        ["Standard"] = (65, 50),
        ["Pro"] = (70, 55),
        // Expert = treated as the leading authority in the field, so 90% (Francis, 2026-09-19). Any prize is tied to this level only.
        ["Expert"] = (90, 75),
    };

    public static (int pass, int keep) MarksFor(string? difficulty) =>
        difficulty is not null && Marks.TryGetValue(difficulty, out var m) ? m : Marks["Standard"];

    public static string Evaluate(double scorePct, string? difficulty)
    {
        var (pass, keep) = MarksFor(difficulty);
        return scorePct >= pass ? Pass : scorePct >= keep ? KeepOnFile : Fail;
    }
}
