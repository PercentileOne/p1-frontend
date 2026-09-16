using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Email;

namespace Explain.Api.Features.SessionPasses;

/// <summary>
/// Source-agnostic — every method here works identically for a gifted pass and a self-purchase
/// pass, the only difference is which PassTiers entry was used to create it. Keeps the entire
/// entitlement mechanism in one place rather than duplicating it per tier.
/// </summary>
public class SessionPassService(CosmosService cosmos, IEmailSender emailSender, ILogger<SessionPassService> logger)
{
    private Container Container => cosmos.GetContainer("sessionPasses");

    public async Task<SessionPass> CreatePendingAsync(
        string recipientEmail, string recipientName, string? recipientJobTitle,
        string tierId, string? senderName, string? senderEmail)
    {
        var tier = PassTiers.Get(tierId) ?? throw new ArgumentException($"Unknown pass tier: {tierId}");
        var email = recipientEmail.Trim().ToLower();

        var pass = new SessionPass(
            id: Guid.NewGuid().ToString(),
            recipientEmail: email,
            recipientName: recipientName.Trim(),
            recipientJobTitle: string.IsNullOrWhiteSpace(recipientJobTitle) ? null : recipientJobTitle.Trim(),
            tierId: tierId,
            source: tier.Source,
            senderName: senderName?.Trim(),
            senderEmail: senderEmail?.Trim().ToLower(),
            status: "pending",
            stripeCheckoutSessionId: null,
            stripePaymentIntentId: null,
            amountGbp: tier.AmountGbp,
            currency: "GBP",
            sessionsTotal: tier.SessionsTotal,
            sessionsUsed: 0,
            createdAt: DateTimeOffset.UtcNow,
            paidAt: null,
            expiresAt: null,
            redeemedByUserId: null);

        await Container.CreateItemAsync(pass, new PartitionKey(email));
        return pass;
    }

    public async Task AttachCheckoutSessionAsync(string passId, string recipientEmail, string stripeCheckoutSessionId)
    {
        await Container.PatchItemAsync<SessionPass>(passId, new PartitionKey(recipientEmail),
            [PatchOperation.Replace("/stripeCheckoutSessionId", stripeCheckoutSessionId)]);
    }

    // Called only from the Stripe webhook (checkout.session.completed) — never from the
    // client-side success redirect, which can be skipped, replayed, or reached without ever
    // actually paying. Idempotent: a pass already marked paid is left alone, since Stripe can
    // redeliver the same event more than once.
    public async Task<SessionPass?> MarkPaidAsync(string passId, string recipientEmail, string stripePaymentIntentId)
    {
        var existing = await Container.ReadItemAsync<SessionPass>(passId, new PartitionKey(recipientEmail));
        if (existing.Resource.status == "paid") return existing.Resource; // already handled — Stripe redelivered the event

        var tier = PassTiers.Get(existing.Resource.tierId);
        var windowDays = tier?.WindowDays ?? 7;
        var paidAt = DateTimeOffset.UtcNow;

        var updated = existing.Resource with
        {
            status = "paid",
            stripePaymentIntentId = stripePaymentIntentId,
            paidAt = paidAt,
            expiresAt = paidAt.AddDays(windowDays),
        };
        await Container.ReplaceItemAsync(updated, passId, new PartitionKey(recipientEmail));

        // Gift only — a self-purchase candidate is already logged in and already knows they just
        // paid; the recipient of a GIFT is very likely someone with no account yet who has no
        // other way of finding out. Same reasoning, and the same "email failure never blocks the
        // real operation" resilience pattern, as InterviewPreps' SendInviteEmailAsync (Features/
        // InterviewPreps/Endpoint.cs) — this call sits inside the webhook handler's request, and
        // Stripe will retry the whole webhook on a non-2xx response, so a flaky email provider
        // must never turn into a retried MarkPaidAsync (harmless — idempotent — but wasteful) or
        // an unhandled 500 back to Stripe.
        if (updated.source == "gift")
        {
            try
            {
                await SendGiftInviteEmailAsync(updated);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send gift invite email to {Email} for pass {PassId}", updated.recipientEmail, updated.id);
            }
        }

        return updated;
    }

    // Mirrors InterviewPreps' SendInviteEmailAsync (Features/InterviewPreps/Endpoint.cs) almost
    // exactly — same /register?email=&firstName=&lastName= deep link (no token; RegisterPage.tsx
    // reads these query params, skips the role picker, forces role=Candidate, and always lands
    // on /dashboard once registration completes — see that file's `isInvited` handling), same
    // "no claim/link step" principle: the moment an account exists with a matching email, this
    // pass just appears via GET /api/session-passes/received, exactly like a received prep does.
    // recipientName isn't split into first/last on the intake form (single field, unlike
    // InterviewPrep's explicit FirstName/LastName), so it's split here on the first space.
    private async Task SendGiftInviteEmailAsync(SessionPass pass)
    {
        var nameParts = pass.recipientName.Split(' ', 2);
        var firstName = nameParts[0];
        var lastName = nameParts.Length > 1 ? nameParts[1] : "";

        var registerUrl = "https://candidate.theinterviewchair.com/register" +
            $"?email={Uri.EscapeDataString(pass.recipientEmail)}" +
            $"&firstName={Uri.EscapeDataString(firstName)}" +
            $"&lastName={Uri.EscapeDataString(lastName)}";

        var senderName = string.IsNullOrWhiteSpace(pass.senderName) ? "Someone" : pass.senderName;
        var expiresStr = pass.expiresAt?.ToString("dddd d MMMM") ?? "soon";

        var body = $"""
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#07080f;font-family:-apple-system,'Segoe UI',sans-serif;">
              <div style="max-width:560px;margin:40px auto;padding:0 20px;">
                <div style="text-align:center;margin-bottom:28px;">
                  <p style="font-size:18px;font-weight:700;color:#fff;margin:0;">
                    <strong style="color:#34D399">The</strong><strong style="color:#fff">Interview</strong><strong style="color:#34D399">Chair</strong><span style="color:rgba(255,255,255,0.55);font-weight:400">.com</span>
                  </p>
                </div>

                <div style="background:linear-gradient(160deg,#0d1117 0%,#0f1b16 100%);border:1px solid rgba(52,211,153,0.25);border-radius:20px;padding:44px 36px 36px;box-shadow:0 0 60px rgba(52,211,153,0.08);">

                  <div style="text-align:center;margin-bottom:22px;">
                    <span style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;background:radial-gradient(circle,rgba(52,211,153,0.22) 0%,rgba(52,211,153,0.06) 70%);font-size:28px;">🎁</span>
                  </div>

                  <p style="text-align:center;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#34D399;margin:0 0 10px;">A gift from {WebUtility.HtmlEncode(senderName)}</p>

                  <h1 style="text-align:center;font-size:23px;font-weight:800;color:#fff;margin:0 0 18px;line-height:1.35;">
                    {WebUtility.HtmlEncode(firstName)}, you've been sent an Interview Gift
                  </h1>

                  <p style="text-align:center;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin:0 0 28px;">
                    {WebUtility.HtmlEncode(senderName)} thinks you could use some interview practice — so they've sent you <strong style="color:#fff">{pass.sessionsTotal} practice interview session(s)</strong> on TheInterviewChair.com, valid until <strong style="color:#fff">{expiresStr}</strong>.
                  </p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
                    <tr>
                      <td style="padding:0 0 14px;vertical-align:top;width:26px;">
                        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,0.15);color:#34D399;font-size:12px;font-weight:800;line-height:20px;text-align:center;">✓</span>
                      </td>
                      <td style="padding:0 0 14px 10px;vertical-align:top;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;">Practice with Amina &amp; Wayne, our AI interviewers, in a realistic mock interview</td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 14px;vertical-align:top;width:26px;">
                        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,0.15);color:#34D399;font-size:12px;font-weight:800;line-height:20px;text-align:center;">✓</span>
                      </td>
                      <td style="padding:0 0 14px 10px;vertical-align:top;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;">Instant, honest scoring and feedback to sharpen every answer</td>
                    </tr>
                    <tr>
                      <td style="padding:0;vertical-align:top;width:26px;">
                        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,0.15);color:#34D399;font-size:12px;font-weight:800;line-height:20px;text-align:center;">✓</span>
                      </td>
                      <td style="padding:0 0 0 10px;vertical-align:top;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;">Already paid for — nothing more for you to do but start</td>
                    </tr>
                  </table>

                  <div style="text-align:center;margin-bottom:16px;">
                    <a href="{registerUrl}" style="display:inline-block;background:linear-gradient(135deg,#34D399,#059669);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 8px 24px rgba(52,211,153,0.35);">
                      Claim your gift →
                    </a>
                  </div>
                  <p style="text-align:center;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(52,211,153,0.6);margin:0 0 28px;">Sign in with this email address to unlock it</p>

                  <p style="font-size:11px;color:rgba(255,255,255,0.25);line-height:1.7;margin:0;word-break:break-all;text-align:center;">
                    Or copy this link into your browser:<br/>{registerUrl}
                  </p>
                </div>

                <p style="text-align:center;font-size:12px;color:rgba(255,255,255,0.25);margin-top:24px;">
                  A gift from {WebUtility.HtmlEncode(senderName)}, sent via TheInterviewChair.com
                </p>
              </div>
            </body>
            </html>
            """;

        await emailSender.SendAsync(
            pass.recipientEmail,
            $"🎁 {senderName} sent you an Interview Gift",
            body,
            replyToEmail: pass.senderEmail);
        logger.LogInformation("Gift invite sent to {Email} for pass {PassId}", pass.recipientEmail, pass.id);
    }

    // Single-partition query (see CosmosService's own comment on why /recipientEmail is the
    // partition key) — every active, unexpired, unexhausted pass for this candidate, soonest-
    // expiring first so redemption naturally drains the pass closest to lapsing.
    public async Task<List<SessionPass>> GetActiveForEmailAsync(string email)
    {
        var normalised = email.Trim().ToLower();
        var query = new QueryDefinition(
            "SELECT * FROM c WHERE c.recipientEmail = @email AND c.status = 'paid' AND c.sessionsUsed < c.sessionsTotal AND c.expiresAt > @now ORDER BY c.expiresAt ASC")
            .WithParameter("@email", normalised)
            .WithParameter("@now", DateTimeOffset.UtcNow.ToString("o"));

        var results = new List<SessionPass>();
        using var feed = Container.GetItemQueryIterator<SessionPass>(query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(normalised) });
        while (feed.HasMoreResults)
            results.AddRange(await feed.ReadNextAsync());
        return results;
    }

    // Same "increment first, then check the result" idiom as CareerCoach's daily-usage counter
    // — simpler than a conditional patch, and the realistic race window here (one candidate
    // redeeming their own small session cap) doesn't justify the extra complexity of a
    // FilterPredicate-guarded patch. Returns false (nothing consumed) if there's no active pass
    // with room left, so the caller can show "no sessions left" rather than silently succeed.
    public async Task<bool> CheckAndConsumeAsync(string email)
    {
        var active = await GetActiveForEmailAsync(email);
        var pass = active.FirstOrDefault();
        if (pass is null) return false;

        var patched = await Container.PatchItemAsync<SessionPass>(pass.id, new PartitionKey(pass.recipientEmail),
            [PatchOperation.Increment("/sessionsUsed", 1)]);
        return patched.Resource.sessionsUsed <= patched.Resource.sessionsTotal;
    }
}
