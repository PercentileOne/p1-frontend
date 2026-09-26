using System.Text.Json;
using Admin = Explain.Api.Features.Events.Admin.Endpoint;

namespace Explain.Api.Tests;

// The admin "Visitor funnel" card (2026-09-26). Real people = visits that fired an `interaction` event; everything else is a crawler.
public class VisitorFunnelTests
{
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
}
