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
    // Reasons any documents were skipped on the last run (shown by the on-demand endpoint).
    public static IReadOnlyList<string> LastSkipped { get; private set; } = Array.Empty<string>();

    // Same shape the old EntitlementService wrote to Cosmos.
    private sealed record OldSettingsDoc(string id, bool enforce, int dailyCap, int monthlyCap, bool tasterEnabled, DateTimeOffset updatedAt, string updatedBy);

    public static async Task<int> RunAsync(AppDbContext db, CosmosService cosmos, ILogger logger)
    {
        var imported = 0;

        var have = (await db.InterviewPasses.AsNoTracking().Select(p => p.Id).ToListAsync()).ToHashSet();
        var skipped = new List<string>();
        using (var feed = cosmos.GetContainer("sessionPasses").GetItemQueryIterator<SessionPass>(new QueryDefinition("SELECT * FROM c")))
        {
            while (feed.HasMoreResults)
                foreach (var p in await feed.ReadNextAsync())
                {
                    if (string.IsNullOrWhiteSpace(p.id) || have.Contains(p.id)) continue;

                    // Early test passes pre-date some fields (e.g. tierId was added a day after the first gift), so anything missing
                    // gets a sensible default rather than failing a NOT NULL column.
                    var source = string.IsNullOrWhiteSpace(p.source) ? "gift" : p.source;
                    var tierId = !string.IsNullOrWhiteSpace(p.tierId) ? p.tierId : source == "self" ? "self" : "gift-1week";
                    var row = new InterviewPass
                    {
                        Id = p.id, RecipientEmail = (p.recipientEmail ?? "").Trim().ToLowerInvariant(), RecipientName = p.recipientName ?? "",
                        RecipientJobTitle = p.recipientJobTitle, TierId = tierId, Source = source, SenderName = p.senderName,
                        SenderEmail = p.senderEmail, Status = string.IsNullOrWhiteSpace(p.status) ? "pending" : p.status,
                        StripeCheckoutSessionId = p.stripeCheckoutSessionId, StripePaymentIntentId = p.stripePaymentIntentId,
                        AmountGbp = p.amountGbp, Currency = string.IsNullOrWhiteSpace(p.currency) ? "GBP" : p.currency,
                        SessionsTotal = p.sessionsTotal, SessionsUsed = p.sessionsUsed, CreatedAt = p.createdAt.UtcDateTime,
                        PaidAt = p.paidAt?.UtcDateTime, ExpiresAt = p.expiresAt?.UtcDateTime, RedeemedByUserId = p.redeemedByUserId,
                    };
                    // One bad document must never block the rest: each is saved on its own and skipped (with the reason) if it can't be.
                    db.InterviewPasses.Add(row);
                    try { await db.SaveChangesAsync(); imported++; }
                    catch (Exception ex)
                    {
                        db.Entry(row).State = EntityState.Detached;
                        skipped.Add($"{p.id}: {ex.InnerException?.Message ?? ex.Message}");
                        logger.LogWarning(ex, "Could not import interview pass {PassId} from Cosmos", p.id);
                    }
                }
        }
        LastSkipped = skipped;

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

/// <summary>
/// Runs the import once the app is fully up (so its log lines reach Application Insights, which startup-time logs don't), retrying a few
/// times in case Azure SQL or Cosmos is still waking. Idempotent, so it is harmless if the import already happened.
/// </summary>
public sealed class LegacyImportService(IServiceScopeFactory scopes, ILogger<LegacyImportService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(40), stoppingToken);
        for (var attempt = 1; attempt <= 6 && !stoppingToken.IsCancellationRequested; attempt++)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var n = await LegacyCosmosImport.RunAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>(), scope.ServiceProvider.GetRequiredService<CosmosService>(), logger);
                logger.LogWarning("Legacy import check finished (attempt {Attempt}): {Imported} pass(es) copied this time.", attempt, n);
                return;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Legacy Cosmos -> SQL import attempt {Attempt} failed.", attempt);
                await Task.Delay(TimeSpan.FromSeconds(45), stoppingToken);
            }
        }
    }
}

public static class LegacyImportEndpoint
{
    // On-demand run + visible result, gated by the same shared admin key as the other ops endpoints (x-admin-key).
    public static void Map(WebApplication app) =>
        app.MapPost("/api/admin/legacy-import", async (HttpContext ctx, IConfiguration config, AppDbContext db, CosmosService cosmos, ILogger<LegacyImportService> logger) =>
        {
            var key = config["ExamCatalogAgent:AdminKey"];
            if (string.IsNullOrEmpty(key) || ctx.Request.Headers["x-admin-key"] != key) return Results.Unauthorized();
            try
            {
                var imported = await LegacyCosmosImport.RunAsync(db, cosmos, logger);
                return Results.Ok(new
                {
                    imported,
                    sqlPasses = await db.InterviewPasses.CountAsync(),
                    sqlPaid = await db.InterviewPasses.CountAsync(p => p.Status == "paid"),
                    skipped = LegacyCosmosImport.LastSkipped,
                });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.GetType().Name + ": " + (ex.InnerException?.Message ?? ex.Message) }, statusCode: 500);
            }
        }).AllowAnonymous();
}
