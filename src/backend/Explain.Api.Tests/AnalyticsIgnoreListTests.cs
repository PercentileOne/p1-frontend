using Explain.Api.Features.Events;

namespace Explain.Api.Tests;

public class AnalyticsIgnoreListTests
{
    private sealed class Clock { public DateTime Now = new(2026, 9, 30, 12, 0, 0, DateTimeKind.Utc); }

    private static (AnalyticsIgnoreList list, Clock clock, Func<int> loads) Make(Func<int, HashSet<string>> loader)
    {
        var clock = new Clock();
        var loads = 0;
        var list = new AnalyticsIgnoreList(() => { loads++; return Task.FromResult(loader(loads)); }, () => clock.Now);
        return (list, clock, () => loads);
    }

    [Fact]
    public async Task Listed_addresses_are_ignored_and_others_are_not()
    {
        var (list, _, _) = Make(_ => ["82.30.109.114"]);
        Assert.True(await list.IsIgnoredAsync("82.30.109.114"));
        Assert.False(await list.IsIgnoredAsync("203.0.113.9"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task A_missing_address_is_never_ignored(string? ip)
    {
        var (list, _, loads) = Make(_ => ["82.30.109.114"]);
        Assert.False(await list.IsIgnoredAsync(ip));
        Assert.Equal(0, loads());                      // and it doesn't even touch the database
    }

    [Fact]
    public async Task The_list_is_cached_so_each_event_does_not_hit_the_database()
    {
        var (list, clock, loads) = Make(_ => ["82.30.109.114"]);
        for (var i = 0; i < 50; i++) await list.IsIgnoredAsync("82.30.109.114");
        Assert.Equal(1, loads());

        clock.Now = clock.Now.AddSeconds(61);          // past the minute: one refresh
        await list.IsIgnoredAsync("82.30.109.114");
        Assert.Equal(2, loads());
    }

    [Fact]
    public async Task Saving_a_new_list_is_seen_straight_away_after_invalidate()
    {
        var (list, _, _) = Make(n => n == 1 ? ["1.1.1.1"] : ["1.1.1.1", "2.2.2.2"]);
        Assert.False(await list.IsIgnoredAsync("2.2.2.2"));
        list.Invalidate();
        Assert.True(await list.IsIgnoredAsync("2.2.2.2"));
    }

    [Fact]
    public async Task If_the_database_cannot_be_read_the_last_known_list_stays_and_nobody_else_is_ignored()
    {
        var clock = new Clock();
        var fail = false;
        var list = new AnalyticsIgnoreList(() => fail ? throw new InvalidOperationException("db down") : Task.FromResult(new HashSet<string> { "82.30.109.114" }), () => clock.Now);

        Assert.True(await list.IsIgnoredAsync("82.30.109.114"));
        fail = true;
        clock.Now = clock.Now.AddSeconds(61);
        Assert.True(await list.IsIgnoredAsync("82.30.109.114"));    // last known list kept
        Assert.False(await list.IsIgnoredAsync("203.0.113.9"));     // a failed read never starts hiding other visitors' events
    }

    [Fact]
    public async Task A_failure_on_the_very_first_read_ignores_nobody_and_retries_shortly()
    {
        var clock = new Clock();
        var calls = 0;
        var list = new AnalyticsIgnoreList(() => { calls++; return calls == 1 ? throw new InvalidOperationException("db down") : Task.FromResult(new HashSet<string> { "82.30.109.114" }); }, () => clock.Now);

        Assert.False(await list.IsIgnoredAsync("82.30.109.114"));   // fail open: log the event rather than lose it
        Assert.False(await list.IsIgnoredAsync("82.30.109.114"));   // not retried on every single event …
        Assert.Equal(1, calls);

        clock.Now = clock.Now.AddSeconds(11);                        // … but shortly afterwards
        Assert.True(await list.IsIgnoredAsync("82.30.109.114"));
        Assert.Equal(2, calls);
    }
}
