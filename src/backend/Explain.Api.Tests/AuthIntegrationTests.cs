using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit.Abstractions;

namespace Explain.Api.Tests;

/// <summary>
/// Integration tests for /auth/register and /auth/login.
/// These spin up the real API in-process (WebApplicationFactory) against
/// the production Azure SQL and Cosmos DB — so they catch real infra issues.
///
/// Run with:
///   dotnet test src/backend/Explain.Api.Tests --logger "console;verbosity=detailed"
/// </summary>
public class AuthIntegrationTests(ITestOutputHelper output) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = new ApiFactory().CreateClientWithProdConfig(output);

    // ── Register ──────────────────────────────────────────────────────────────

    [Fact(DisplayName = "POST /auth/register → 200 with token and user")]
    public async Task Register_ValidPayload_Returns200WithToken()
    {
        var email = $"test-{Guid.NewGuid():N}@explain.global";
        output.WriteLine($"[REGISTER] email={email}");

        var res = await _client.PostAsJsonAsync("/auth/register", new
        {
            email,
            password  = "Integration1!",
            firstName = "Integration",
            lastName  = "Test",
        });

        output.WriteLine($"[REGISTER] status={res.StatusCode}");
        var body = await res.Content.ReadAsStringAsync();
        output.WriteLine($"[REGISTER] body={body}");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var json = System.Text.Json.JsonDocument.Parse(body).RootElement;
        Assert.True(json.TryGetProperty("token", out var tokenEl), "Response must contain 'token'");
        Assert.False(string.IsNullOrWhiteSpace(tokenEl.GetString()), "Token must not be empty");

        Assert.True(json.TryGetProperty("user", out var userEl), "Response must contain 'user'");
        Assert.Equal(email, userEl.GetProperty("email").GetString());
        output.WriteLine($"[REGISTER] userId={userEl.GetProperty("id").GetString()} ✓");
    }

    [Fact(DisplayName = "POST /auth/register → 400 when password too short")]
    public async Task Register_ShortPassword_Returns400()
    {
        var res = await _client.PostAsJsonAsync("/auth/register", new
        {
            email     = $"bad-{Guid.NewGuid():N}@explain.global",
            password  = "short",
            firstName = "Bad",
            lastName  = "Pass",
        });

        output.WriteLine($"[REGISTER] short-password → {res.StatusCode}");
        var body = await res.Content.ReadAsStringAsync();
        output.WriteLine($"[REGISTER] body={body}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact(DisplayName = "POST /auth/register → 400 when firstName missing")]
    public async Task Register_MissingFirstName_Returns400()
    {
        var res = await _client.PostAsJsonAsync("/auth/register", new
        {
            email     = $"nofirst-{Guid.NewGuid():N}@explain.global",
            password  = "ValidPass1!",
            firstName = "",
            lastName  = "Test",
        });

        output.WriteLine($"[REGISTER] missing-firstName → {res.StatusCode}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact(DisplayName = "POST /auth/register → 409 on duplicate email")]
    public async Task Register_DuplicateEmail_Returns409()
    {
        var email = $"dup-{Guid.NewGuid():N}@explain.global";

        // First registration — should succeed
        var first = await _client.PostAsJsonAsync("/auth/register", new
        {
            email,
            password  = "Integration1!",
            firstName = "Dup",
            lastName  = "First",
        });
        output.WriteLine($"[REGISTER] first → {first.StatusCode}");
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        // Second with same email — should conflict
        var second = await _client.PostAsJsonAsync("/auth/register", new
        {
            email,
            password  = "Integration1!",
            firstName = "Dup",
            lastName  = "Second",
        });
        output.WriteLine($"[REGISTER] duplicate → {second.StatusCode}");
        var body = await second.Content.ReadAsStringAsync();
        output.WriteLine($"[REGISTER] body={body}");
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "POST /auth/login → 200 with token after successful register")]
    public async Task Login_ValidCredentials_Returns200WithToken()
    {
        var email    = $"login-{Guid.NewGuid():N}@explain.global";
        var password = "Integration1!";

        // Register first
        output.WriteLine($"[SETUP] Registering {email}…");
        var reg = await _client.PostAsJsonAsync("/auth/register", new
        {
            email, password, firstName = "Login", lastName = "Test",
        });
        Assert.Equal(HttpStatusCode.OK, reg.StatusCode);
        output.WriteLine("[SETUP] Registration OK");

        // Now login
        var res = await _client.PostAsJsonAsync("/auth/login", new { email, password });
        output.WriteLine($"[LOGIN] status={res.StatusCode}");
        var body = await res.Content.ReadAsStringAsync();
        output.WriteLine($"[LOGIN] body={body}");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var json = System.Text.Json.JsonDocument.Parse(body).RootElement;
        Assert.True(json.TryGetProperty("token", out var tokenEl));
        Assert.False(string.IsNullOrWhiteSpace(tokenEl.GetString()));
        output.WriteLine("[LOGIN] JWT issued ✓");
    }

    [Fact(DisplayName = "POST /auth/login → 401 on wrong password")]
    public async Task Login_WrongPassword_Returns401()
    {
        var email    = $"wrongpass-{Guid.NewGuid():N}@explain.global";
        var password = "Integration1!";

        await _client.PostAsJsonAsync("/auth/register", new
        {
            email, password, firstName = "Wrong", lastName = "Pass",
        });

        var res = await _client.PostAsJsonAsync("/auth/login", new
        {
            email,
            password = "WrongPassword99!",
        });

        output.WriteLine($"[LOGIN] wrong-password → {res.StatusCode}");
        var body = await res.Content.ReadAsStringAsync();
        output.WriteLine($"[LOGIN] body={body}");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact(DisplayName = "POST /auth/login → 401 for unknown email")]
    public async Task Login_UnknownEmail_Returns401()
    {
        var res = await _client.PostAsJsonAsync("/auth/login", new
        {
            email    = $"ghost-{Guid.NewGuid():N}@explain.global",
            password = "DoesntMatter1!",
        });

        output.WriteLine($"[LOGIN] unknown-email → {res.StatusCode}");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }
}
