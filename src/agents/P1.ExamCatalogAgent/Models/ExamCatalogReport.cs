using System.Text.Json.Serialization;

namespace P1.ExamCatalogAgent.Models;

// One document per distinct reported name (id = partition key = normalized name) — mirrors
// MissingCareerReport.cs exactly. A repeat report of the same exam/cert increments reportCount
// instead of piling up duplicate rows.
public class ExamCatalogReport
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("normalizedName")]
    public string NormalizedName { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("reportCount")]
    public int ReportCount { get; set; } = 1;

    [JsonPropertyName("firstReportedAt")]
    public string FirstReportedAt { get; set; } = string.Empty;

    [JsonPropertyName("lastReportedAt")]
    public string LastReportedAt { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "pending"; // pending | resolved | dismissed

    [JsonPropertyName("resolvedExamId")]
    public string? ResolvedExamId { get; set; }

    // Phase 2 adds a real AI plausibility check (mirrors OpenAiEnricher.ClassifyJobTitleAsync)
    // that populates these on first sighting — Phase 1 leaves them at their lenient defaults so
    // the shape is forward-compatible without a schema migration later.
    [JsonPropertyName("plausible")]
    public bool Plausible { get; set; } = true;

    [JsonPropertyName("aiNote")]
    public string AiNote { get; set; } = string.Empty;
}
