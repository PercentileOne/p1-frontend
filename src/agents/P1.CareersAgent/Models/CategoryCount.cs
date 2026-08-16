using System.Text.Json.Serialization;

namespace P1.CareersAgent.Models;

public class CategoryCount
{
    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("count")]
    public int Count { get; set; }
}
