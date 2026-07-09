using System.Text.Json;
using System.Text.Json.Serialization;
using MediatR;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Infrastructure.Anthropic;

namespace TalkToLearn.Api.Features.Lessons.ExpandConcept;

public class ExpandConceptHandler(
    AnthropicService anthropic,
    ILogger<ExpandConceptHandler> logger)
    : IRequestHandler<ExpandConceptQuery, Result<ExpansionDto>>
{
    public async Task<Result<ExpansionDto>> Handle(ExpandConceptQuery query, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(query.Subject) || string.IsNullOrWhiteSpace(query.ConceptTitle))
            return Result<ExpansionDto>.Failure("Subject and concept title are required.");

        logger.LogInformation("Expanding concept '{Concept}' within subject '{Subject}'",
            query.ConceptTitle, query.Subject);

        try
        {
            var json = await anthropic.CompleteAsync(BuildPrompt(query), maxTokens: 3000, ct: ct);
            var raw  = JsonSerializer.Deserialize<RawExpansion>(json, JsonOptions)
                       ?? throw new InvalidOperationException("Failed to deserialise expansion");

            var expansion = new ExpansionDto(
                Headline:        raw.Headline ?? "",
                Explanation:     raw.Explanation ?? "",
                Analogy:         raw.Analogy ?? "",
                AdvancedInsight: raw.AdvancedInsight ?? "",
                CodeSnippet:     raw.CodeSnippet,
                PracticalSteps:  raw.PracticalSteps ?? [],
                CommonQuestions: raw.CommonQuestions?.Select(q => new CommonQuestionDto(q.Q ?? "", q.A ?? ""))
                                     .ToList() ?? []
            );

            logger.LogInformation("Concept '{Concept}' expanded successfully", query.ConceptTitle);
            return Result<ExpansionDto>.Success(expansion);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to expand concept '{Concept}'", query.ConceptTitle);
            return Result<ExpansionDto>.Failure("Failed to expand concept. Please try again.", 500);
        }
    }

    private static string BuildPrompt(ExpandConceptQuery q) => $@"You are a world-class tutor. A student is studying ""{q.Subject}"" and wants to go much deeper on the concept: ""{q.ConceptTitle}"".

Current understanding: ""{q.ConceptBody}""

Give them a genuinely rich, expert-level expansion. Return ONLY valid JSON (no markdown):

{{
  ""headline"": ""one punchy sentence that reframes this concept at a deeper level"",
  ""explanation"": ""3-4 paragraph expert explanation — use precise language, real mechanisms, not just analogies. Explain WHY it works, not just WHAT it is."",
  ""analogy"": ""one vivid, memorable analogy that makes the deep mechanism click"",
  ""advancedInsight"": ""one surprising or non-obvious insight that even intermediate learners miss"",
  ""codeSnippet"": ""if technical/programming, a complete working code example (10-25 lines). Use plain string with \\n for newlines. null if not applicable."",
  ""practicalSteps"": [""concrete action or application step"", ""another step"", ""another step""],
  ""commonQuestions"": [
    {{ ""q"": ""question a curious student would ask"", ""a"": ""clear expert answer"" }},
    {{ ""q"": ""another question"", ""a"": ""answer"" }},
    {{ ""q"": ""another question"", ""a"": ""answer"" }}
  ]
}}";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private class RawExpansion
    {
        [JsonPropertyName("headline")]        public string? Headline        { get; set; }
        [JsonPropertyName("explanation")]     public string? Explanation     { get; set; }
        [JsonPropertyName("analogy")]         public string? Analogy         { get; set; }
        [JsonPropertyName("advancedInsight")] public string? AdvancedInsight { get; set; }
        [JsonPropertyName("codeSnippet")]     public string? CodeSnippet     { get; set; }
        [JsonPropertyName("practicalSteps")]  public List<string>? PracticalSteps  { get; set; }
        [JsonPropertyName("commonQuestions")] public List<RawQuestion>? CommonQuestions { get; set; }
    }

    private class RawQuestion
    {
        [JsonPropertyName("q")] public string? Q { get; set; }
        [JsonPropertyName("a")] public string? A { get; set; }
    }
}
