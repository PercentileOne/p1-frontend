using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TalkToLearn.Api.Infrastructure.Anthropic;

public class AnthropicService(IConfiguration config, ILogger<AnthropicService> logger)
{
    private readonly string _apiKey    = config["Anthropic:ApiKey"]!;
    private readonly string _model     = config["Anthropic:Model"] ?? "claude-haiku-4-5-20251001";
    private readonly int    _maxTokens = int.Parse(config["Anthropic:MaxTokens"] ?? "8000");

    public async Task<string> CompleteAsync(string prompt, int? maxTokens = null, CancellationToken ct = default)
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("x-api-key", _apiKey);
        client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var body = JsonSerializer.Serialize(new
        {
            model      = _model,
            max_tokens = maxTokens ?? _maxTokens,
            messages   = new[] { new { role = "user", content = prompt } }
        });

        logger.LogInformation("Calling Anthropic model {Model} with {Tokens} max tokens", _model, maxTokens ?? _maxTokens);

        var response = await client.PostAsync(
            "https://api.anthropic.com/v1/messages",
            new StringContent(body, Encoding.UTF8, "application/json"),
            ct);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Anthropic API error {Status}: {Error}", response.StatusCode, err);
            throw new HttpRequestException($"Anthropic API error {response.StatusCode}: {err}");
        }

        var json = await response.Content.ReadAsStringAsync(ct);
        var result = JsonSerializer.Deserialize<AnthropicResponse>(json);
        var text = result?.Content?[0]?.Text ?? throw new InvalidOperationException("Empty response from Anthropic");

        // Strip markdown code fences if model wraps response in them
        return text.Replace("```json", "").Replace("```", "").Trim();
    }
}

// ── Response shape ────────────────────────────────────────────────────────────

file class AnthropicResponse
{
    [JsonPropertyName("content")] public List<AnthropicContent>? Content { get; set; }
}

file class AnthropicContent
{
    [JsonPropertyName("text")] public string? Text { get; set; }
}
