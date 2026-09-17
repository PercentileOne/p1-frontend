using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using P1.ExamCatalogAgent.Services;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        services.AddSingleton<CosmosExamCatalogService>();
        services.AddSingleton<ExamCatalogReportService>();
        services.AddHttpClient();
    })
    .Build();

host.Run();
