using System.Text.Json;
using System.Text.Json.Serialization;
using MediatR;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Anthropic;

namespace Explain.Api.Features.Talks.Score;

public class ScoreHandler(
    AnthropicService anthropic,
    ILogger<ScoreHandler> logger)
    : IRequestHandler<ScoreCommand, Result<ScoreResult>>
{
    public async Task<Result<ScoreResult>> Handle(ScoreCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Transcript))
            return Result<ScoreResult>.Failure("Transcript is required.");

        var wordCount = cmd.Transcript.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;

        logger.LogInformation("Scoring talk for subject '{Subject}' by user {UserId} ({Words} words, {Duration}s of {Target}s target)",
            cmd.Subject, cmd.UserId, wordCount, cmd.DurationSeconds, cmd.TargetDurationSeconds);

        RawScore raw;
        try
        {
            var json = await anthropic.CompleteAsync(BuildPrompt(cmd.Subject, cmd.Transcript, cmd.IsPersonalStory), maxTokens: 1500, ct: ct);
            raw = JsonSerializer.Deserialize<RawScore>(json, JsonOptions)
                  ?? throw new InvalidOperationException("Failed to deserialise scoring response");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Claude scoring failed for talk '{Subject}'", cmd.Subject);
            return Result<ScoreResult>.Failure("Failed to score your talk. Please try again.", 500);
        }

        var result = new ScoreResult(
            Subject:         cmd.Subject,
            Overall:         Clamp(raw.Overall),
            Grade:           Grade(raw.Overall),
            Clarity:         new DimensionScore(Clamp(raw.Clarity),    raw.ClarityDesc    ?? ""),
            Structure:       new DimensionScore(Clamp(raw.Structure),  raw.StructureDesc  ?? ""),
            Depth:           new DimensionScore(Clamp(raw.Depth),      raw.DepthDesc      ?? ""),
            Accuracy:        new DimensionScore(Clamp(raw.Accuracy),   raw.AccuracyDesc   ?? ""),
            Confidence:      new DimensionScore(Clamp(raw.Confidence), raw.ConfidenceDesc ?? ""),
            Engagement:      new DimensionScore(Clamp(raw.Engagement), raw.EngagementDesc ?? ""),
            TimeManagement:  ComputeTimeManagement(cmd.DurationSeconds, cmd.TargetDurationSeconds),
            OverallFeedback: raw.OverallFeedback ?? "",
            WordCount:       wordCount
        );

        return Result<ScoreResult>.Success(result);
    }

    // Time Management is a fact ("did you hit your target"), not a quality judgment — computed
    // locally rather than asking the AI, and kept separate from the six weighted dimensions above
    // rather than blended into Overall.
    private static DimensionScore ComputeTimeManagement(int actualSeconds, int targetSeconds)
    {
        if (targetSeconds <= 0) return new DimensionScore(100, "No target duration was set.");

        var deviation = Math.Abs(actualSeconds - targetSeconds) / (double)targetSeconds;
        var score = deviation <= 0.10 ? 100 : Math.Max(0, 100 - (int)Math.Round((deviation - 0.10) * 200));

        var diffSeconds = Math.Abs(actualSeconds - targetSeconds);
        var description = deviation <= 0.10
            ? $"Landed right on target ({FormatMmSs(actualSeconds)} of {FormatMmSs(targetSeconds)})."
            : actualSeconds > targetSeconds
                ? $"Ran {FormatMmSs(diffSeconds)} over your {FormatMmSs(targetSeconds)} target — worth tightening the middle section."
                : $"Finished {FormatMmSs(diffSeconds)} under your {FormatMmSs(targetSeconds)} target — there was room to develop a point or two further.";

        return new DimensionScore(score, description);
    }

    private static string FormatMmSs(int totalSeconds) => $"{totalSeconds / 60}:{totalSeconds % 60:D2}";

    private static string BuildPrompt(string subject, string transcript, bool isPersonalStory)
    {
        var framing = isPersonalStory
            ? "This is a PERSONAL/EXPERIENTIAL talk — the speaker is sharing something they lived through, not reciting facts. Weight accuracy toward internal consistency and authenticity rather than factual correctness, since there's no external truth to check a lived experience against."
            : "This is a FACTUAL/INFORMATIONAL talk — score accuracy against genuine subject-matter correctness.";

        return $@"You are an expert presentation coach and educator. Score this spoken talk on 6 dimensions.

TOPIC: {subject}
{framing}

TRANSCRIPT:
{transcript}

Return ONLY valid JSON (no markdown, no explanation):
{{
  ""overall"": <0-100 integer>,
  ""clarity"": <0-100>,
  ""clarityDesc"": ""one sentence specific to this transcript"",
  ""structure"": <0-100>,
  ""structureDesc"": ""one sentence specific to this transcript, on intro/body/conclusion flow"",
  ""depth"": <0-100>,
  ""depthDesc"": ""one sentence specific to this transcript"",
  ""accuracy"": <0-100>,
  ""accuracyDesc"": ""one sentence specific to this transcript"",
  ""confidence"": <0-100>,
  ""confidenceDesc"": ""one sentence specific to this transcript, on delivery/hedging/filler language visible in the transcript"",
  ""engagement"": <0-100>,
  ""engagementDesc"": ""one sentence on how likely this would hold a listener's attention"",
  ""overallFeedback"": ""2-3 sentence paragraph: what they did well, one concrete improvement, one motivating closing line""
}}

Scoring guide:
- overall: weighted average (clarity 20%, structure 20%, depth 20%, accuracy 15%, confidence 15%, engagement 10%)
- Be honest but constructive. A blank or off-topic response scores 0-20. A strong, well-delivered talk scores 85-100.
- Scores must be integers. Descriptions must be specific to THIS transcript, not generic.";
    }

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
        [JsonPropertyName("structure")]       public int Structure         { get; set; }
        [JsonPropertyName("structureDesc")]   public string? StructureDesc { get; set; }
        [JsonPropertyName("depth")]           public int Depth           { get; set; }
        [JsonPropertyName("depthDesc")]       public string? DepthDesc   { get; set; }
        [JsonPropertyName("accuracy")]        public int Accuracy        { get; set; }
        [JsonPropertyName("accuracyDesc")]    public string? AccuracyDesc { get; set; }
        [JsonPropertyName("confidence")]      public int Confidence       { get; set; }
        [JsonPropertyName("confidenceDesc")]  public string? ConfidenceDesc { get; set; }
        [JsonPropertyName("engagement")]      public int Engagement       { get; set; }
        [JsonPropertyName("engagementDesc")]  public string? EngagementDesc { get; set; }
        [JsonPropertyName("overallFeedback")] public string? OverallFeedback { get; set; }
    }
}
