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

    // ── "Any US/UK exam" fields (2026-09-19, see ~/.claude/plans/any-exam-certifications-plan.md) ──
    // All additive and defaulted so every pre-existing document (11 at the time) still loads.

    // "uk" | "us" | "global" — drives the picker's region toggle.
    [JsonPropertyName("region")]
    public string Region { get; set; } = string.Empty;

    // Awarding body / test owner (AQA, Edexcel, College Board, ETS...). Optional — GCSE/A-level
    // entries start subject-level with no board, board-specific specs get added by demand.
    [JsonPropertyName("board")]
    public string Board { get; set; } = string.Empty;

    [JsonPropertyName("level")]
    public string Level { get; set; } = string.Empty;

    [JsonPropertyName("subject")]
    public string Subject { get; set; } = string.Empty;

    // How a result is presented: "scaled" (min..max with a pass mark, the original behaviour) |
    // "grade-9-1" (GCSE) | "grade-a-star-e" (A-level) | "ap-1-5". Grade models are always shown
    // as INDICATIVE — real boundaries change every year, per paper and per tier.
    [JsonPropertyName("scoringModel")]
    public string ScoringModel { get; set; } = "scaled";

    // Lowest score on the exam's scale (SAT 400, GED 100...). 0 for the original 0-based scales.
    [JsonPropertyName("minScore")]
    public int MinScore { get; set; }

    // "" = a curated record with a real source (e.g. the original AZ-104 entry) | "stub" = name
    // only, no blueprint yet | "ai-draft" = blueprint generated on demand by the AI, unreviewed
    // (the UI shows "may differ from the official specification") | "reviewed" = an admin has
    // checked it. Readiness itself is still just "domains is populated".
    [JsonPropertyName("blueprintStatus")]
    public string BlueprintStatus { get; set; } = string.Empty;

    [JsonPropertyName("blueprintGeneratedAt")]
    public string BlueprintGeneratedAt { get; set; } = string.Empty;

    // "active" | "retired" — set by the weekly refresh job (retired exams stay searchable-off but
    // keep their document so past sessions still resolve).
    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";

    [JsonPropertyName("lastVerifiedAt")]
    public string LastVerifiedAt { get; set; } = string.Empty;

    // ── Weekly refresh job (Explain.Api Features/ExamCatalog/Refresh) ──────────────────────────
    // The OFFICIAL page for this exam (Microsoft study guide, College Board course page...). The job
    // fetches it weekly, compares sourceHash, and — when it changed — re-extracts the blueprint from
    // that page's own text rather than from the AI's memory.
    [JsonPropertyName("sourceUrl")]
    public string SourceUrl { get; set; } = string.Empty;

    // SHA-256 of the page's normalised text at the last check.
    [JsonPropertyName("sourceHash")]
    public string SourceHash { get; set; } = string.Empty;

    [JsonPropertyName("sourceCheckedAt")]
    public string SourceCheckedAt { get; set; } = string.Empty;

    // "" | "ok" | "unreachable" — a page that stops loading is reported to the admin, never auto-retired.
    [JsonPropertyName("sourceStatus")]
    public string SourceStatus { get; set; } = string.Empty;
}
