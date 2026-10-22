using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Private = Explain.Api.Features.PrivatePages;

namespace Explain.Api.Tests;

// Password-locked pages (2026-10-22): the rules are tested directly, and the whole unlock-then-read flow runs through a small real web server with its own temporary pages.
public class PrivatePageRulesTests
{
    private static readonly byte[] Key = Private.PrivatePageAccess.DeriveKey("test-secret");
    private static readonly DateTimeOffset Now = new(2026, 10, 22, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void The_setting_is_read_as_label_equals_password_pairs_and_weak_or_malformed_entries_are_ignored()
    {
        var list = Private.PrivatePageAccess.ParsePasswords(" francis=a long phrase ,mukesh=another-phrase, bad label=whatever12345, short=abc, nolabel, =nopassword1, francis=duplicate-ignored ");
        Assert.Equal(["francis", "mukesh"], list.Select(a => a.Label).ToArray());
        Assert.Equal("a long phrase", list[0].Password);
        Assert.Empty(Private.PrivatePageAccess.ParsePasswords(null));
        Assert.Empty(Private.PrivatePageAccess.ParsePasswords("   "));
    }

    [Fact]
    public void A_password_matches_only_its_own_label_and_nothing_else_does()
    {
        var list = Private.PrivatePageAccess.ParsePasswords("francis=first password,mukesh=second password");
        Assert.Equal("francis", Private.PrivatePageAccess.Check("first password", list));
        Assert.Equal("mukesh", Private.PrivatePageAccess.Check("second password", list));
        Assert.Null(Private.PrivatePageAccess.Check("First Password", list));
        Assert.Null(Private.PrivatePageAccess.Check("", list));
        Assert.Null(Private.PrivatePageAccess.Check(null, list));
        Assert.Null(Private.PrivatePageAccess.Check(new string('x', 500), list));
        Assert.Null(Private.PrivatePageAccess.Check("first password", []));
    }

    [Fact]
    public void A_token_works_until_it_ends_and_names_who_it_is_for()
    {
        var list = Private.PrivatePageAccess.ParsePasswords("mukesh=second password");
        var token = Private.PrivatePageAccess.MakeToken(list[0], Key, Now.AddDays(7));
        Assert.Equal("mukesh", Private.PrivatePageAccess.VerifyToken(token, list, Key, Now));
        Assert.Equal("mukesh", Private.PrivatePageAccess.VerifyToken(token, list, Key, Now.AddDays(6)));
        Assert.Null(Private.PrivatePageAccess.VerifyToken(token, list, Key, Now.AddDays(7)));
        Assert.Null(Private.PrivatePageAccess.VerifyToken(token, list, Key, Now.AddDays(30)));
    }

    [Fact]
    public void A_forged_or_damaged_token_is_refused()
    {
        var list = Private.PrivatePageAccess.ParsePasswords("mukesh=second password");
        var token = Private.PrivatePageAccess.MakeToken(list[0], Key, Now.AddDays(7));
        var other = Private.PrivatePageAccess.DeriveKey("a-different-secret");
        Assert.Null(Private.PrivatePageAccess.VerifyToken(token, list, other, Now));                         // signed with another key
        Assert.Null(Private.PrivatePageAccess.VerifyToken(token[..^3] + "abc", list, Key, Now));               // signature altered
        Assert.Null(Private.PrivatePageAccess.VerifyToken("x." + token.Split('.')[1], list, Key, Now));        // payload swapped
        foreach (var junk in new[] { null, "", ".", "abc", "a.b", new string('a', 500) })
            Assert.Null(Private.PrivatePageAccess.VerifyToken(junk, list, Key, Now));
    }

    [Fact]
    public void Changing_or_removing_someones_password_ends_their_earlier_unlocks()
    {
        var before = Private.PrivatePageAccess.ParsePasswords("mukesh=second password,francis=first password");
        var token = Private.PrivatePageAccess.MakeToken(before[0], Key, Now.AddDays(7));
        Assert.Equal("mukesh", Private.PrivatePageAccess.VerifyToken(token, before, Key, Now));
        Assert.Null(Private.PrivatePageAccess.VerifyToken(token, Private.PrivatePageAccess.ParsePasswords("mukesh=a new password,francis=first password"), Key, Now));   // changed
        Assert.Null(Private.PrivatePageAccess.VerifyToken(token, Private.PrivatePageAccess.ParsePasswords("francis=first password"), Key, Now));                            // removed
        Assert.Null(Private.PrivatePageAccess.VerifyToken(token, [], Key, Now));                                                                                              // none set
    }

    [Theory]
    [InlineData("pitch-deck", true)]
    [InlineData("fp", true)]
    [InlineData("pricing-question", true)]
    [InlineData("../secrets", false)]
    [InlineData("a/b", false)]
    [InlineData("Pitch-Deck", false)]
    [InlineData("pitch deck", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void Only_plain_lowercase_page_names_are_accepted(string? name, bool ok) => Assert.Equal(ok, Private.PrivatePageAccess.IsValidName(name));

    [Fact]
    public void A_stored_page_is_made_safe_for_the_frame()
    {
        const string html = "<html><head><link rel=\"icon\" href=\"/favicon.svg\"><script src=\"/track.js?v=2\"></script><style>.a{background:url(/img/x.webp)}</style></head>" +
            "<body><img src=\"/img/hero.webp\"><a href=\"//cdn.example.com/x\">cdn</a><a href=\"https://other.example/y\">out</a><a href=\"#top\">top</a></body></html>";
        var result = Private.PrivatePageAccess.PrepareForEmbedding(html, "https://www.theinterviewchair.com/");
        Assert.Contains("href=\"https://www.theinterviewchair.com/favicon.svg\"", result);
        Assert.Contains("src=\"https://www.theinterviewchair.com/img/hero.webp\"", result);
        Assert.Contains("url(https://www.theinterviewchair.com/img/x.webp)", result);
        Assert.Contains("href=\"//cdn.example.com/x\"", result);   // protocol-relative addresses are left alone
        Assert.Contains("href=\"#top\"", result);
        Assert.DoesNotContain("track.js", result);                   // the visit tracker is removed
        Assert.Contains("target='_blank'", result);                  // outgoing links open in a new tab
        Assert.True(result.IndexOf("<script>document.addEventListener", StringComparison.Ordinal) < result.IndexOf("</body>", StringComparison.Ordinal));
    }
}

public class PrivatePageEndpointTests : IDisposable
{
    private readonly string _dir = Path.Combine(Path.GetTempPath(), "private-pages-test-" + Guid.NewGuid().ToString("N"));

    public PrivatePageEndpointTests()
    {
        Directory.CreateDirectory(_dir);
        File.WriteAllText(Path.Combine(_dir, "pitch-deck.html"), "<html><head><title>The deck</title></head><body><img src=\"/img/a.webp\">SECRET DECK CONTENT</body></html>");
        Private.Endpoint.ResetFailuresForTests();
    }

    public void Dispose() { try { Directory.Delete(_dir, true); } catch { /* fine */ } }

    private async Task<(WebApplication App, HttpClient Client)> StartAsync(string? passwords)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing" });
        builder.WebHost.UseTestServer();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["PrivatePages:Directory"] = _dir, ["PrivatePages:Passwords"] = passwords, ["PrivatePages:FailureDelayMs"] = "0",
            ["Jwt:Secret"] = "integration-test-secret", ["MarketingAppUrl"] = "https://www.theinterviewchair.com",
        });
        var app = builder.Build();
        Private.Endpoint.Map(app);
        await app.StartAsync();
        return (app, app.GetTestClient());
    }

    private static async Task<string?> UnlockAsync(HttpClient client, string password)
    {
        var res = await client.PostAsJsonAsync("/api/private-pages/unlock", new { password });
        return res.IsSuccessStatusCode ? (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString() : null;
    }

    private static HttpRequestMessage Get(string page, string? token)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/api/private-pages/" + page);
        if (token is not null) req.Headers.Add("Authorization", "Bearer " + token);
        return req;
    }

    [Fact]
    public async Task With_no_passwords_set_nothing_can_be_unlocked_and_the_page_stays_locked()
    {
        var (app, client) = await StartAsync(null);
        await using (app)
        {
            var unlock = await client.PostAsJsonAsync("/api/private-pages/unlock", new { password = "anything at all" });
            Assert.Equal(HttpStatusCode.Unauthorized, unlock.StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(Get("pitch-deck", null))).StatusCode);
            var status = await client.GetFromJsonAsync<JsonElement>("/api/private-pages");
            Assert.Equal(0, status.GetProperty("passwords").GetInt32());
            Assert.Equal(1, status.GetProperty("pages").GetInt32());
        }
    }

    [Fact]
    public async Task The_right_password_gives_a_token_that_opens_the_page_and_a_wrong_one_does_not()
    {
        var (app, client) = await StartAsync("mukesh=second password");
        await using (app)
        {
            Assert.Null(await UnlockAsync(client, "wrong password"));
            var token = await UnlockAsync(client, "second password");
            Assert.NotNull(token);

            var page = await client.SendAsync(Get("pitch-deck", token));
            Assert.Equal(HttpStatusCode.OK, page.StatusCode);
            Assert.Equal("text/html", page.Content.Headers.ContentType?.MediaType);
            var body = await page.Content.ReadAsStringAsync();
            Assert.Contains("SECRET DECK CONTENT", body);
            Assert.Contains("src=\"https://www.theinterviewchair.com/img/a.webp\"", body);
            Assert.Contains("no-store", page.Headers.CacheControl?.ToString());
            Assert.Contains("noindex", string.Join(",", page.Headers.GetValues("X-Robots-Tag")));
        }
    }

    [Fact]
    public async Task Without_a_token_or_with_a_bad_one_the_page_is_never_sent()
    {
        var (app, client) = await StartAsync("mukesh=second password");
        await using (app)
        {
            foreach (var token in new string?[] { null, "", "garbage", "a.b" })
            {
                var res = await client.SendAsync(Get("pitch-deck", token));
                Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
                Assert.DoesNotContain("SECRET DECK CONTENT", await res.Content.ReadAsStringAsync());
            }
        }
    }

    [Fact]
    public async Task An_unknown_page_or_a_path_trick_gives_not_found_even_with_a_valid_token()
    {
        var (app, client) = await StartAsync("mukesh=second password");
        await using (app)
        {
            var token = await UnlockAsync(client, "second password");
            Assert.Equal(HttpStatusCode.NotFound, (await client.SendAsync(Get("nothing-here", token))).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await client.SendAsync(Get("..%2Fappsettings", token))).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await client.SendAsync(Get("PITCH-DECK", token))).StatusCode);
        }
    }

    [Fact]
    public async Task Removing_a_persons_password_locks_them_out_straight_away()
    {
        string token;
        var (first, firstClient) = await StartAsync("mukesh=second password,francis=first password");
        await using (first) { token = (await UnlockAsync(firstClient, "second password"))!; Assert.Equal(HttpStatusCode.OK, (await firstClient.SendAsync(Get("pitch-deck", token))).StatusCode); }

        var (second, secondClient) = await StartAsync("francis=first password");   // same secret, mukesh removed
        await using (second) Assert.Equal(HttpStatusCode.Unauthorized, (await secondClient.SendAsync(Get("pitch-deck", token))).StatusCode);
    }

    [Fact]
    public async Task Repeated_wrong_guesses_are_stopped()
    {
        var (app, client) = await StartAsync("mukesh=second password");
        await using (app)
        {
            for (var i = 0; i < 10; i++) Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/private-pages/unlock", new { password = "guess " + i })).StatusCode);
            var blocked = await client.PostAsJsonAsync("/api/private-pages/unlock", new { password = "second password" });   // even the right one waits
            Assert.Equal((HttpStatusCode)429, blocked.StatusCode);
        }
    }
}
