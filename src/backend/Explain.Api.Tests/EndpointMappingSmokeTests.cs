using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Explain.Api.Features.Users.DeleteAccount;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Tests;

// Minimal-API routes are only checked when the endpoint is first BUILT — at startup for the real app, so a mistake in a route's
// parameters (e.g. a DELETE body that isn't marked [FromBody]) takes the WHOLE API down with a 500 on every request. That happened on
// 2026-09-21 with DELETE /api/users/me (admin login "Failed to fetch"). These build the routes the way the app does, so it fails here.
public class EndpointMappingSmokeTests
{
    private static WebApplication AppWithServices()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddAuthentication();
        builder.Services.AddAuthorization();
        builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite("DataSource=:memory:"));
        builder.Services.AddSingleton<CosmosService>(_ => null!);   // registered so route builders see it as a service, never resolved here
        builder.Services.AddHttpClient();
        builder.Services.AddScoped<AccountDeletionService>(_ => null!);
        builder.Services.AddSingleton<Explain.Api.Infrastructure.Email.IEmailSender>(_ => null!);
        builder.Services.AddScoped<Explain.Api.Features.SessionPasses.SessionPassService>(_ => null!);
        builder.Services.AddScoped<Explain.Api.Features.Subscriptions.CandidateSubscriptionService>(_ => null!);   // registered so the route builder sees it as a service, never resolved here
        return builder.Build();
    }

    [Fact]
    public void Delete_my_account_route_builds()
    {
        var app = AppWithServices();
        Explain.Api.Features.Users.DeleteAccount.Endpoint.Map(app);
        var endpoints = ((IEndpointRouteBuilder)app).DataSources.SelectMany(d => d.Endpoints).ToList();   // building them is the test
        Assert.Contains(endpoints, e => e is RouteEndpoint r && r.RoutePattern.RawText == "/api/users/me");
    }

    [Fact]
    public void Try_it_live_routes_build()
    {
        var app = AppWithServices();
        Explain.Api.Features.TryOut.Endpoint.Map(app);
        var patterns = ((IEndpointRouteBuilder)app).DataSources.SelectMany(d => d.Endpoints).OfType<RouteEndpoint>().Select(r => r.RoutePattern.RawText).ToList();
        Assert.Contains("/api/tryout/start", patterns);
        Assert.Contains("/api/tryout/feedback", patterns);
        Assert.Contains("/api/tryout/coach", patterns);
    }

    [Fact]
    public void Access_request_routes_build()
    {
        var app = AppWithServices();
        Explain.Api.Features.AccessRequests.Endpoint.Map(app);
        var patterns = ((IEndpointRouteBuilder)app).DataSources.SelectMany(d => d.Endpoints).OfType<RouteEndpoint>().Select(r => r.RoutePattern.RawText).ToList();
        Assert.Contains("/api/access-requests", patterns);
        Assert.Contains("/api/admin/access-requests", patterns);
        Assert.Contains("/api/admin/access-requests/{id}/create-account", patterns);
        Assert.Contains("/api/admin/access-requests/{id}/payment-link", patterns);
    }

    [Fact]
    public void Stripe_webhook_route_builds_with_its_new_parameters()
    {
        // The webhook handler gained AppDbContext + IEmailSender; a parameter the framework can't resolve would break the whole API at startup.
        var app = AppWithServices();
        Explain.Api.Features.SessionPasses.Checkout.Endpoint.Map(app);
        var patterns = ((IEndpointRouteBuilder)app).DataSources.SelectMany(d => d.Endpoints).OfType<RouteEndpoint>().Select(r => r.RoutePattern.RawText).ToList();
        Assert.Contains("/api/session-passes/webhook", patterns);
    }

    [Fact]
    public void Team_page_routes_build()
    {
        var app = AppWithServices();
        Explain.Api.Features.Organisations.Team.Endpoint.Map(app);
        var patterns = ((IEndpointRouteBuilder)app).DataSources.SelectMany(d => d.Endpoints).OfType<RouteEndpoint>().Select(r => r.RoutePattern.RawText).ToList();
        Assert.Contains("/api/organisations/team", patterns);
        Assert.Contains("/api/organisations/team/posts", patterns);
        Assert.Contains("/api/organisations/team/posts/{id}", patterns);
    }
}
