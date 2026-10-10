using System.Text.Json;
using Admin = Explain.Api.Features.Events.Admin.Endpoint;

namespace Explain.Api.Tests;

// The admin "Visitor funnel" card (2026-09-26). Real people = visits that fired an `interaction` event; everything else is a crawler.
public class VisitorFunnelTests
{
    private const string Mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";
    private const string LinuxDesktop = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
    private const string Android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";

    [Theory]
    [InlineData(LinuxDesktop, false, null, false, true)]    // Linux desktop that only loaded a page
    [InlineData(LinuxDesktop, false, null, true, false)]    // same, but it scrolled/clicked: a person
    [InlineData(Mac, true, null, false, true)]              // server network that only loaded a page
    [InlineData(Mac, true, null, true, false)]              // server network but engaged: could be someone on a work VPN
    [InlineData(Mac, false, null, false, false)]            // ordinary Mac, one page view and gone: not labelled
    [InlineData(Android, false, null, false, false)]        // Android is Linux, but it is a phone
    [InlineData("Mozilla/5.0 (compatible; Googlebot/2.1)", false, null, true, true)]   // names itself a robot
    [InlineData(LinuxDesktop, true, "a@b.co", false, false)] // signed in: never labelled
    public void Automated_label_is_a_cautious_guess(string ua, bool machineNetwork, string? email, bool engaged, bool expected) =>
        Assert.Equal(expected, Admin.LooksAutomated(ua, machineNetwork, email, engaged));

    private static Admin.FunnelEvent E(string session, string type, Dictionary<string, object>? meta = null, string? page = "/", string? ip = null)
        => new(session, type, page, meta, ip);

    private static Dictionary<string, object> M(params (string k, object v)[] kv) => kv.ToDictionary(x => x.k, x => x.v);

    private static List<Admin.FunnelEvent> SampleVisits() =>
    [
        // A crawler: loaded the page, nothing else.
        E("bot", "page_view", M(("src", "direct"), ("dev", "desktop"))),

        // A phone visitor from TikTok who scrolled to pricing and tapped Subscribe.
        E("phone", "page_view", M(("src", "tiktok"), ("dev", "mobile"))),
        E("phone", "interaction", M(("src", "tiktok"), ("dev", "mobile"))),
        E("phone", "section_view", M(("src", "tiktok"), ("dev", "mobile"), ("section", "pricing"))),
        E("phone", "cta_click", M(("src", "tiktok"), ("dev", "mobile"), ("label", "Subscribe — £4.99/month"), ("area", "pricing"), ("href", "candidate.theinterviewchair.com/subscription"), ("out", 1))),

        // A desktop visitor from LinkedIn who typed a role into "Try it live".
        E("desk", "page_view", M(("src", "linkedin"), ("dev", "desktop"))),
        E("desk", "interaction", M(("src", "linkedin"), ("dev", "desktop"))),
        E("desk", "try_submit", M(("src", "linkedin"), ("dev", "desktop"), ("topic", "Nurse"))),
        E("desk", "page_leave", M(("src", "linkedin"), ("dev", "desktop"), ("sec", 40L))),
    ];

    private static JsonElement Run(List<Admin.FunnelEvent> marketing, List<Admin.FunnelEvent>? tryEvents = null) =>
        JsonSerializer.SerializeToElement(Admin.BuildFunnel(7, marketing, tryEvents ?? []));

    private static int Step(JsonElement f, string key) =>
        f.GetProperty("steps").EnumerateArray().First(s => s.GetProperty("key").GetString() == key).GetProperty("sessions").GetInt32();

    [Fact]
    public void Steps_count_visits_real_people_pricing_tried_and_signup_clicks()
    {
        var f = Run(SampleVisits());
        Assert.Equal(3, Step(f, "visits"));   // bot + phone + desktop
        Assert.Equal(2, Step(f, "human"));    // the bot never interacted
        Assert.Equal(1, Step(f, "pricing"));
        Assert.Equal(1, Step(f, "tried"));
        Assert.Equal(1, Step(f, "signup"));
    }

    [Fact]
    public void Devices_sources_and_clicks_are_read_from_the_event_details()
    {
        var f = Run(SampleVisits());

        var mobile = f.GetProperty("devices").EnumerateArray().First(d => d.GetProperty("device").GetString() == "mobile");
        Assert.Equal(1, mobile.GetProperty("visits").GetInt32());
        Assert.Equal(1, mobile.GetProperty("real").GetInt32());

        var tiktok = f.GetProperty("sources").EnumerateArray().First(s => s.GetProperty("source").GetString() == "tiktok");
        Assert.Equal(1, tiktok.GetProperty("real").GetInt32());

        var click = f.GetProperty("topClicks").EnumerateArray().Single();
        Assert.Equal("Subscribe — £4.99/month", click.GetProperty("label").GetString());
        Assert.Equal("pricing", click.GetProperty("area").GetString());

        Assert.Equal(40, f.GetProperty("medianSecondsOnPage").GetDouble());
    }

    [Fact]
    public void Visits_from_an_ignored_address_are_left_out_entirely()
    {
        var events = SampleVisits();
        // The owner's own visit: one event carries the address, the rest of that visit must go too.
        events.Add(E("me", "page_view", M(("src", "direct"), ("dev", "desktop")), ip: "37.209.211.222"));
        events.Add(E("me", "interaction", M(("src", "direct"), ("dev", "desktop"))));
        events.Add(E("me", "section_view", M(("dev", "desktop"), ("section", "pricing"))));

        Assert.Equal(4, Step(Run(events), "visits"));     // before filtering: bot + phone + desktop + the owner's own visit
        var kept = Admin.DropSessionsFrom(events, ["37.209.211.222"]);

        Assert.DoesNotContain(kept, e => e.sessionId == "me");
        Assert.Equal(3, Step(Run(kept), "visits"));
        Assert.Equal(2, Step(Run(kept), "human"));
        Assert.Equal(1, Step(Run(kept), "pricing"));   // the owner's pricing view no longer counts
    }

    [Fact]
    public void Try_page_events_count_distinct_visits_and_split_out_phones()
    {
        var f = Run([], [
            E("a", "page_view", page: "/try"), E("a", "try_started", M(("mobile", false))), E("a", "try_first_question"), E("a", "try_completed", M(("mobile", false))),
            E("b", "page_view", page: "/try"), E("b", "try_mobile_visit"), E("b", "try_started", M(("mobile", true))), E("b", "try_completed", M(("mobile", true))),
            E("c", "page_view", page: "/try"), E("c", "try_blocked_mobile"),   // the old "desktop only" wall — still counted as a phone visit
        ]);
        var t = f.GetProperty("tryPage");
        Assert.Equal(3, t.GetProperty("visits").GetInt32());
        Assert.Equal(2, t.GetProperty("phoneVisits").GetInt32());
        Assert.Equal(2, t.GetProperty("started").GetInt32());
        Assert.Equal(1, t.GetProperty("startedOnPhone").GetInt32());
        Assert.Equal(2, t.GetProperty("completed").GetInt32());
        Assert.Equal(1, t.GetProperty("completedOnPhone").GetInt32());
    }

    [Fact]
    public void A_visit_that_says_bot_in_its_user_agent_is_a_robot_even_if_it_interacted()
    {
        var f = Run([
            new Admin.FunnelEvent("g", "page_view", "/", M(("src", "direct"), ("dev", "desktop")), null, null, "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"),
            new Admin.FunnelEvent("g", "interaction", "/", M(("src", "direct"), ("dev", "desktop")), null, null, "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"),
            new Admin.FunnelEvent("p", "page_view", "/", M(("src", "direct"), ("dev", "mobile")), null, null, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605.1.15 Mobile Safari"),
            new Admin.FunnelEvent("p", "interaction", "/", M(("src", "direct"), ("dev", "mobile")), null, null, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605.1.15 Mobile Safari"),
        ]);
        Assert.Equal(2, Step(f, "visits"));
        Assert.Equal(1, Step(f, "people"));
        Assert.Equal(1, Step(f, "human"));
    }

    [Fact]
    public void A_person_on_a_company_or_cloud_network_who_interacted_counts_as_a_person()
    {
        var events = new List<Admin.FunnelEvent>
        {
            new("r", "page_view", "/", M(("src", "linkedin"), ("dev", "desktop")), "20.1.2.3", null, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36"),
            new("r", "interaction", "/", M(("src", "linkedin"), ("dev", "desktop")), "20.1.2.3", null, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36"),
            new("r2", "page_view", "/", M(("src", "linkedin"), ("dev", "desktop")), "20.1.2.3", null, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36"),
        };
        // Every address belongs to a cloud network, which the old rule treated as a machine.
        var f = JsonSerializer.SerializeToElement(Admin.BuildFunnel(7, events, [], _ => new Explain.Api.Infrastructure.Geo.IpOwner(8075, "Microsoft", true)));
        Assert.Equal(2, Step(f, "visits"));
        Assert.Equal(2, Step(f, "people"));   // neither says bot: not thrown away
        Assert.Equal(1, Step(f, "human"));
    }

    [Fact]
    public void A_cloud_visit_that_loads_several_pages_without_any_interaction_is_a_robot()
    {
        const string chrome = "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36";
        var events = new List<Admin.FunnelEvent>();
        foreach (var page in new[] { "/", "/contact", "/about", "/imprint", "/impressum" })
            events.Add(new("scan", "page_view", page, M(("src", "direct"), ("dev", "desktop")), "3.120.1.2", null, chrome));
        // A person on the same sort of network who actually clicked is still counted.
        events.Add(new("person", "page_view", "/", M(("src", "linkedin"), ("dev", "desktop")), "3.120.1.2", null, chrome));
        events.Add(new("person", "interaction", "/", M(("src", "linkedin"), ("dev", "desktop")), "3.120.1.2", null, chrome));
        var f = JsonSerializer.SerializeToElement(Admin.BuildFunnel(7, events, [], _ => new Explain.Api.Infrastructure.Geo.IpOwner(16509, "Amazon", true)));
        Assert.Equal(2, Step(f, "visits"));
        Assert.Equal(1, Step(f, "people"));
        Assert.Equal(1, Step(f, "human"));
    }
}
