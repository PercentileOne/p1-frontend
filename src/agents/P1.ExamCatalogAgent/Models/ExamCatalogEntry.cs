using System.Text.Json.Serialization;

namespace P1.ExamCatalogAgent.Models;

public class DomainWeight
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("weightPct")]
    public int WeightPct { get; set; }
}

// One document per certification/exam. category is the Cosmos partition key — an open string
// ("certification"|"gcse"|"a-level"|future others), not a closed enum, so a brand-new exam type
// (Francis's own example: "XYZ Test") never needs a code deploy, just a new category value on
// however the first entry in it gets added.
//
// No "enabled" boolean (unlike the static certificationBank.ts this replaces) — readiness is
// derived from whether domains is populated. A live, growable catalog will accumulate name-only
// stub entries (seeded, reported-and-added, or later AI-discovered) long before someone fills in
// real domain/scoring data for each one; that's a different state than a fixed "coming soon" flag
// on a handful of hardcoded rows.
public class ExamCatalogEntry
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("vendor")]
    public string Vendor { get; set; } = string.Empty;

    [JsonPropertyName("examCode")]
    public string ExamCode { get; set; } = string.Empty;

    [JsonPropertyName("aliases")]
    public List<string> Aliases { get; set; } = [];

    [JsonPropertyName("domains")]
    public List<DomainWeight> Domains { get; set; } = [];

    [JsonPropertyName("passScore")]
    public int PassScore { get; set; }

    [JsonPropertyName("maxScore")]
    public int MaxScore { get; set; }

    // "seed" (Phase 1 curated starter list) | "admin" (manually added) | "discovery" (Phase 2's
    // planned AI discovery job) — provenance, not shown to candidates, useful for admin triage.
    [JsonPropertyName("source")]
    public string Source { get; set; } = "seed";

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;
}
