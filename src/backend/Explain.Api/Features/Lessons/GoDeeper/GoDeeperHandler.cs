using System.Text.Json;
using System.Text.Json.Serialization;
using MediatR;
using Explain.Api.Common;
using Explain.Api.Features.Lessons.Generate;
using Explain.Api.Infrastructure.Anthropic;

namespace Explain.Api.Features.Lessons.GoDeeper;

public class GoDeeperHandler(
    AnthropicService anthropic,
    ILogger<GoDeeperHandler> logger)
    : IRequestHandler<GoDeeperCommand, Result<GoDeeperDto>>
{
    public async Task<Result<GoDeeperDto>> Handle(GoDeeperCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Subject))
            return Result<GoDeeperDto>.Failure("Subject is required.");

        logger.LogInformation("Go Deeper requested for '{Subject}' — already has {Count} concepts",
            cmd.Subject, cmd.ExistingConceptTitles.Count);

        try
        {
            var json = await anthropic.CompleteAsync(BuildPrompt(cmd.Subject, cmd.Category, cmd.ExistingConceptTitles), maxTokens: 6000, ct: ct);
            var raw  = JsonSerializer.Deserialize<RawGoDeeper>(json, JsonOptions)
                       ?? throw new InvalidOperationException("Failed to deserialise go-deeper response");

            var dto = new GoDeeperDto(
                NewConcepts: raw.NewConcepts?.Select(k => new KeyConceptDto(
                    k.Icon ?? "💡", k.Title ?? "", k.Body ?? "",
                    k.DeepDive ?? "", k.Example ?? "",
                    k.CodeSnippet, k.MemoryHook ?? "", k.ExamTrap ?? ""))
                    .ToList() ?? [],
                NewGlossaryTerms: raw.NewGlossaryTerms?.Select(g => new GlossaryItemDto(g.Term ?? "", g.Def ?? ""))
                    .ToList() ?? [],
                NewExamQuestions: raw.NewExamQuestions ?? []
            );

            logger.LogInformation("Go Deeper complete for '{Subject}' — {Count} new concepts added",
                cmd.Subject, dto.NewConcepts.Count);

            return Result<GoDeeperDto>.Success(dto);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Go Deeper failed for '{Subject}'", cmd.Subject);
            return Result<GoDeeperDto>.Failure("Failed to go deeper. Please try again.", 500);
        }
    }

    private static string BuildPrompt(string subject, string category, List<string> existingTitles)
    {
        var existing = string.Join(", ", existingTitles.Select(t => $"\"{t}\""));
        return $@"You are an expert educator providing an advanced deep-dive extension for a learner who has already studied the basics of ""{subject}"".

The learner has already covered these concepts: {existing}

Now generate ADDITIONAL, MORE ADVANCED content that goes beyond what they've already learned. Do NOT repeat the existing concepts.

Return ONLY valid JSON (no markdown, no explanation):

{{
  ""newConcepts"": [
    {{
      ""icon"": ""emoji"",
      ""title"": ""advanced concept name"",
      ""body"": ""2-sentence overview — assume the learner knows the basics"",
      ""deepDive"": ""2-3 sentences going deeper, with a real analogy"",
      ""example"": ""specific real-world scenario that illustrates this advanced concept"",
      ""codeSnippet"": ""if technical/programming, a short illustrative code example. null if not applicable."",
      ""memoryHook"": ""memorable phrase to make this advanced concept stick"",
      ""examTrap"": ""the subtle mistake experts make on this topic""
    }}
  ],
  ""newGlossaryTerms"": [{{ ""term"": ""advanced term"", ""def"": ""plain-English definition"" }}],
  ""newExamQuestions"": [""Advanced question that requires deeper understanding of {subject}""]
}}

Rules:
- newConcepts: exactly 4 new concepts, more advanced than the basics already covered
- newGlossaryTerms: 4-6 additional terms not in the basic glossary
- newExamQuestions: 4 harder exam questions
- Category context: {category} — calibrate depth and terminology accordingly
- All content must be genuinely more advanced, not just rephrasing the basics";
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private class RawGoDeeper
    {
        [JsonPropertyName("newConcepts")]       public List<RawConcept>? NewConcepts       { get; set; }
        [JsonPropertyName("newGlossaryTerms")]  public List<RawGlossary>? NewGlossaryTerms { get; set; }
        [JsonPropertyName("newExamQuestions")]  public List<string>? NewExamQuestions      { get; set; }
    }

    private class RawConcept
    {
        [JsonPropertyName("icon")]        public string? Icon        { get; set; }
        [JsonPropertyName("title")]       public string? Title       { get; set; }
        [JsonPropertyName("body")]        public string? Body        { get; set; }
        [JsonPropertyName("deepDive")]    public string? DeepDive    { get; set; }
        [JsonPropertyName("example")]     public string? Example     { get; set; }
        [JsonPropertyName("codeSnippet")] public string? CodeSnippet { get; set; }
        [JsonPropertyName("memoryHook")]  public string? MemoryHook  { get; set; }
        [JsonPropertyName("examTrap")]    public string? ExamTrap    { get; set; }
    }

    private class RawGlossary
    {
        [JsonPropertyName("term")] public string? Term { get; set; }
        [JsonPropertyName("def")]  public string? Def  { get; set; }
    }
}
