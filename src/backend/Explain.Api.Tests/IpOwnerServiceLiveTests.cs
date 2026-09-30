using Explain.Api.Infrastructure.Geo;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Explain.Api.Tests;

/// <summary>
/// Live check of IpOwnerService against the real public ip2asn database (needs internet, ~1 minute, so it is skipped in normal runs).
/// To run it: remove the Skip text below and `dotnet test --filter IpOwnerServiceLiveTests`. The addresses are real visits from
/// the 2026-09-29 admin funnel review, whose owners were looked up by hand first.
/// </summary>
public class IpOwnerServiceLiveTests
{
    private const string SkipReason = "Live network test (downloads the ip2asn database) — remove Skip to run manually";

    [Theory(Skip = SkipReason)]
    [InlineData("66.249.79.1", true)]      // Googlebot (Google LLC)
    [InlineData("104.197.69.115", true)]   // Google Cloud, Council Bluffs
    [InlineData("72.152.84.15", true)]     // Microsoft, Des Moines
    [InlineData("69.63.189.112", true)]    // Facebook link-preview crawler
    [InlineData("202.8.42.156", true)]     // Ahrefs
    [InlineData("54.221.9.38", true)]      // Amazon
    [InlineData("66.146.233.39", true)]    // Sprious LLC (hosting), San Francisco
    [InlineData("31.94.56.166", false)]    // BT / EE, London
    [InlineData("49.37.43.48", false)]     // Reliance Jio, India
    [InlineData("182.180.189.17", false)]  // PTCL, Karachi
    [InlineData("143.105.174.104", false)] // Starlink, Lagos
    [InlineData("172.59.191.180", false)]  // T-Mobile USA, a real US phone
    public async Task Classifies_real_visit_addresses(string ip, bool machine)
    {
        var svc = new IpOwnerService(NullLogger<IpOwnerService>.Instance);
        var lookup = await svc.GetResolverAsync();
        var owner = lookup(ip);
        Assert.NotNull(owner);
        Assert.Equal(machine, owner!.IsMachine);
    }

    [Fact(Skip = SkipReason)]
    public async Task Unparseable_or_missing_addresses_give_no_owner_and_never_throw()
    {
        var svc = new IpOwnerService(NullLogger<IpOwnerService>.Instance);
        // No network access is needed for this: whether or not the database loads, junk input must be a quiet null.
        var lookup = await svc.GetResolverAsync();
        Assert.Null(lookup(null));
        Assert.Null(lookup(""));
        Assert.Null(lookup("not-an-ip"));
    }
}
