using Newtonsoft.Json;

namespace Explain.Api.Domain.Search;

public class SearchEvent
{
    [JsonProperty("id")]
    public string Id { get; init; } = Guid.NewGuid().ToString();

    [JsonProperty("pk")]
    public string Pk { get; init; } = "search";

    [JsonProperty("userId")]
    public string UserId { get; init; } = string.Empty;

    [JsonProperty("subject")]
    public string Subject { get; init; } = string.Empty;

    [JsonProperty("category")]
    public string? Category { get; init; }

    [JsonProperty("searchedAt")]
    public string SearchedAt { get; init; } = DateTime.UtcNow.ToString("O");
}
