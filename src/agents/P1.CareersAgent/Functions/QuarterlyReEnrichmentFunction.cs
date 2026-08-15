using Microsoft.Azure.Functions.Worker;
using P1.CareersAgent.Services;

namespace P1.CareersAgent.Functions;

/// <summary>
/// Runs on 1st Jan, Apr, Jul, Oct at 04:00 UTC.
/// Re-generates full career documents for the 50 lowest-confidence records.
/// Ensures data quality improves over time rather than degrading.
/// </summary>
public class QuarterlyReEnrichmentFunction(CosmosCareerService cosmos, OpenAiEnricher enricher)
{
    [Function(nameof(QuarterlyReEnrichmentFunction))]
    public async Task Run(
        [TimerTrigger("0 0 4 1 1,4,7,10 *")] TimerInfo timer,
        FunctionContext context)
    {
        var log = context.GetLogger<QuarterlyReEnrichmentFunction>();
        log.LogInformation("Quarterly re-enrichment started — {Date}", DateTime.UtcNow.ToString("yyyy-MM-dd"));

        var careers = await cosmos.GetLowConfidenceCareers(batchSize: 50);
        log.LogInformation("Found {Count} low-confidence careers to re-enrich", careers.Count);

        var enriched = 0;
        var failed   = 0;

        foreach (var career in careers)
        {
            try
            {
                log.LogInformation("Re-enriching: {Title} (confidence: {Score:F2})", career.Title, career.Confidence);

                var doc = await enricher.EnrichCareerAsync(
                    career.Title, career.Category, career.Subcategory, log);

                if (doc is not null)
                {
                    // Bump confidence after a successful full re-enrichment
                    doc.Confidence = Math.Min(doc.Confidence + 0.05, 1.0);
                    await cosmos.UpsertAsync(doc);
                    enriched++;
                }

                await Task.Delay(1500);
            }
            catch (Exception ex)
            {
                log.LogWarning("Failed to re-enrich '{Title}': {Error}", career.Title, ex.Message);
                failed++;
            }
        }

        log.LogInformation(
            "Quarterly re-enrichment complete — {Enriched} improved, {Failed} failed",
            enriched, failed);
    }
}
