using System.Text.Json.Serialization;

namespace P1.CareersAgent.Models;

// One document per distinct reported title (id = partition key = normalised title), so
// the same career being typed by many candidates accumulates into a single row with a
// rising reportCount instead of an unbounded pile of duplicates — that count is the
// actual signal an admin wants when deciding what to enrich next.
public class MissingCareerReport
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("normalizedTitle")]
    public string NormalizedTitle { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public string Source { get; set; } = string.Empty;

    [JsonPropertyName("reportCount")]
    public int ReportCount { get; set; } = 1;

    [JsonPropertyName("firstReportedAt")]
    public string FirstReportedAt { get; set; } = string.Empty;

    [JsonPropertyName("lastReportedAt")]
    public string LastReportedAt { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "pending"; // pending | resolved | dismissed

    [JsonPropertyName("resolvedCareerId")]
    public string? ResolvedCareerId { get; set; }

    // Set once, on first sighting of this title, by OpenAiEnricher.ClassifyJobTitleAsync —
    // never re-checked on repeat reports of the same title. Flags likely junk for triage;
    // never used to silently drop a report, since a wrong AI call shouldn't erase real signal.
    [JsonPropertyName("plausible")]
    public bool Plausible { get; set; } = true;

    [JsonPropertyName("aiNote")]
    public string AiNote { get; set; } = string.Empty;
}
