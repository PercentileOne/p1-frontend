using System.Text.Json;
using System.Text.Json.Serialization;
using MediatR;
using Microsoft.Azure.Cosmos;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Infrastructure.Anthropic;
using TalkToLearn.Api.Infrastructure.Cosmos;

namespace TalkToLearn.Api.Features.Lessons.Score;

public class ScoreHandler(
    AnthropicService anthropic,
    CosmosService cosmos,
    ILogger<ScoreHandler> logger)
    : IRequestHandler<ScoreCommand, Result<ScoreResult>>
{
    public async Task<Result<ScoreResult>> Handle(ScoreCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Transcript))
            return Result<ScoreResult>.Failure("Transcript is required.");

        logger.LogInformation("Scoring talk for subject '{Subject}' by user {UserId} ({Words} words)",
            cmd.Subject, cmd.UserId,
            cmd.Transcript.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).Length);

        RawScore raw;
        try
        {
            var json = await anthropic.CompleteAsync(BuildPrompt(cmd.Subject, cmd.Transcript), maxTokens: 1500, ct: ct);
            raw = JsonSerializer.Deserialize<RawScore>(json, JsonOptions)
                  ?? throw new InvalidOperationException("Failed to deserialise scoring response");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Claude scoring failed for '{Subject}'", cmd.Subject);
            return Result<ScoreResult>.Failure("Failed to score your talk. Please try again.", 500);
        }

        var wordCount = cmd.Transcript.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;

        var result = new ScoreResult(
            Subject:         cmd.Subject,
            Overall:         Clamp(raw.Overall),
            Grade:           Grade(raw.Overall),
            Clarity:         new DimensionScore(Clamp(raw.Clarity),    raw.ClarityDesc    ?? ""),
            Depth:           new DimensionScore(Clamp(raw.Depth),      raw.DepthDesc      ?? ""),
            Accuracy:        new DimensionScore(Clamp(raw.Accuracy),   raw.AccuracyDesc   ?? ""),
            Structure:       new DimensionScore(Clamp(raw.Structure),  raw.StructureDesc  ?? ""),
            Confidence:      new DimensionScore(Clamp(raw.Confidence), raw.ConfidenceDesc ?? ""),
            OverallFeedback: raw.OverallFeedback ?? "",
            WordCount:       wordCount
        );

        // Persist to lessonHistory — fire-and-forget; never block the user's results
        _ = PersistAsync(cmd, result, wordCount);

        return Result<ScoreResult>.Success(result);
    }

    private async Task PersistAsync(ScoreCommand cmd, ScoreResult result, int wordCount)
    {
        try
        {
            var container = cosmos.GetContainer("lessonHistory");
            var entry = new HistoryEntry(
                Id:              Guid.NewGuid().ToString(),
                UserId:          cmd.UserId,
                Subject:         cmd.Subject,
                Transcript:      cmd.Transcript,
                DurationSeconds: cmd.DurationSeconds,
                WordCount:       wordCount,
                Overall:         result.Overall,
                Clarity:         result.Clarity.Score,
                Depth:           result.Depth.Score,
                Accuracy:        result.Accuracy.Score,
                Structure:       result.Structure.Score,
                Confidence:      result.Confidence.Score,
                OverallFeedback: result.OverallFeedback,
                RecordedAt:      DateTime.UtcNow.ToString("O")
            );
            await container.CreateItemAsync(entry, new PartitionKey(cmd.UserId));
            logger.LogInformation("Saved lesson history for user {UserId}, subject '{Subject}'",
                cmd.UserId, cmd.Subject);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to save lesson history for user {UserId}", cmd.UserId);
        }
    }

    private static string BuildPrompt(string subject, string transcript) => $@"You are an expert education assessor. Score this spoken explanation on 5 dimensions.

TOPIC: {subject}

TRANSCRIPT:
{transcript}

Return ONLY valid JSON (no markdown, no explanation):
{{
  ""overall"": <0-100 integer>,
  ""clarity"": <0-100>,
  ""clarityDesc"": ""one sentence specific to this transcript"",
  ""depth"": <0-100>,
  ""depthDesc"": ""one sentence specific to this transcript"",
  ""accuracy"": <0-100>,
  ""accuracyDesc"": ""one sentence specific to this transcript"",
  ""structure"": <0-100>,
  ""structureDesc"": ""one sentence specific to this transcript"",
  ""confidence"": <0-100>,
  ""confidenceDesc"": ""one sentence specific to this transcript"",
  ""overallFeedback"": ""2-3 sentence paragraph: what they did well, one concrete improvement, one motivating closing line""
}}

Scoring guide:
- overall: weighted average (clarity 25%, depth 25%, accuracy 25%, structure 15%, confidence 10%)
- Be honest but constructive. A blank or off-topic response scores 0-20. A strong expert response scores 85-100.
- Scores must be integers. Descriptions must be specific to THIS transcript, not generic.";

    private static int Clamp(int v) => Math.Max(0, Math.Min(100, v));

    private static string Grade(int overall) =>
        overall >= 90 ? "Outstanding" :
        overall >= 80 ? "Excellent"   :
        overall >= 70 ? "Good"        :
        overall >= 60 ? "Developing"  : "Keep Practising";

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private class RawScore
    {
        [JsonPropertyName("overall")]         public int Overall         { get; set; }
        [JsonPropertyName("clarity")]         public int Clarity         { get; set; }
        [JsonPropertyName("clarityDesc")]     public string? ClarityDesc { get; set; }
        [JsonPropertyName("depth")]           public int Depth           { get; set; }
        [JsonPropertyName("depthDesc")]       public string? DepthDesc   { get; set; }
        [JsonPropertyName("accuracy")]        public int Accuracy        { get; set; }
        [JsonPropertyName("accuracyDesc")]    public string? AccuracyDesc { get; set; }
        [JsonPropertyName("structure")]       public int Structure        { get; set; }
        [JsonPropertyName("structureDesc")]   public string? StructureDesc { get; set; }
        [JsonPropertyName("confidence")]      public int Confidence       { get; set; }
        [JsonPropertyName("confidenceDesc")]  public string? ConfidenceDesc { get; set; }
        [JsonPropertyName("overallFeedback")] public string? OverallFeedback { get; set; }
    }

    private record HistoryEntry(
        [property: JsonPropertyName("id")]              string Id,
        [property: JsonPropertyName("userId")]          string UserId,
        [property: JsonPropertyName("subject")]         string Subject,
        [property: JsonPropertyName("transcript")]      string Transcript,
        [property: JsonPropertyName("durationSeconds")] int    DurationSeconds,
        [property: JsonPropertyName("wordCount")]       int    WordCount,
        [property: JsonPropertyName("overall")]         int    Overall,
        [property: JsonPropertyName("clarity")]         int    Clarity,
        [property: JsonPropertyName("depth")]           int    Depth,
        [property: JsonPropertyName("accuracy")]        int    Accuracy,
        [property: JsonPropertyName("structure")]       int    Structure,
        [property: JsonPropertyName("confidence")]      int    Confidence,
        [property: JsonPropertyName("overallFeedback")] string OverallFeedback,
        [property: JsonPropertyName("recordedAt")]      string RecordedAt
    );
}
