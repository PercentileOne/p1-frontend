using Microsoft.EntityFrameworkCore;
using Explain.Api.Features.Users.DeleteAccount;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Auth;

/// <summary>
/// Tidies away sign-ups that never confirmed their email (Francis, 2026-10-05: fake addresses pile up in the admin user list). An account that was
/// created by someone registering themselves, was sent its verification link more than 7 days ago and still has not used it can never have signed in,
/// so there is nothing to lose. Uses the same full erasure as "Delete my account". Deliberately leaves alone: verified accounts, admin-created invites
/// (they carry no verification link), admins, locked accounts (a security matter) and anyone with an access grant. Runs every 6 hours, 25 at a time.
/// </summary>
public sealed class UnverifiedAccountCleanupService(IServiceScopeFactory scopes, ILogger<UnverifiedAccountCleanupService> logger) : BackgroundService
{
    public static readonly TimeSpan MaxAge = TimeSpan.FromDays(7);
    private const int BatchSize = 25;

    /// <summary>The accounts to remove: self-registered, still unverified, link sent before <paramref name="cutoff"/>. (Cutoff is precomputed by the caller: EF cannot translate inline DateTime arithmetic.)</summary>
    public static IQueryable<User> StaleUnverified(AppDbContext db, DateTime cutoff) =>
        db.Users.Where(u => !u.EmailVerified
            && u.EmailVerificationToken != null
            && u.EmailVerificationSentAt != null && u.EmailVerificationSentAt < cutoff
            && !u.IsLocked
            && u.Role != "admin"
            && !db.AccessGrants.Any(g => g.UserId == u.Id));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromMinutes(4), stoppingToken);
        using var timer = new PeriodicTimer(TimeSpan.FromHours(6));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var deletion = scope.ServiceProvider.GetRequiredService<AccountDeletionService>();
                var cutoff = DateTime.UtcNow - MaxAge;
                var batch = await StaleUnverified(db, cutoff).OrderBy(u => u.CreatedAt).Take(BatchSize).ToListAsync(stoppingToken);
                var removed = 0;
                foreach (var user in batch)
                {
                    var outcome = await deletion.DeleteAsync(user, stoppingToken);
                    if (outcome.Done) removed++;
                }
                if (removed > 0) logger.LogWarning("Removed {Count} sign-up(s) that never verified their email within 7 days.", removed);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Unverified-account clean-up pass failed; will retry in 6 hours.");
            }
        } while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }
}
