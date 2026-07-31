using System.Text.Json;
using System.Text.Json.Serialization;
using MediatR;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Anthropic;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Lessons.Generate;

public class GenerateLessonHandler(
    AnthropicService anthropic,
    CosmosService cosmos,
    ILogger<GenerateLessonHandler> logger)
    : IRequestHandler<GenerateLessonCommand, Result<LessonDto>>
{
    public async Task<Result<LessonDto>> Handle(GenerateLessonCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Subject))
            return Result<LessonDto>.Failure("Subject is required.");

        var pk = cmd.Subject.Trim().ToLowerInvariant();

        // Check shared lesson cache in Cosmos before calling Anthropic
        var container = cosmos.GetContainer("lessons");
        try
        {
            var cached = await container.ReadItemAsync<CachedLesson>(pk, new PartitionKey(pk), cancellationToken: ct);
            logger.LogInformation("Lesson cache HIT for '{Subject}'", cmd.Subject);
            return Result<LessonDto>.Success(cached.Resource.Lesson);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Cache miss — generate below
        }

        logger.LogInformation("Generating lesson for subject '{Subject}' requested by user {UserId}",
            cmd.Subject, cmd.UserId);

        try
        {
            var json = await anthropic.CompleteAsync(BuildPrompt(cmd.Subject), maxTokens: 8000, ct: ct);
            var raw  = JsonSerializer.Deserialize<RawLesson>(json, JsonOptions)
                       ?? throw new InvalidOperationException("Failed to deserialise lesson");

            var lesson = new LessonDto(
                Title:          raw.Title ?? cmd.Subject,
                Subject:        cmd.Subject,
                Category:       raw.Category ?? "General",
                Emoji:          raw.Emoji ?? "📚",
                Hook:           raw.Hook ?? "",
                KeyConcepts:    raw.KeyConcepts?.Select(k => new KeyConceptDto(
                                    k.Icon ?? "💡", k.Title ?? "", k.Body ?? "",
                                    k.DeepDive ?? "", k.Example ?? "",
                                    k.CodeSnippet, k.MemoryHook ?? "", k.ExamTrap ?? ""))
                                    .ToList() ?? [],
                Misconceptions: raw.Misconceptions?.Select(m => new MisconceptionDto(m.Wrong ?? "", m.Right ?? ""))
                                    .ToList() ?? [],
                Glossary:       raw.Glossary?.Select(g => new GlossaryItemDto(g.Term ?? "", g.Def ?? ""))
                                    .ToList() ?? [],
                ExamQuestions:  raw.ExamQuestions ?? [],
                ExamAnswers:    raw.ExamAnswers   ?? [],
                McQuestions:    raw.McQuestions?.Select(q => new MCQuestionDto(
                                    q.Q ?? "", q.Options ?? [], q.Answer))
                                    .ToList() ?? []
            );

            logger.LogInformation("Lesson generated successfully for '{Subject}' — {Concepts} concepts",
                cmd.Subject, lesson.KeyConcepts.Count);

            // Write to shared cache — fire-and-forget; never block the response
            _ = container.UpsertItemAsync(
                new CachedLesson(pk, pk, lesson),
                new PartitionKey(pk)
            ).ContinueWith(t =>
            {
                if (t.IsFaulted)
                    logger.LogWarning(t.Exception, "Failed to cache lesson for '{Subject}'", cmd.Subject);
            }, TaskContinuationOptions.OnlyOnFaulted);

            return Result<LessonDto>.Success(lesson);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate lesson for '{Subject}'", cmd.Subject);
            return Result<LessonDto>.Failure("Failed to generate lesson. Please try again.", 500);
        }
    }

    private record CachedLesson(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("pk")] string Pk,
        [property: JsonPropertyName("lesson")] LessonDto Lesson
    );

    private static string BuildPrompt(string subject) => $@"You are an expert educator. Generate a complete, high-quality study lesson for: ""{subject}""

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation, just JSON):

{{
  ""title"": ""clean title for this subject"",
  ""category"": ""one of: Technology, Mathematics, Science, Business, History, Language, Sport, Social Sciences"",
  ""emoji"": ""single relevant emoji"",
  ""hook"": ""one punchy sentence explaining why mastering this matters"",
  ""keyConcepts"": [
    {{
      ""icon"": ""emoji"",
      ""title"": ""concept name"",
      ""body"": ""2-sentence overview a beginner can grasp immediately"",
      ""deepDive"": ""2-3 sentence explanation with a real analogy. Be concise but insightful."",
      ""example"": ""specific real-world scenario that makes this concrete"",
      ""codeSnippet"": ""if technical/programming, a short illustrative code example (5-15 lines max). Use plain string with \\n for newlines. null if not applicable."",
      ""memoryHook"": ""memorable phrase or analogy to make this stick forever"",
      ""examTrap"": ""the exact misconception that trips people up in tests""
    }}
  ],
  ""misconceptions"": [{{ ""wrong"": ""common wrong belief"", ""right"": ""the truth, clearly stated"" }}],
  ""glossary"": [{{ ""term"": ""key term"", ""def"": ""plain-English definition"" }}],
  ""examQuestions"": [""Explain X in your own words and give an example.""],
  ""examAnswers"": [""Model answer: A clear 2-3 sentence spoken response the learner should aim to match.""],
  ""mcQuestions"": [{{ ""q"": ""question text"", ""options"": [""A"", ""B"", ""C"", ""D""], ""answer"": 0 }}]
}}

Rules:
- keyConcepts: 4-5 concepts
- misconceptions: 5-6 items
- glossary: 10-12 terms
- examQuestions: exactly 12 spoken questions tailored to THIS subject (these are answered out loud)
- examAnswers: exactly 12 model answers, one per question — 2-3 sentences each, written as what a good spoken answer sounds like
- mcQuestions: exactly 10 questions, varied difficulty, answer is the INDEX (0-3) of correct option
- All content must be accurate, educational, and specific to ""{subject}""";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    // ── Raw deserialisation shapes (snake_case from Claude) ───────────────────

    private class RawLesson
    {
        [JsonPropertyName("title")]          public string? Title          { get; set; }
        [JsonPropertyName("category")]       public string? Category       { get; set; }
        [JsonPropertyName("emoji")]          public string? Emoji          { get; set; }
        [JsonPropertyName("hook")]           public string? Hook           { get; set; }
        [JsonPropertyName("keyConcepts")]    public List<RawConcept>? KeyConcepts    { get; set; }
        [JsonPropertyName("misconceptions")] public List<RawMisconception>? Misconceptions { get; set; }
        [JsonPropertyName("glossary")]       public List<RawGlossary>? Glossary      { get; set; }
        [JsonPropertyName("examQuestions")]  public List<string>? ExamQuestions  { get; set; }
        [JsonPropertyName("examAnswers")]    public List<string>? ExamAnswers    { get; set; }
        [JsonPropertyName("mcQuestions")]    public List<RawMCQuestion>? McQuestions   { get; set; }
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

    private class RawMisconception
    {
        [JsonPropertyName("wrong")] public string? Wrong { get; set; }
        [JsonPropertyName("right")] public string? Right { get; set; }
    }

    private class RawGlossary
    {
        [JsonPropertyName("term")] public string? Term { get; set; }
        [JsonPropertyName("def")]  public string? Def  { get; set; }
    }

    private class RawMCQuestion
    {
        [JsonPropertyName("q")]       public string? Q       { get; set; }
        [JsonPropertyName("options")] public List<string>? Options { get; set; }
        [JsonPropertyName("answer")]  public int Answer      { get; set; }
    }
}
