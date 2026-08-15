using Microsoft.Azure.Functions.Worker;
using P1.CareersAgent.Services;

namespace P1.CareersAgent.Functions;

/// <summary>
/// Runs on the 1st of every month at 03:00 UTC.
/// Asks GPT to suggest careers not yet in Cosmos, then generates and upserts full documents.
/// This is how we grow from 1,612 toward 3,000+ automatically.
/// </summary>
public class MonthlyDiscoveryFunction(CosmosCareerService cosmos, OpenAiEnricher enricher)
{
    [Function(nameof(MonthlyDiscoveryFunction))]
    public async Task Run(
        [TimerTrigger("0 0 3 1 * *")] TimerInfo timer,
        FunctionContext context)
    {
        var log = context.GetLogger<MonthlyDiscoveryFunction>();
        log.LogInformation("Monthly career discovery started — {Date}", DateTime.UtcNow.ToString("yyyy-MM-dd"));

        // Get current titles from Cosmos so GPT knows what's already there
        var existingTitles = await cosmos.GetAllCareerTitlesAsync();
        log.LogInformation("Existing careers in Cosmos: {Count}", existingTitles.Count);

        // Ask GPT for 50 new titles
        var newCareers = await enricher.DiscoverNewCareersAsync(existingTitles, log);
        log.LogInformation("Discovered {Count} candidate new careers", newCareers.Count);

        var added  = 0;
        var failed = 0;

        foreach (var (title, category, subcategory) in newCareers)
        {
            try
            {
                log.LogInformation("Enriching: {Title}", title);
                var doc = await enricher.EnrichCareerAsync(title, category, subcategory, log);

                if (doc is not null)
                {
                    await cosmos.UpsertAsync(doc);
                    added++;
                }

                await Task.Delay(1200);
            }
            catch (Exception ex)
            {
                log.LogWarning("Failed to add '{Title}': {Error}", title, ex.Message);
                failed++;
            }
        }

        log.LogInformation(
            "Monthly discovery complete — {Added} careers added, {Failed} failed. Total now ~{Total}",
            added, failed, existingTitles.Count + added);
    }
}
