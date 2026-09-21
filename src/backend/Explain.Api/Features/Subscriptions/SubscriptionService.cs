using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Subscriptions;

/// <summary>
/// The £4.99/month candidate subscription (Francis, 2026-09-21). Stripe is the source of truth for whether someone is subscribed;
/// this keeps a local copy (the Subscriptions table) that the entitlement rules read, updated ONLY from Stripe webhooks — never
/// from the browser's success redirect, which can be skipped, replayed or reached without paying.
///
/// A row is keyed by StripeSubscriptionId. Every method is idempotent, since Stripe redelivers events.
/// </summary>
public class CandidateSubscriptionService(AppDbContext db, ILogger<CandidateSubscriptionService> logger)
{
    public const decimal PriceGbp = 4.99m;

    // Stripe status -> ours. "cancelled" is only reached at the END of a paid period (Stripe keeps a cancelled-at-period-end
    // subscription "active" until then), so the entitlement rule can simply treat active/past_due as access.
    public static string MapStatus(string? stripeStatus) => stripeStatus switch
    {
        "active" or "trialing" => "active",
        "past_due" => "past_due",          // payment failed, Stripe is still retrying — access continues meanwhile
        "unpaid" or "canceled" => "cancelled",
        _ => "incomplete",                  // incomplete / incomplete_expired / paused
    };

    // checkout.session.completed with mode=subscription — the moment someone first pays.
    public async Task ApplyCheckoutCompletedAsync(Session session)
    {
        var userId = session.ClientReferenceId ?? session.Metadata?.GetValueOrDefault("userId");
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(session.SubscriptionId))
        {
            logger.LogWarning("Subscription checkout {SessionId} is missing userId or subscription id", session.Id);
            return;
        }

        var sub = await new Stripe.SubscriptionService().GetAsync(session.SubscriptionId);
        await UpsertAsync(userId, session.CustomerId, sub);
    }

    // customer.subscription.created / updated / deleted — renewals, failed payments, cancellations.
    public async Task SyncAsync(Stripe.Subscription sub)
    {
        var userId = sub.Metadata?.GetValueOrDefault("userId");
        if (string.IsNullOrWhiteSpace(userId))
        {
            userId = await db.Subscriptions.AsNoTracking().Where(s => s.StripeSubscriptionId == sub.Id).Select(s => s.UserId).FirstOrDefaultAsync();
        }
        if (string.IsNullOrWhiteSpace(userId))
        {
            logger.LogWarning("Stripe subscription {SubId} event has no userId (metadata or existing row) — ignored", sub.Id);
            return;
        }
        await UpsertAsync(userId, sub.CustomerId, sub);
    }

    private async Task UpsertAsync(string userId, string? customerId, Stripe.Subscription sub)
    {
        var row = await db.Subscriptions.FirstOrDefaultAsync(s => s.StripeSubscriptionId == sub.Id);
        if (row is null)
        {
            row = new Infrastructure.Sql.Models.Subscription
            {
                UserId = userId, Plan = "candidate", PriceGbp = PriceGbp, BillingCycle = "monthly",
                StripeSubscriptionId = sub.Id, StartedAt = DateTime.UtcNow,
            };
            db.Subscriptions.Add(row);
        }

        row.StripeCustomerId = customerId ?? sub.CustomerId ?? row.StripeCustomerId;
        row.Status = MapStatus(sub.Status);
        // Current period end lives on the subscription's item in the newer Stripe API versions.
        var periodEnd = sub.Items?.Data?.FirstOrDefault()?.CurrentPeriodEnd;
        if (periodEnd is DateTime end) row.RenewsAt = DateTime.SpecifyKind(end, DateTimeKind.Utc);
        if (row.Status == "cancelled") row.CancelledAt ??= DateTime.UtcNow;
        row.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        logger.LogInformation("Subscription {SubId} for user {UserId} is now {Status}, paid until {End}", sub.Id, userId, row.Status, row.RenewsAt);
    }
}

