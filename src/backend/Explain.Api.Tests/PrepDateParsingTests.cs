using Newtonsoft.Json.Linq;
using Explain.Api.Features.Entitlements;

namespace Explain.Api.Tests;

// Regression for the 2026-09-21 bug where every recruiter-prep lookup threw "Invalid cast from DateTime to DateTimeOffset" and so
// silently meant "no prep access".
public class PrepDateParsingTests
{
    private const string Doc = """{"id":"p1","interviewDate":"2026-09-25T14:30:00+00:00","createdAt":"2026-09-21T09:15:30.123+00:00"}""";

    [Fact]
    public void The_old_call_really_did_throw_on_a_parsed_document()
    {
        var d = JObject.Parse(Doc);   // Newtonsoft parses ISO strings into DateTime tokens by default
        Assert.ThrowsAny<Exception>(() => d["interviewDate"]!.Value<DateTimeOffset>());
    }

    [Fact]
    public void ToOffset_reads_the_dates_correctly()
    {
        var d = JObject.Parse(Doc);
        Assert.Equal(new DateTimeOffset(2026, 9, 25, 14, 30, 0, TimeSpan.Zero).UtcDateTime, EntitlementService.ToOffset(d["interviewDate"]).UtcDateTime);
        Assert.Equal(2026, EntitlementService.ToOffset(d["createdAt"]).Year);
    }

    [Fact]
    public void Missing_or_null_dates_give_MinValue_not_an_exception()
    {
        var d = JObject.Parse("""{"interviewDate":null}""");
        Assert.Equal(DateTimeOffset.MinValue, EntitlementService.ToOffset(d["interviewDate"]));
        Assert.Equal(DateTimeOffset.MinValue, EntitlementService.ToOffset(d["nope"]));
    }
}
