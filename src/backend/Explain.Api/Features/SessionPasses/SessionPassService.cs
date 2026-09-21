using System.Net;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Infrastructure.Email;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.SessionPasses;

/// <summary>
/// Source-agnostic — every method here works identically for a gifted pass and a self-purchase
/// pass, the only difference is which PassTiers entry was used to create it. Keeps the entire
/// entitlement mechanism in one place rather than duplicating it per tier.
///
/// Stored in Azure SQL (table InterviewPasses) since 2026-09-21 — it used to be a Cosmos container. The public shape is still the
/// SessionPass record, so the endpoints, the gift email and the UI are unchanged; this class maps between the two.
/// </summary>
public class SessionPassService(AppDbContext db, IEmailSender emailSender, ILogger<SessionPassService> logger)
{
    internal static SessionPass ToRecord(InterviewPass e) => new(
        id: e.Id, recipientEmail: e.RecipientEmail, recipientName: e.RecipientName, recipientJobTitle: e.RecipientJobTitle,
        tierId: e.TierId, source: e.Source, senderName: e.SenderName, senderEmail: e.SenderEmail, status: e.Status,
        stripeCheckoutSessionId: e.StripeCheckoutSessionId, stripePaymentIntentId: e.StripePaymentIntentId,
        amountGbp: e.AmountGbp, currency: e.Currency, sessionsTotal: e.SessionsTotal, sessionsUsed: e.SessionsUsed,
        createdAt: Utc(e.CreatedAt), paidAt: e.PaidAt is { } p ? Utc(p) : null, expiresAt: e.ExpiresAt is { } x ? Utc(x) : null,
        redeemedByUserId: e.RedeemedByUserId);

    private static DateTimeOffset Utc(DateTime d) => new(DateTime.SpecifyKind(d, DateTimeKind.Utc));

    public async Task<SessionPass> CreatePendingAsync(
        string recipientEmail, string recipientName, string? recipientJobTitle,
        string tierId, string? senderName, string? senderEmail)
    {
        var tier = PassTiers.Get(tierId) ?? throw new ArgumentException($"Unknown pass tier: {tierId}");
        var email = recipientEmail.Trim().ToLower();

        var pass = new InterviewPass
        {
            RecipientEmail = email,
            RecipientName = recipientName.Trim(),
            RecipientJobTitle = string.IsNullOrWhiteSpace(recipientJobTitle) ? null : recipientJobTitle.Trim(),
            TierId = tierId,
            Source = tier.Source,
            SenderName = senderName?.Trim(),
            SenderEmail = senderEmail?.Trim().ToLower(),
            Status = "pending",
            AmountGbp = tier.AmountGbp,
            Currency = "GBP",
            SessionsTotal = tier.SessionsTotal,
        };
        db.InterviewPasses.Add(pass);
        await db.SaveChangesAsync();
        return ToRecord(pass);
    }

    public async Task AttachCheckoutSessionAsync(string passId, string recipientEmail, string stripeCheckoutSessionId)
    {
        var pass = await db.InterviewPasses.FirstOrDefaultAsync(p => p.Id == passId);
        if (pass is null) return;
        pass.StripeCheckoutSessionId = stripeCheckoutSessionId;
        await db.SaveChangesAsync();
    }

    // Called only from the Stripe webhook (checkout.session.completed) — never from the
    // client-side success redirect, which can be skipped, replayed, or reached without ever
    // actually paying. Idempotent: a pass already marked paid is left alone, since Stripe can
    // redeliver the same event more than once.
    public async Task<SessionPass?> MarkPaidAsync(string passId, string recipientEmail, string stripePaymentIntentId)
    {
        var entity = await db.InterviewPasses.FirstOrDefaultAsync(p => p.Id == passId);
        if (entity is null) return null;
        if (entity.Status == "paid") return ToRecord(entity); // already handled — Stripe redelivered the event

        var tier = PassTiers.Get(entity.TierId);
        var windowDays = tier?.WindowDays ?? 7;
        var paidAt = DateTime.UtcNow;

        entity.Status = "paid";
        entity.StripePaymentIntentId = stripePaymentIntentId;
        entity.PaidAt = paidAt;
        entity.ExpiresAt = paidAt.AddDays(windowDays);
        await db.SaveChangesAsync();
        var updated = ToRecord(entity);

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
        // Lead with the pass's marketing-facing name/window ("3-Day Pass"), not just the raw
        // session count — matches how it's sold on the tier cards, and reads as a clear deadline
        // rather than an abstract number (Francis, 2026-09-16).
        var tierLabel = PassTiers.Get(pass.tierId)?.Label ?? "Interview Pass";

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
                    {WebUtility.HtmlEncode(senderName)} thinks you could use some interview practice — so they've sent you a <strong style="color:#fff">{tierLabel}</strong> ({pass.sessionsTotal} practice interview sessions) on TheInterviewChair.com, free to use until <strong style="color:#fff">{expiresStr}</strong>.
                  </p>

                  <p style="text-align:center;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin:0 0 14px;">Everything unlocked for you until then</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
                    <tr>
                      <td style="padding:0 0 14px;vertical-align:top;width:26px;">
                        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,0.15);color:#34D399;font-size:12px;font-weight:800;line-height:20px;text-align:center;">✓</span>
                      </td>
                      <td style="padding:0 0 14px 10px;vertical-align:top;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;"><strong style="color:#fff">Practice</strong> — realistic mock interviews with Amina &amp; Wayne, our AI interviewers, with instant, honest scoring and feedback</td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 14px;vertical-align:top;width:26px;">
                        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,0.15);color:#34D399;font-size:12px;font-weight:800;line-height:20px;text-align:center;">✓</span>
                      </td>
                      <td style="padding:0 0 14px 10px;vertical-align:top;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;"><strong style="color:#fff">Learn</strong> — bite-sized lessons on exactly the skills interviewers test you on</td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 14px;vertical-align:top;width:26px;">
                        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,0.15);color:#34D399;font-size:12px;font-weight:800;line-height:20px;text-align:center;">✓</span>
                      </td>
                      <td style="padding:0 0 14px 10px;vertical-align:top;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;"><strong style="color:#fff">My Career Coach</strong> — coaching &amp; support whenever you're stuck</td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 14px;vertical-align:top;width:26px;">
                        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,0.15);color:#34D399;font-size:12px;font-weight:800;line-height:20px;text-align:center;">✓</span>
                      </td>
                      <td style="padding:0 0 14px 10px;vertical-align:top;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;"><strong style="color:#fff">My Talks</strong> — practice speaking your answers out loud, not just typing them</td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 14px;vertical-align:top;width:26px;">
                        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,0.15);color:#34D399;font-size:12px;font-weight:800;line-height:20px;text-align:center;">✓</span>
                      </td>
                      <td style="padding:0 0 14px 10px;vertical-align:top;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;"><strong style="color:#fff">Careers</strong> — explore roles and what they actually require</td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 14px;vertical-align:top;width:26px;">
                        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,0.15);color:#34D399;font-size:12px;font-weight:800;line-height:20px;text-align:center;">✓</span>
                      </td>
                      <td style="padding:0 0 14px 10px;vertical-align:top;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;"><strong style="color:#fff">Jobs</strong> — browse live roles while you're already here</td>
                    </tr>
                    <tr>
                      <td style="padding:0;vertical-align:top;width:26px;">
                        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,0.15);color:#34D399;font-size:12px;font-weight:800;line-height:20px;text-align:center;">✓</span>
                      </td>
                      <td style="padding:0 0 0 10px;vertical-align:top;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;"><strong style="color:#fff">Learn Alerts</strong> — short practice questions sent to your inbox so it sticks</td>
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

    // The only place a pass is fetched by its Stripe Checkout Session id rather than by id. Deliberately not a hot path: called once,
    // right after Checkout redirects back to gift-interview-success.html, purely so that page can greet the recipient by name
    // ("Danny will be able to sign in...") instead of "your recipient". The session id itself is Stripe's own opaque token, so this is
    // safe to expose AllowAnonymous — nobody can guess or enumerate it, same trust level as the redirect URL itself.
    public async Task<SessionPass?> GetByCheckoutSessionIdAsync(string checkoutSessionId)
    {
        var e = await db.InterviewPasses.AsNoTracking().FirstOrDefaultAsync(p => p.StripeCheckoutSessionId == checkoutSessionId);
        return e is null ? null : ToRecord(e);
    }

    // Every active, unexpired, unexhausted pass for this candidate, soonest-expiring first so redemption naturally drains the pass
    // closest to lapsing.
    public async Task<List<SessionPass>> GetActiveForEmailAsync(string email)
    {
        var normalised = email.Trim().ToLower();
        var now = DateTime.UtcNow;
        var rows = await db.InterviewPasses.AsNoTracking()
            .Where(p => p.RecipientEmail == normalised && p.Status == "paid" && p.SessionsUsed < p.SessionsTotal && p.ExpiresAt > now)
            .OrderBy(p => p.ExpiresAt)
            .ToListAsync();
        return rows.Select(ToRecord).ToList();
    }

    // charge.refunded: a fully refunded pass must stop working.
    public async Task MarkRefundedByPaymentIntentAsync(string paymentIntentId)
    {
        var rows = await db.InterviewPasses.Where(p => p.StripePaymentIntentId == paymentIntentId && p.Status != "refunded").ToListAsync();
        foreach (var pass in rows)
        {
            pass.Status = "refunded";
            logger.LogWarning("Interview pass {PassId} for {Email} refunded — no longer usable", pass.Id, pass.RecipientEmail);
        }
        if (rows.Count > 0) await db.SaveChangesAsync();
    }

    // Takes one session from the soonest-expiring active pass. The increment is a single guarded UPDATE
    // (SET SessionsUsed = SessionsUsed + 1 WHERE SessionsUsed < SessionsTotal), so two simultaneous starts can never take the same
    // last session. Returns false (nothing consumed) if no active pass has room, so the caller can say "no sessions left".
    public async Task<bool> CheckAndConsumeAsync(string email)
    {
        foreach (var pass in await GetActiveForEmailAsync(email))
        {
            var updated = await db.InterviewPasses
                .Where(p => p.Id == pass.id && p.SessionsUsed < p.SessionsTotal)
                .ExecuteUpdateAsync(set => set.SetProperty(p => p.SessionsUsed, p => p.SessionsUsed + 1));
            if (updated == 1) return true;
        }
        return false;
    }
}
