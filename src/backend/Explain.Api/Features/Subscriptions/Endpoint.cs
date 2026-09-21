using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Features.Subscriptions;

/// <summary>
/// Candidate-facing subscription endpoints (Francis, 2026-09-21). Checkout is Stripe's hosted page (same choice as the interview
/// passes: no publishable key in the browser, every Stripe credential stays server-side). The subscription's price lives in Stripe
/// as a recurring Price whose id is configured as Stripe:SubscriptionPriceId — until that is set, checkout answers 503 and the UI
/// says subscriptions are coming soon, rather than failing oddly.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // Is subscribing possible yet? (the UI hides or shows the Subscribe button on this)
        app.MapGet("/api/subscriptions/available", (IConfiguration config) =>
            Results.Ok(new { available = !string.IsNullOrWhiteSpace(config["Stripe:SubscriptionPriceId"]) })).AllowAnonymous();

        app.MapGet("/api/subscriptions/me", async (HttpContext ctx, AppDbContext db) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (userId is null) return Results.Unauthorized();
            var s = await db.Subscriptions.AsNoTracking().Where(x => x.UserId == userId && x.StripeSubscriptionId != null)
                .OrderByDescending(x => x.UpdatedAt).FirstOrDefaultAsync();
            return Results.Ok(s is null ? null : new { s.Status, s.Plan, s.PriceGbp, s.RenewsAt, s.CancelledAt });
        }).RequireAuthorization();

        app.MapPost("/api/subscriptions/checkout", async (HttpContext ctx, AppDbContext db, IConfiguration config, ILogger<Program> logger) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            var email = ctx.User.FindFirst("email")?.Value;
            if (userId is null || email is null) return Results.Unauthorized();

            var priceId = config["Stripe:SubscriptionPriceId"];
            if (string.IsNullOrWhiteSpace(priceId))
                return Results.Json(new { error = "Subscriptions aren't available just yet — please check back soon." }, statusCode: 503);

            // Already subscribed (or paid until period end)? Send them to manage it instead of paying twice.
            var now = DateTime.UtcNow;
            var existing = await db.Subscriptions.AsNoTracking().AnyAsync(s => s.UserId == userId &&
                (s.Status == "active" || s.Status == "past_due" || (s.Status == "cancelled" && s.RenewsAt != null && s.RenewsAt > now)));
            if (existing) return Results.Conflict(new { error = "You already have a subscription — use Manage subscription to change it." });

            var appUrl = config["CandidateAppUrl"] ?? "http://localhost:5173";
            var options = new SessionCreateOptions
            {
                Mode = "subscription",
                // Same Managed Payments handling as the interview-pass checkout (see SessionPasses/Checkout/Endpoint.cs).
                ManagedPayments = new SessionManagedPaymentsOptions { Enabled = false },
                CustomerEmail = email,
                ClientReferenceId = userId,
                LineItems = [new SessionLineItemOptions { Price = priceId, Quantity = 1 }],
                SuccessUrl = $"{appUrl}/dashboard?subscribed=1",
                CancelUrl = $"{appUrl}/dashboard?subscribe=cancelled",
                Metadata = new Dictionary<string, string> { ["userId"] = userId, ["email"] = email },
                // Also stamped on the Subscription itself, so renewal/cancellation events (which don't carry the checkout session)
                // can still be tied back to the account.
                SubscriptionData = new SessionSubscriptionDataOptions { Metadata = new Dictionary<string, string> { ["userId"] = userId } },
            };

            try
            {
                var session = await new SessionService().CreateAsync(options);
                return Results.Ok(new { checkoutUrl = session.Url });
            }
            catch (StripeException ex)
            {
                logger.LogError(ex, "Stripe subscription checkout failed for user {UserId}", userId);
                return Results.Problem("Could not start checkout — please try again.", statusCode: 502);
            }
        }).RequireAuthorization();

        // Stripe's own customer portal: update card, view invoices, cancel. Needs the portal enabled once in the Stripe dashboard.
        app.MapPost("/api/subscriptions/portal", async (HttpContext ctx, AppDbContext db, IConfiguration config, ILogger<Program> logger) =>
        {
            var userId = ctx.User.FindFirst("sub")?.Value;
            if (userId is null) return Results.Unauthorized();
            var customerId = await db.Subscriptions.AsNoTracking().Where(s => s.UserId == userId && s.StripeCustomerId != null)
                .OrderByDescending(s => s.UpdatedAt).Select(s => s.StripeCustomerId).FirstOrDefaultAsync();
            if (customerId is null) return Results.NotFound(new { error = "No subscription found for this account." });

            try
            {
                var portal = await new Stripe.BillingPortal.SessionService().CreateAsync(new Stripe.BillingPortal.SessionCreateOptions
                {
                    Customer = customerId,
                    ReturnUrl = $"{config["CandidateAppUrl"] ?? "http://localhost:5173"}/dashboard",
                });
                return Results.Ok(new { url = portal.Url });
            }
            catch (StripeException ex)
            {
                logger.LogError(ex, "Stripe customer portal session failed for user {UserId}", userId);
                return Results.Problem("Could not open the subscription portal — please try again.", statusCode: 502);
            }
        }).RequireAuthorization();
    }
}
