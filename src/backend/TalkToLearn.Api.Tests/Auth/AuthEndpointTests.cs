using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Explain.Api.Tests.Auth;

// ── Shared factory ────────────────────────────────────────────────────────────
public class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────
public class AuthEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    // Unique email per test run so we never clash in Cosmos
    private static string UniqueEmail() =>
        $"test_{Guid.NewGuid():N}@percentile.one";

    // ── Register ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_ValidCredentials_Returns200WithToken()
    {
        var res = await _client.PostAsJsonAsync("/auth/register", new
        {
            email    = UniqueEmail(),
            password = "Password123!"
        });

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await res.Content.ReadFromJsonAsync<TokenResponse>();
        body!.token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        var email = UniqueEmail();

        await _client.PostAsJsonAsync("/auth/register", new { email, password = "Password123!" });
        var res = await _client.PostAsJsonAsync("/auth/register", new { email, password = "Password123!" });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Register_InvalidEmail_Returns400()
    {
        var res = await _client.PostAsJsonAsync("/auth/register", new
        {
            email    = "not-an-email",
            password = "Password123!"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_ShortPassword_Returns400()
    {
        var res = await _client.PostAsJsonAsync("/auth/register", new
        {
            email    = UniqueEmail(),
            password = "short"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Login_CorrectCredentials_Returns200WithToken()
    {
        var email = UniqueEmail();
        await _client.PostAsJsonAsync("/auth/register", new { email, password = "Password123!" });

        var res = await _client.PostAsJsonAsync("/auth/login", new { email, password = "Password123!" });

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await res.Content.ReadFromJsonAsync<TokenResponse>();
        body!.token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var email = UniqueEmail();
        await _client.PostAsJsonAsync("/auth/register", new { email, password = "Password123!" });

        var res = await _client.PostAsJsonAsync("/auth/login", new { email, password = "WrongPassword!" });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_UnknownEmail_Returns401()
    {
        var res = await _client.PostAsJsonAsync("/auth/login", new
        {
            email    = UniqueEmail(),
            password = "Password123!"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── GetSession ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSession_ValidToken_Returns200WithUser()
    {
        var email = UniqueEmail();
        var reg = await _client.PostAsJsonAsync("/auth/register", new { email, password = "Password123!" });
        var body = await reg.Content.ReadFromJsonAsync<TokenResponse>();

        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", body!.token);

        var res = await _client.GetAsync("/auth/me");

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var session = await res.Content.ReadFromJsonAsync<SessionResponse>();
        session!.email.Should().Be(email);
    }

    [Fact]
    public async Task GetSession_NoToken_Returns401()
    {
        var client = factory.CreateClient(); // fresh client, no auth header
        var res    = await client.GetAsync("/auth/me");

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── Response DTOs ─────────────────────────────────────────────────────────
    private record TokenResponse(string token);
    private record SessionResponse(string userId, string email, string name, string role);
}
