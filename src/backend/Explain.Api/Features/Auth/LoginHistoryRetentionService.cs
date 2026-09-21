using Microsoft.EntityFrameworkCore;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Features.Auth;

/// <summary>
/// Privacy policy promise (2026-09-21): records that carry an IP address or device details are kept for 12 months, then the personal
/// details go. Sign-in history rows older than that keep their date/method/outcome (harmless counts) but lose IpAddress and UserAgent.
/// The system-events archive has its own 12-month blob lifecycle rule; this covers the Azure SQL side. Runs once a day, idempotent.
/// </summary>
public sealed class LoginHistoryRetentionService(IServiceScopeFactory scopes, ILogger<LoginHistoryRetentionService> logger) : BackgroundService
{
    private static readonly TimeSpan Retention = TimeSpan.FromDays(365);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(3), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var cutoff = DateTime.UtcNow - Retention;   // precomputed: EF can't translate inline DateTime arithmetic
                var cleared = await db.LoginHistories
                    .Where(h => h.LoginAt < cutoff && (h.IpAddress != null || h.UserAgent != null))
                    .ExecuteUpdateAsync(s => s.SetProperty(h => h.IpAddress, (string?)null).SetProperty(h => h.UserAgent, (string?)null), stoppingToken);
                if (cleared > 0) logger.LogWarning("Cleared IP address and device details from {Count} sign-in record(s) older than 12 months.", cleared);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Sign-in history retention pass failed; will retry tomorrow.");
            }
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
