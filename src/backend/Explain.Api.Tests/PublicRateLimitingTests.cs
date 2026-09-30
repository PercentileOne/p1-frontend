using System.Net;
using System.Threading.RateLimiting;
using Explain.Api.Infrastructure.RateLimiting;
using Microsoft.AspNetCore.Http;

namespace Explain.Api.Tests;

public class PublicRateLimitingTests
{
    private static DefaultHttpContext Request(string path, string ip)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Path = path;
        ctx.Connection.RemoteIpAddress = IPAddress.Parse(ip);
        return ctx;
    }

    [Theory]
    [InlineData("/api/tryout/start", "tryout:203.0.113.5")]
    [InlineData("/api/tryout/country", "tryout:203.0.113.5")]
    [InlineData("/api/events", "events:203.0.113.5")]
    public void Public_endpoints_are_limited_per_visitor_address(string path, string expectedKey) =>
        Assert.Equal(expectedKey, PublicRateLimiting.Partition(Request(path, "203.0.113.5")).PartitionKey);

    [Fact]
    public void Different_visitors_get_separate_allowances() =>
        Assert.NotEqual(
            PublicRateLimiting.Partition(Request("/api/tryout/start", "203.0.113.5")).PartitionKey,
            PublicRateLimiting.Partition(Request("/api/tryout/start", "203.0.113.6")).PartitionKey);

    [Theory]
    [InlineData("/auth/login")]
    [InlineData("/api/interviews/me")]
    [InlineData("/interviews/avatar-audio")]
    [InlineData("/api/platform-settings/avatar-provider")]
    public void Every_other_route_is_never_limited(string path) =>
        Assert.Equal("unlimited", PublicRateLimiting.Partition(Request(path, "203.0.113.5")).PartitionKey);

    [Fact]
    public void A_burst_past_the_limit_is_refused_but_another_visitor_is_unaffected()
    {
        using var limiter = PartitionedRateLimiter.Create<HttpContext, string>(PublicRateLimiting.Partition);
        var bot = Request("/api/tryout/start", "198.51.100.7");

        for (var i = 0; i < PublicRateLimiting.TryOutPerMinute; i++)
        {
            using var lease = limiter.AttemptAcquire(bot);
            Assert.True(lease.IsAcquired, $"request {i + 1} should be allowed");
        }
        using (var refused = limiter.AttemptAcquire(bot))
            Assert.False(refused.IsAcquired);                                      // the 41st in the same minute

        using var someoneElse = limiter.AttemptAcquire(Request("/api/tryout/start", "198.51.100.8"));
        Assert.True(someoneElse.IsAcquired);                                        // a different visitor still gets through
    }
}
