using Microsoft.Azure.Functions.Worker;
using P1.CareersAgent.Services;

namespace P1.CareersAgent.Functions;

/// <summary>
/// Runs twice daily (06:00 and 18:00 UTC) to discover and enrich new careers.
/// Targets categories that are underrepresented so the catalogue grows evenly.
/// </summary>
public class MonthlyDiscoveryFunction(CosmosCareerService cosmos, OpenAiEnricher enricher)
{
    [Function(nameof(MonthlyDiscoveryFunction))]
    public async Task Run(
        [TimerTrigger("0 0 6,18 * * *")] TimerInfo timer,
        FunctionContext context)
    {
        var log = context.GetLogger<MonthlyDiscoveryFunction>();
        var sweepId = DateTime.UtcNow.ToString("yyyyMMdd-HHmm");
        log.LogInformation("Career discovery sweep {SweepId} started", sweepId);

        // Fetch existing titles and category counts in parallel
        var titlesTask = cosmos.GetAllCareerTitlesAsync();
        var countsTask = cosmos.GetCategoryCountsAsync();
        await Task.WhenAll(titlesTask, countsTask);

        var existingTitles  = titlesTask.Result;
        var categoryCounts  = countsTask.Result;

        // Log current category breakdown so we can spot gaps in App Insights
        log.LogInformation("Sweep {SweepId} — existing total: {Total}", sweepId, existingTitles.Count);
        foreach (var cc in categoryCounts.OrderBy(c => c.Count))
            log.LogInformation("  Category '{Category}': {Count} careers", cc.Category, cc.Count);

        // Identify the 5 thinnest categories to give GPT a focused target
        var thinCategories = categoryCounts
            .OrderBy(c => c.Count)
            .Take(5)
            .Select(c => $"{c.Category} ({c.Count})")
            .ToList();

        log.LogInformation("Sweep {SweepId} — targeting thin categories: {Categories}",
            sweepId, string.Join(", ", thinCategories));

        var newCareers = await enricher.DiscoverNewCareersAsync(existingTitles, thinCategories, log);
        log.LogInformation("Sweep {SweepId} — GPT suggested {Count} new careers", sweepId, newCareers.Count);

        var added  = 0;
        var failed = 0;
        var addedByCategory = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var (title, category, subcategory) in newCareers)
        {
            try
            {
                log.LogInformation("Sweep {SweepId} — enriching: {Title} [{Category}]", sweepId, title, category);
                var doc = await enricher.EnrichCareerAsync(title, category, subcategory, log);

                if (doc is not null)
                {
                    await cosmos.UpsertAsync(doc);
                    added++;
                    addedByCategory[category] = addedByCategory.GetValueOrDefault(category) + 1;
                }

                await Task.Delay(1200);
            }
            catch (Exception ex)
            {
                log.LogWarning("Sweep {SweepId} — failed '{Title}': {Error}", sweepId, title, ex.Message);
                failed++;
            }
        }

        // Final sweep summary — visible as a single queryable log line in App Insights
        log.LogInformation(
            "Sweep {SweepId} COMPLETE — added: {Added}, failed: {Failed}, total: ~{Total} | by category: {ByCategory}",
            sweepId, added, failed, existingTitles.Count + added,
            string.Join(", ", addedByCategory.Select(kv => $"{kv.Key}={kv.Value}")));
    }
}
