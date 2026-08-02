using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit.Abstractions;

namespace Explain.Api.Tests;

/// <summary>
/// Boots the real Explain.Api in-process, wired to production Azure SQL + Cosmos.
/// Config is loaded from environment variables (same keys as Azure App Service).
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        // Inject production connection strings from env — set these locally before running:
        //   $env:ConnectionStrings__SqlDb  = "Server=tcp:explain-global-db..."
        //   $env:Cosmos__Endpoint          = "https://percentileone-cosmos..."
        //   $env:Cosmos__Key               = "SYkjU4k..."
        //   $env:Cosmos__Database          = "ExplainLearn"
        //   $env:Jwt__Secret               = "X7k#mP2$v..."
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddEnvironmentVariables();
        });

        builder.UseSetting("environment", "Production");
    }

    /// <summary>Creates an HttpClient and redirects xUnit output to the test console.</summary>
    public HttpClient CreateClientWithProdConfig(ITestOutputHelper output)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress       = new Uri("http://localhost"),
        });
        output.WriteLine($"[FACTORY] Test server started at {client.BaseAddress}");
        return client;
    }
}
