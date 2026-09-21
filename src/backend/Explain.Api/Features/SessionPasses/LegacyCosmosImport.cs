using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.SessionPasses;

/// <summary>
/// One-off, idempotent copy of the pre-2026-09-21 data from Cosmos into SQL: every interview pass (container "sessionPasses") and the
/// paywall settings document (platformSettings/entitlements). Runs at startup right after the migrations, inserts only what SQL
/// doesn't already have (matched by pass id), and never touches Cosmos — so it can run on every start harmlessly, and the old data
/// stays in Cosmos as a backup. Once a release has run and the counts look right, this whole class and the startup call can be removed.
/// </summary>
public static class LegacyCosmosImport
{
    // Same shape the old EntitlementService wrote to Cosmos.
    private sealed record OldSettingsDoc(string id, bool enforce, int dailyCap, int monthlyCap, bool tasterEnabled, DateTimeOffset updatedAt, string updatedBy);

    public static async Task<int> RunAsync(AppDbContext db, CosmosService cosmos, ILogger logger)
    {
        var imported = 0;

        var have = (await db.InterviewPasses.AsNoTracking().Select(p => p.Id).ToListAsync()).ToHashSet();
        using (var feed = cosmos.GetContainer("sessionPasses").GetItemQueryIterator<SessionPass>(new QueryDefinition("SELECT * FROM c")))
        {
            while (feed.HasMoreResults)
                foreach (var p in await feed.ReadNextAsync())
                {
                    if (have.Contains(p.id)) continue;
                    db.InterviewPasses.Add(new InterviewPass
                    {
                        Id = p.id, RecipientEmail = p.recipientEmail.Trim().ToLowerInvariant(), RecipientName = p.recipientName,
                        RecipientJobTitle = p.recipientJobTitle, TierId = p.tierId, Source = p.source, SenderName = p.senderName,
                        SenderEmail = p.senderEmail, Status = p.status, StripeCheckoutSessionId = p.stripeCheckoutSessionId,
                        StripePaymentIntentId = p.stripePaymentIntentId, AmountGbp = p.amountGbp, Currency = p.currency,
                        SessionsTotal = p.sessionsTotal, SessionsUsed = p.sessionsUsed, CreatedAt = p.createdAt.UtcDateTime,
                        PaidAt = p.paidAt?.UtcDateTime, ExpiresAt = p.expiresAt?.UtcDateTime, RedeemedByUserId = p.redeemedByUserId,
                    });
                    imported++;
                }
        }
        if (imported > 0) await db.SaveChangesAsync();

        // The settings document: copy it over only if the SQL row is still the untouched seeded default.
        var settingsCopied = false;
        try
        {
            var old = (await cosmos.GetContainer("platformSettings").ReadItemAsync<OldSettingsDoc>("entitlements", new PartitionKey("entitlements"))).Resource;
            var row = await db.EntitlementSettings.FirstOrDefaultAsync(r => r.Id == 1);
            if (row is not null && row.UpdatedBy == "system")
            {
                row.Enforce = old.enforce; row.DailyCap = old.dailyCap; row.MonthlyCap = old.monthlyCap; row.TasterEnabled = old.tasterEnabled;
                row.UpdatedAt = old.updatedAt.UtcDateTime; row.UpdatedBy = string.IsNullOrWhiteSpace(old.updatedBy) ? "imported" : old.updatedBy;
                await db.SaveChangesAsync();
                settingsCopied = true;
            }
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { /* never saved to Cosmos — nothing to copy */ }

        if (imported > 0 || settingsCopied)
            logger.LogWarning("Imported {Passes} interview pass(es) from Cosmos into SQL{Settings}.", imported, settingsCopied ? " and copied the paywall settings" : "");
        return imported;
    }
}
