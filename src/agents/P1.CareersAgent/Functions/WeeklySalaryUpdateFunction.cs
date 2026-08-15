using Microsoft.Azure.Functions.Worker;
using P1.CareersAgent.Services;

namespace P1.CareersAgent.Functions;

/// <summary>
/// Runs every Monday at 02:00 UTC.
/// Updates salary + workforce figures for careers not refreshed in the last 6 days.
/// Uses Cosmos patch (not full replace) to avoid touching other fields.
/// </summary>
public class WeeklySalaryUpdateFunction(CosmosCareerService cosmos, OpenAiEnricher enricher)
{
    [Function(nameof(WeeklySalaryUpdateFunction))]
    public async Task Run(
        [TimerTrigger("0 0 2 * * MON")] TimerInfo timer,
        FunctionContext context)
    {
        var log     = context.GetLogger<WeeklySalaryUpdateFunction>();
        var today   = DateTime.UtcNow.ToString("yyyy-MM-dd");

        log.LogInformation("Weekly salary update started — {Date}", today);

        var careers = await cosmos.GetCareersForSalaryUpdate(batchSize: 200);
        log.LogInformation("Found {Count} careers to refresh", careers.Count);

        var updated = 0;
        var failed  = 0;

        foreach (var career in careers)
        {
            try
            {
                var (salary, workforce, date) = await enricher.UpdateSalaryAsync(career, log);
                career.Salary            = salary;
                career.Workforce         = workforce;
                career.SalaryLastUpdated = date;
                career.LastUpdated       = date;

                await cosmos.UpsertSalaryAsync(career);
                updated++;

                // Polite rate-limit pause
                await Task.Delay(800);
            }
            catch (Exception ex)
            {
                log.LogWarning("Failed to update '{Title}': {Error}", career.Title, ex.Message);
                failed++;
            }
        }

        log.LogInformation("Weekly salary update complete — {Updated} updated, {Failed} failed", updated, failed);
    }
}
