using Explain.Api.Infrastructure.Geo;

namespace Explain.Api.Tests;

public class IpGeoParsingTests
{
    [Fact]
    public void IpInfo_maps_city_region_and_expands_the_country_code()
    {
        var r = IpGeoLookupService.ParseIpInfo("""{"ip":"81.2.69.142","city":"London","region":"England","country":"GB","loc":"51.5,-0.12","timezone":"Europe/London"}""");
        Assert.NotNull(r);
        Assert.Equal("London", r!.City);
        Assert.Equal("England", r.Region);
        Assert.Equal("United Kingdom", r.Country);
        Assert.Null(r.AccuracyKm);
    }

    [Fact]
    public void IpInfo_bogon_and_missing_fields_are_handled()
    {
        Assert.Null(IpGeoLookupService.ParseIpInfo("""{"ip":"10.0.0.1","bogon":true}"""));
        var r = IpGeoLookupService.ParseIpInfo("""{"ip":"1.2.3.4","country":"US"}""");
        Assert.Equal("United States", r!.Country);
        Assert.Null(r.City);   // no city -> the caller falls back to the local database
    }

    [Fact]
    public void Geoapify_maps_nested_objects()
    {
        var r = IpGeoLookupService.ParseGeoapify("""{"ip":"81.2.69.142","city":{"name":"Colchester"},"state":{"name":"England"},"country":{"name":"United Kingdom","iso_code":"GB"},"location":{"latitude":51.9,"longitude":0.9}}""");
        Assert.NotNull(r);
        Assert.Equal("Colchester", r!.City);
        Assert.Equal("England", r.Region);
        Assert.Equal("United Kingdom", r.Country);
    }

    [Fact]
    public void Geoapify_without_a_city_object_gives_no_city()
    {
        var r = IpGeoLookupService.ParseGeoapify("""{"ip":"1.2.3.4","country":{"name":"France"}}""");
        Assert.Equal("France", r!.Country);
        Assert.Null(r.City);
    }

    [Fact]
    public void Geoapify_keeps_the_bracketed_neighbourhood_in_the_city()
    {
        var r = IpGeoLookupService.ParseGeoapify("""{"city":{"name":"San Jose (Tasman and Zanker)"},"state":{"name":"California"},"country":{"name":"United States"}}""");
        Assert.Equal("San Jose (Tasman and Zanker)", r!.City);
        Assert.Equal("California", r.Region);
    }
}
