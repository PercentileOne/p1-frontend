using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Explain.Api.Features.Users.DeleteAccount;
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
        builder.Services.AddScoped<AccountDeletionService>(_ => null!);   // registered so the route builder sees it as a service, never resolved here
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
}
