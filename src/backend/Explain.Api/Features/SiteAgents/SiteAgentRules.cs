using System.Text.RegularExpressions;

namespace Explain.Api.Features.SiteAgents;

/// <summary>
/// The small decisions behind the homepage talking guide (see docs/specs/site-agents-plan.md), kept as plain functions so they can be tested.
/// </summary>
public static class SiteAgentRules
{
    /// <summary>The longest a guide conversation may run. Also set on the ElevenLabs agent itself (Max conversation duration).</summary>
    public const int MaxSeconds = 180;

    public static bool IsAudience(string? audience) => audience is "recruiter" or "candidate";

    /// <summary>
    /// The first name spoken in the greeting, typed by a stranger: letters, spaces, apostrophes and hyphens only, at most 30 characters, otherwise "there".
    /// It goes into a spoken sentence and an AI prompt variable, so anything else (digits, symbols, instructions) is dropped rather than passed along.
    /// </summary>
    public static string CleanName(string? raw)
    {
        var s = Regex.Replace((raw ?? string.Empty).Trim(), @"[^\p{L}\p{M} '\-]", "");
        s = Regex.Replace(s, @"\s+", " ").Trim(' ', '-', '\'');
        if (s.Length > 30) s = s[..30].TrimEnd(' ', '-', '\'');
        return s.Length == 0 ? "there" : s;
    }

    /// <summary>The ElevenLabs agent for this audience (an id, not a secret), or null when it has not been set up.</summary>
    public static string? AgentIdFor(IConfiguration config, string audience)
    {
        var id = audience == "recruiter" ? config["SiteAgent:RecruiterAgentId"] : config["SiteAgent:CandidateAgentId"];
        return string.IsNullOrWhiteSpace(id) ? null : id.Trim();
    }
}
