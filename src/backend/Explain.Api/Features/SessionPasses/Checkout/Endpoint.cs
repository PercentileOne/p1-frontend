using Stripe;
using Stripe.Checkout;
using Explain.Api.Features.SessionPasses;

namespace Explain.Api.Features.SessionPasses.Checkout;

/// <summary>
/// Phase 2 of the Interview Gift feature (Francis, 2026-09-16) — Stripe payment on top of Phase
/// 1's entitlement core (see Features/SessionPasses/Endpoint.cs). Two endpoints:
///
/// POST /api/session-passes/checkout — creates the pending SessionPass, then a Stripe Checkout
/// Session for it, and returns the hosted Checkout URL for the frontend to redirect to. Uses
/// Stripe's own hosted Checkout page rather than Stripe.js/Elements embedded client-side — no
/// publishable key needed anywhere in the frontend at all, keeping every Stripe credential
/// server-only, same principle as every other third-party API key in this codebase (see
/// CLAUDE.md's "one rule that matters most").
///
/// POST /api/session-passes/webhook — Stripe's server-to-server notification once a Checkout
/// Session actually completes. This, not the client-side success-page redirect, is the only
/// thing allowed to mark a pass paid — the redirect can be skipped, replayed, or reached without
/// ever actually paying (see SessionPassService.MarkPaidAsync's own comment).
///
/// AllowAnonymous on both: checkout has no logged-in-candidate requirement (a "gift" purchase is
/// typically bought by someone who isn't a candidate at all — a friend/family member with no
/// account), same reasoning as /interviews/avatar-session; the webhook is called by Stripe's own
/// servers, which never carry our JWT, and is authenticated instead by its Stripe-Signature
/// header (see HandleWebhook below) — that signature check IS this endpoint's auth.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/session-passes/checkout", HandleCheckout).AllowAnonymous();

        // Lets gift-interview-success.html (a static page with no build step, no auth) greet the
        // recipient by name after Stripe redirects back with ?session_id=... — see
        // SessionPassService.GetByCheckoutSessionIdAsync's own comment on why this is safe
        // AllowAnonymous. Only ever returns the recipient's first name, nothing sensitive.
        app.MapGet("/api/session-passes/checkout-session/{sessionId}", HandleGetByCheckoutSession).AllowAnonymous();

        // Raw-body access is required for Stripe's signature verification (EventUtility.
        // ConstructEvent hashes the exact bytes Stripe sent — any JSON re-serialization, even
        // semantically identical, breaks the signature) — so this reads HttpContext directly
        // rather than taking a model-bound parameter.
        app.MapPost("/api/session-passes/webhook", HandleWebhook).AllowAnonymous();
    }

    public record CheckoutRequest(
        string RecipientEmail,
        string RecipientName,
        string? RecipientJobTitle,
        string TierId, // "gift-3day" | "gift-1week" | "self" — see PassTiers
        string? SenderName,
        string? SenderEmail);

    private static async Task<IResult> HandleCheckout(
        CheckoutRequest req, SessionPassService passes, IConfiguration config, ILogger<Program> logger)
    {
        if (string.IsNullOrWhiteSpace(req.RecipientEmail) || string.IsNullOrWhiteSpace(req.RecipientName))
            return Results.BadRequest(new { message = "Recipient email and name are required." });

        var tier = PassTiers.Get(req.TierId);
        if (tier is null)
            return Results.BadRequest(new { message = $"Unknown pass tier: {req.TierId}" });

        var pass = await passes.CreatePendingAsync(
            req.RecipientEmail, req.RecipientName, req.RecipientJobTitle,
            req.TierId, req.SenderName, req.SenderEmail);

        // Whoever's actually paying gets the pre-filled Checkout email — the sender for a gift
        // (they may have no account and no relationship to recipientEmail at all), the recipient
        // themselves for a self-purchase.
        var payerEmail = tier.Source == "gift" && !string.IsNullOrWhiteSpace(req.SenderEmail)
            ? req.SenderEmail
            : pass.recipientEmail;

        // Gift purchases are started from the public marketing site (src/viewme/public/
        // home.html's "Gift an Interview" section → gift-interview.html) by someone who may have
        // no candidate account at all, so success/cancel must land back on THAT site, not the
        // logged-in candidate app. Self-purchases happen inside the candidate app itself.
        //
        // NOT config["AppUrl"] for either — confirmed live 2026-09-16 that Azure setting holds a
        // COMMA-SEPARATED LIST of CORS origins (Program.cs's own CORS setup splits it on ','),
        // not a single URL, and doesn't even include candidate.theinterviewchair.com (that domain
        // reaches CORS only via Program.cs's hardcoded knownOrigins, never through this setting).
        // Reading it as a single URL produced a visibly broken multi-origin string in Stripe's
        // actual Checkout cancel-link href during live testing. CandidateAppUrl/MarketingAppUrl
        // are new, distinct settings — deliberately not reusing AppUrl, to avoid colliding with
        // its CORS-list role.
        var appUrl = tier.Source == "gift"
            ? config["MarketingAppUrl"] ?? "http://localhost:5178"
            : config["CandidateAppUrl"] ?? "http://localhost:5173";

        var options = new SessionCreateOptions
        {
            Mode = "payment",
            // No PaymentMethodTypes here — this Stripe account has Managed Payments enabled
            // (its default for new accounts), which selects payment methods automatically and
            // rejects an explicit payment_method_types list as an unsupported/conflicting
            // parameter. Confirmed live 2026-09-16 via a real StripeException on this exact line.
            //
            // Managed Payments explicitly disabled for this session, rather than adding a
            // product tax code (Stripe's other suggested fix) — Managed Payments' automatic tax
            // calculation is a bigger feature/behavior change than this integration needs right
            // now (single-country, fixed-price digital passes), also confirmed via a real
            // StripeException ("product tax code is missing") on the first attempt at this fix.
            ManagedPayments = new SessionManagedPaymentsOptions { Enabled = false },
            PaymentMethodTypes = ["card"],
            CustomerEmail = payerEmail,
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "gbp",
                        UnitAmount = (long)(tier.AmountGbp * 100),
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = tier.Source == "gift"
                                ? $"TheInterviewChair.com — Gift Interview Pass for {pass.recipientName}"
                                : "TheInterviewChair.com — Interview Pass",
                            Description = $"{tier.SessionsTotal} practice interview session(s), valid {tier.WindowDays} days from purchase.",
                        },
                    },
                },
            ],
            SuccessUrl = tier.Source == "gift"
                ? $"{appUrl}/gift-interview-success.html?session_id={{CHECKOUT_SESSION_ID}}"
                : $"{appUrl}/interview-gift/success?session_id={{CHECKOUT_SESSION_ID}}",
            CancelUrl = tier.Source == "gift"
                ? $"{appUrl}/gift-interview.html"
                : $"{appUrl}/interview-gift/cancelled",
            // Read back in the webhook to find the right pass — passId alone would be enough
            // (recipientEmail is derivable from it), but including both means MarkPaidAsync's
            // required (passId, recipientEmail) pair never needs a lookup-by-passId-alone query.
            Metadata = new Dictionary<string, string>
            {
                ["passId"] = pass.id,
                ["recipientEmail"] = pass.recipientEmail,
            },
        };

        SessionService service = new();
        Session session;
        try
        {
            session = await service.CreateAsync(options);
        }
        catch (StripeException ex)
        {
            logger.LogError(ex, "Stripe Checkout Session creation failed for pass {PassId}", pass.id);
            return Results.Problem("Could not start checkout — please try again.", statusCode: 502);
        }

        await passes.AttachCheckoutSessionAsync(pass.id, pass.recipientEmail, session.Id);

        return Results.Ok(new { checkoutUrl = session.Url });
    }

    private static async Task<IResult> HandleGetByCheckoutSession(string sessionId, SessionPassService passes)
    {
        var pass = await passes.GetByCheckoutSessionIdAsync(sessionId);
        if (pass is null) return Results.NotFound();

        var firstName = pass.recipientName.Split(' ', 2)[0];
        return Results.Ok(new { recipientFirstName = firstName });
    }

    private static async Task<IResult> HandleWebhook(
        HttpContext ctx, SessionPassService passes, IConfiguration config, ILogger<Program> logger)
    {
        var webhookSecret = config["Stripe:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            logger.LogError("Stripe:WebhookSecret is not configured — webhook cannot be verified, refusing to process.");
            return Results.Problem("Webhook not configured.", statusCode: 500);
        }

        using var reader = new StreamReader(ctx.Request.Body);
        var json = await reader.ReadToEndAsync();

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, ctx.Request.Headers["Stripe-Signature"], webhookSecret);
        }
        catch (StripeException ex)
        {
            // Wrong/missing signature — either a misconfigured secret or a forged request. Either
            // way this is never a payload we should act on; 400 tells Stripe not to retry it.
            logger.LogWarning(ex, "Stripe webhook signature verification failed.");
            return Results.BadRequest();
        }

        if (stripeEvent.Type == "checkout.session.completed" && stripeEvent.Data.Object is Session session)
        {
            var passId = session.Metadata.GetValueOrDefault("passId");
            var recipientEmail = session.Metadata.GetValueOrDefault("recipientEmail");
            if (string.IsNullOrWhiteSpace(passId) || string.IsNullOrWhiteSpace(recipientEmail))
            {
                logger.LogWarning("checkout.session.completed for Stripe session {SessionId} is missing passId/recipientEmail metadata.", session.Id);
                return Results.Ok(); // ack to Stripe regardless — retrying won't add the missing metadata
            }

            await passes.MarkPaidAsync(passId, recipientEmail, session.PaymentIntentId);
        }
        // Every other event type is ignored — this endpoint only subscribes to
        // checkout.session.completed in the Stripe dashboard, but Stripe's own docs recommend
        // tolerating unexpected event types gracefully rather than erroring on them.

        return Results.Ok();
    }
}
