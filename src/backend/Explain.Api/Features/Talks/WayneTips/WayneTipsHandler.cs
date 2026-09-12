using System.Text.Json;
using System.Text.Json.Serialization;
using MediatR;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Anthropic;

namespace Explain.Api.Features.Talks.WayneTips;

public class WayneTipsHandler(
    AnthropicService anthropic,
    ILogger<WayneTipsHandler> logger)
    : IRequestHandler<WayneTipsCommand, Result<WayneTipsDto>>
{
    public async Task<Result<WayneTipsDto>> Handle(WayneTipsCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Subject))
            return Result<WayneTipsDto>.Failure("Subject is required.");

        try
        {
            var json = await anthropic.CompleteAsync(BuildPrompt(cmd.Subject, cmd.IsPersonalStory), maxTokens: 500, ct: ct);
            var raw  = JsonSerializer.Deserialize<RawTips>(json, JsonOptions)
                       ?? throw new InvalidOperationException("Failed to deserialise Wayne tips response");

            return Result<WayneTipsDto>.Success(new WayneTipsDto(raw.Tips ?? []));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Wayne tips generation failed for '{Subject}'", cmd.Subject);
            return Result<WayneTipsDto>.Failure("Failed to generate tips. Please try again.", 500);
        }
    }

    private static string BuildPrompt(string subject, bool isPersonalStory)
    {
        var angle = isPersonalStory
            ? "This is a PERSONAL/EXPERIENTIAL talk — the speaker will share something they lived through, not recite facts. Give STORYTELLING-STRUCTURE tips: how to open, how to land the emotional point, how to pace it. Do NOT ask for subject-matter facts, since there aren't any to give."
            : "This is a FACTUAL/INFORMATIONAL talk. Give real, accurate, subject-specific tips — the 3-4 things most worth knowing or mentioning about this exact topic.";

        return $@"You are Wayne, a warm but sharp subject-matter expert about to briefly brief a student before they give a short talk.

TOPIC: {subject}
{angle}

Return ONLY valid JSON (no markdown, no explanation):
{{
  ""tips"": [""short spoken-friendly tip 1"", ""short spoken-friendly tip 2"", ""short spoken-friendly tip 3""]
}}

Rules:
- Exactly 3 tips, sometimes 4 if genuinely warranted — never more.
- STRICT total length: all tips combined must be sayable aloud in under 20 seconds — roughly 45-55 words total across all tips combined. This is a hard technical limit, not a style preference.
- Each tip is one short spoken sentence, no sub-clauses, as if Wayne is actually saying it out loud.
- No preamble, no ""firstly/secondly"" — just the tips themselves.";
    }

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private class RawTips
    {
        [JsonPropertyName("tips")] public List<string>? Tips { get; set; }
    }
}
