using System.Text.Json;
using Newtonsoft.Json;
using EventsEndpoint = Explain.Api.Features.Events.Endpoint;

namespace Explain.Api.Tests;

// Regression test for the "{ "ValueKind": 3 }" bug (2026-09-26): event details arrive from System.Text.Json as JsonElement values, and
// the Cosmos SDK (Newtonsoft) stored each one as its internal shape instead of the real value — so the admin Activity Log and the
// visitor funnel could not read a single source, device, click or section. The endpoint now converts them first.
public class EventMetadataTests
{
    private static Dictionary<string, object>? Incoming(string json) => System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(json);

    [Fact]
    public void Details_are_stored_as_real_values_not_JsonElement_internals()
    {
        var incoming = Incoming("""{"src":"tiktok","dev":"mobile","w":390,"pct":25,"out":true,"nested":{"a":"b"},"list":[1,"x"],"none":null}""");

        // What the Cosmos SDK would write for the raw, un-normalised details — this is the bug:
        Assert.Contains("ValueKind", JsonConvert.SerializeObject(incoming));

        var stored = JsonConvert.SerializeObject(EventsEndpoint.NormaliseMetadata(incoming, 4000));
        Assert.DoesNotContain("ValueKind", stored);
        Assert.Contains("\"src\":\"tiktok\"", stored);
        Assert.Contains("\"dev\":\"mobile\"", stored);
        Assert.Contains("\"w\":390,", stored);   // a whole number stays whole (not 390.0)
        Assert.Contains("\"out\":true", stored);
        Assert.Contains("\"nested\":{\"a\":\"b\"}", stored);
        Assert.Contains("\"list\":[1,\"x\"]", stored);
    }

    [Fact]
    public void Oversized_details_are_dropped_and_empty_details_pass_through()
    {
        Assert.Null(EventsEndpoint.NormaliseMetadata(Incoming("{\"big\":\"" + new string('x', 5000) + "\"}"), 4000));
        Assert.Null(EventsEndpoint.NormaliseMetadata(null, 4000));
        Assert.Empty(EventsEndpoint.NormaliseMetadata(new Dictionary<string, object>(), 4000)!);
    }
}
