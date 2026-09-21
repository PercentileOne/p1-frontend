using System.Net;
using Microsoft.EntityFrameworkCore;
using Stripe.Checkout;
using Explain.Api.Common;
using Explain.Api.Features.Entitlements;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Email;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;
using OrgMembers = Explain.Api.Features.Organisations.Members.Endpoint;

namespace Explain.Api.Features.AccessRequests;

/// <summary>
/// Recruiter / employer onboarding (Francis, 2026-09-21). They can't self-register — they get candidate data — so each is vetted by a person:
///   1. Public "Request access" form -> a row here + an email to Francis (and a confirmation to them).
///   2. Francis calls them; the admin portal's Access requests page tracks status and notes.
///   3. "Create organisation & invite" makes the organisation and the first account and emails a set-password link.
///   4. "Send payment link" creates a Stripe Checkout for the monthly fee and emails it; the webhook marks the request paid.
/// Public submission is capped per visitor and per day and has a honeypot field; everything under /api/admin needs ManageOrganisations.
/// </summary>
public static class Endpoint
{
    public const decimal RecruiterSeatGbp = 299m;
    public const decimal EmployerSeatGbp = 399m;
    private static readonly string[] Statuses = ["new", "contacted", "approved", "paid", "declined"];

    public record CreateRequest(string? Name, string? Company, string? Email, string? Phone, string? Type, int? Seats, string? Message, string? Website);
    public record UpdateRequest(string? Status, string? Notes, decimal? QuotedMonthlyGbp, int? Seats);
    public record PaymentLinkRequest(decimal? MonthlyGbp);

    public static decimal DefaultSeatFee(string type) => type == "employer" ? EmployerSeatGbp : RecruiterSeatGbp;

    public static void Map(WebApplication app)
    {
        // ── Public: the "Request access" form ──────────────────────────────────────────────────────────────────────────────────────
        app.MapPost("/api/access-requests", async (CreateRequest req, HttpContext ctx, AppDbContext db, CosmosService cosmos, IEmailSender email, IConfiguration config, ILogger<Program> logger) =>
        {
            // Honeypot: a real person never sees or fills this field. Answer "fine" so a bot learns nothing.
            if (!string.IsNullOrWhiteSpace(req.Website)) return Results.Ok(new { ok = true });

            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var (ok, error, entity) = Validate(req, ip);
            if (!ok) return Results.BadRequest(new { error });

            if (!(await CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync($"accessreq:ip:{ip}", 5, cosmos)).allowed
                || !(await CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync("accessreq:global", 100, cosmos)).allowed)
                return Results.Json(new { error = "Too many requests today — please email francis@percentile.one instead." }, statusCode: (int)HttpStatusCode.TooManyRequests);

            // A double click or a resubmit from the same person shouldn't create two rows or send two emails.
            var since = DateTime.UtcNow.AddHours(-24);
            var lowerEmail = entity!.Email;
            if (await db.AccessRequests.AnyAsync(r => r.Email == lowerEmail && r.Status == "new" && r.CreatedAt > since))
                return Results.Ok(new { ok = true });

            db.AccessRequests.Add(entity);
            await db.SaveChangesAsync();
            logger.LogWarning("New access request {Id}: {Type} — {Company} <{Email}>", entity.Id, entity.Type, entity.Company, entity.Email);

            try { await SendNewRequestEmailsAsync(entity, email, config); }
            catch (Exception ex) { logger.LogError(ex, "Access request {Id} was saved but its emails failed to send", entity.Id); }   // the row is what matters
            return Results.Ok(new { ok = true });
        }).AllowAnonymous();

        // ── Admin ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        app.MapGet("/api/admin/access-requests", async (string? status, AppDbContext db) =>
        {
            var q = db.AccessRequests.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(status) && Statuses.Contains(status)) q = q.Where(r => r.Status == status);
            var rows = await q.OrderByDescending(r => r.CreatedAt).Take(300).ToListAsync();
            return Results.Ok(rows.Select(r => new
            {
                r.Id, r.Name, r.Company, r.Email, r.Phone, r.Type, r.Seats, r.Message, r.Status, r.Notes, r.QuotedMonthlyGbp, r.OrganisationId,
                r.PaymentLinkSentAt, r.PaidAt, r.HandledBy, r.CreatedAt, r.UpdatedAt,
                DefaultSeatFeeGbp = DefaultSeatFee(r.Type),
            }));
        }).RequireAuthorization(Permissions.ManageOrganisations);

        app.MapPut("/api/admin/access-requests/{id}", async (string id, UpdateRequest req, HttpContext ctx, AppDbContext db) =>
        {
            var r = await db.AccessRequests.FirstOrDefaultAsync(x => x.Id == id);
            if (r is null) return Results.NotFound(new { error = "Request not found." });
            if (req.Status is not null)
            {
                if (!Statuses.Contains(req.Status)) return Results.BadRequest(new { error = "Unknown status." });
                r.Status = req.Status;
            }
            if (req.Notes is not null) r.Notes = req.Notes.Trim()[..Math.Min(req.Notes.Trim().Length, 4000)];
            if (req.QuotedMonthlyGbp is { } q) r.QuotedMonthlyGbp = q is > 0 and <= 5000 ? Math.Round(q, 2) : null;
            if (req.Seats is { } s) r.Seats = Math.Clamp(s, 1, 200);
            r.HandledBy = ctx.User.FindFirst("email")?.Value ?? r.HandledBy;
            r.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        }).RequireAuthorization(Permissions.ManageOrganisations);

        // Creates the organisation (if there isn't one yet) and the first account, and emails the set-password link.
        app.MapPost("/api/admin/access-requests/{id}/create-account", async (string id, HttpContext ctx, AppDbContext db, IEmailSender email, ILogger<Program> logger) =>
        {
            var r = await db.AccessRequests.FirstOrDefaultAsync(x => x.Id == id);
            if (r is null) return Results.NotFound(new { error = "Request not found." });
            if (r.Status == "declined") return Results.BadRequest(new { error = "This request was declined." });

            var org = r.OrganisationId is int oid ? await db.Organisations.FirstOrDefaultAsync(o => o.Id == oid) : null;
            if (org is null)
            {
                org = new Organisation
                {
                    Name = r.Company, Type = r.Type == "employer" ? "business" : "recruitment",
                    ContactEmail = r.Email, ContactName = r.Name, Phone = r.Phone, SeatCount = r.Seats,
                    SeatMonthlyFeeGbp = r.QuotedMonthlyGbp ?? DefaultSeatFee(r.Type), Status = "active",
                };
                db.Organisations.Add(org);
                await db.SaveChangesAsync();
            }

            var (user, invited) = await EnsureFirstMemberAsync(db, org, r);
            r.OrganisationId = org.Id;
            if (r.Status is "new" or "contacted") r.Status = "approved";
            r.HandledBy = ctx.User.FindFirst("email")?.Value ?? r.HandledBy;
            r.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            if (invited)
            {
                try { await OrgMembers.SendInviteEmailAsync(user, org, db, email, logger); }
                catch (Exception ex) { logger.LogError(ex, "Invite email for access request {Id} failed", r.Id); }
            }
            return Results.Ok(new { organisationId = org.Id, invited, email = user.Email });
        }).RequireAuthorization(Permissions.ManageOrganisations);

        // A Stripe Checkout link for the monthly fee (valid 24 hours — Stripe's maximum for Checkout), emailed to the requester and
        // returned so it can also be copied. Ask for a fresh one any time; the price comes from the quote, or the standard fee for the type.
        app.MapPost("/api/admin/access-requests/{id}/payment-link", async (string id, PaymentLinkRequest? body, HttpContext ctx, AppDbContext db, IEmailSender email, IConfiguration config, ILogger<Program> logger) =>
        {
            var r = await db.AccessRequests.FirstOrDefaultAsync(x => x.Id == id);
            if (r is null) return Results.NotFound(new { error = "Request not found." });
            if (r.Status == "declined") return Results.BadRequest(new { error = "This request was declined." });
            if (string.IsNullOrWhiteSpace(config["Stripe:SecretKey"])) return Results.Json(new { error = "Stripe isn't configured." }, statusCode: 503);

            var perSeat = body?.MonthlyGbp ?? r.QuotedMonthlyGbp ?? DefaultSeatFee(r.Type);
            if (perSeat is <= 0 or > 5000) return Results.BadRequest(new { error = "Enter a monthly price between £1 and £5,000." });
            perSeat = Math.Round(perSeat, 2);
            var site = config["MarketingSiteUrl"] ?? "https://www.theinterviewchair.com";

            Session session;
            try
            {
                session = await new SessionService().CreateAsync(new SessionCreateOptions
                {
                    Mode = "subscription",
                    ManagedPayments = new SessionManagedPaymentsOptions { Enabled = false },   // same as the other checkouts (see SessionPasses/Checkout)
                    CustomerEmail = r.Email,
                    LineItems =
                    [
                        new SessionLineItemOptions
                        {
                            Quantity = r.Seats,
                            PriceData = new SessionLineItemPriceDataOptions
                            {
                                Currency = "gbp",
                                UnitAmount = (long)Math.Round(perSeat * 100),
                                Recurring = new SessionLineItemPriceDataRecurringOptions { Interval = "month" },
                                ProductData = new SessionLineItemPriceDataProductDataOptions { Name = $"TheInterviewChair.com — {(r.Type == "employer" ? "Employer" : "Recruiter")} access ({r.Company})" },
                            },
                        },
                    ],
                    SuccessUrl = $"{site}/request-access.html?paid=1",
                    CancelUrl = $"{site}/request-access.html?cancelled=1",
                    Metadata = new Dictionary<string, string> { ["accessRequestId"] = r.Id },
                    SubscriptionData = new SessionSubscriptionDataOptions { Metadata = new Dictionary<string, string> { ["accessRequestId"] = r.Id } },
                });
            }
            catch (Stripe.StripeException ex)
            {
                logger.LogError(ex, "Stripe checkout for access request {Id} failed", r.Id);
                return Results.Json(new { error = "Stripe couldn't create the payment link — check the logs." }, statusCode: 502);
            }

            r.StripeCheckoutSessionId = session.Id;
            r.PaymentLinkSentAt = DateTime.UtcNow;
            r.QuotedMonthlyGbp ??= perSeat;
            r.HandledBy = ctx.User.FindFirst("email")?.Value ?? r.HandledBy;
            r.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var emailed = true;
            try { await SendPaymentLinkEmailAsync(r, session.Url, perSeat, email); }
            catch (Exception ex) { emailed = false; logger.LogError(ex, "Payment link email for {Id} failed", r.Id); }
            return Results.Ok(new { url = session.Url, perSeat, seats = r.Seats, emailed, validForHours = 24 });
        }).RequireAuthorization(Permissions.ManageOrganisations);
    }

    // ── Validation (public input — nothing is trusted) ─────────────────────────────────────────────────────────────────────────────
    public static (bool Ok, string? Error, AccessRequest? Request) Validate(CreateRequest req, string? ip)
    {
        var name = (req.Name ?? "").Trim();
        var company = (req.Company ?? "").Trim();
        var email = (req.Email ?? "").Trim().ToLowerInvariant();
        var phone = (req.Phone ?? "").Trim();
        var type = (req.Type ?? "recruiter").Trim().ToLowerInvariant();

        if (name.Length is < 2 or > 120) return (false, "Please tell us your name.", null);
        if (company.Length is < 2 or > 160) return (false, "Please tell us your company or organisation.", null);
        if (email.Length > 320 || !EmailNormaliser.LooksLikeEmail(email)) return (false, "Please enter a valid work email address.", null);
        if (phone.Length > 50 || phone.Count(char.IsDigit) < 7) return (false, "Please enter a phone number we can call you on.", null);
        if (type is not ("recruiter" or "employer")) return (false, "Please choose recruiter or employer.", null);

        var message = (req.Message ?? "").Trim();
        return (true, null, new AccessRequest
        {
            Name = name, Company = company, Email = email, Phone = phone, Type = type,
            Seats = Math.Clamp(req.Seats ?? 1, 1, 200),
            Message = message.Length == 0 ? null : message[..Math.Min(message.Length, 2000)],
            IpAddress = ip,
        });
    }

    // ── First account for the organisation (same rules as adding a member in the admin portal) ─────────────────────────────────────
    private static async Task<(User User, bool Invited)> EnsureFirstMemberAsync(AppDbContext db, Organisation org, AccessRequest r)
    {
        var (roleId, roleName) = org.Type == "business" ? (3, "Employer") : (2, "Recruiter");
        var email = r.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        var invited = false;
        if (user is null)
        {
            var parts = r.Name.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            user = new User
            {
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N")),   // unguessable; the invite link is the way in
                FirstName = parts.Length > 0 ? parts[0] : r.Name.Trim(),
                LastName = parts.Length > 1 ? parts[1] : "",
                Role = roleName,
                EmailVerified = true,   // an administrator vetted them and the invite goes to this very address
            };
            db.Users.Add(user);
            invited = true;
        }
        if (!await db.UserRoles.AnyAsync(ur => ur.UserId == user.Id && ur.RoleId == roleId))
            db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
        if (!await db.OrganisationMembers.AnyAsync(m => m.OrganisationId == org.Id && m.UserId == user.Id))
            db.OrganisationMembers.Add(new OrganisationMember { OrganisationId = org.Id, UserId = user.Id, Role = "admin" });
        await db.SaveChangesAsync();
        return (user, invited);
    }

    /// <summary>Called by the Stripe webhook when a payment-link checkout completes. Returns true if the session belonged to an access request.</summary>
    public static async Task<AccessRequest?> MarkPaidAsync(AppDbContext db, Session session)
    {
        if (session.Metadata is null || !session.Metadata.TryGetValue("accessRequestId", out var id)) return null;
        var r = await db.AccessRequests.FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return null;
        r.Status = "paid";
        r.PaidAt = DateTime.UtcNow;
        r.StripeSubscriptionId = session.SubscriptionId ?? r.StripeSubscriptionId;
        r.UpdatedAt = DateTime.UtcNow;
        if (r.OrganisationId is int oid)
        {
            var org = await db.Organisations.FirstOrDefaultAsync(o => o.Id == oid);
            if (org is not null) org.Status = "active";
        }
        await db.SaveChangesAsync();
        return r;
    }

    // ── Emails ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    private static string E(string? s) => WebUtility.HtmlEncode(s ?? "");

    private static async Task SendNewRequestEmailsAsync(AccessRequest r, IEmailSender email, IConfiguration config)
    {
        var to = config["AccessRequests:NotifyEmail"] ?? "francis@percentile.one";
        var body = $"""
            <div style="font-family:sans-serif;max-width:620px;margin:0 auto;">
              <h2 style="color:#4f8ef7;">New {E(r.Type)} access request</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 0;color:#666;width:120px;">Name</td><td style="padding:8px 0;font-weight:bold;">{E(r.Name)}</td></tr>
                <tr><td style="padding:8px 0;color:#666;">Company</td><td style="padding:8px 0;font-weight:bold;">{E(r.Company)}</td></tr>
                <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:{E(r.Email)}">{E(r.Email)}</a></td></tr>
                <tr><td style="padding:8px 0;color:#666;">Phone</td><td style="padding:8px 0;">{E(r.Phone)}</td></tr>
                <tr><td style="padding:8px 0;color:#666;">Seats</td><td style="padding:8px 0;">{r.Seats}</td></tr>
                <tr><td style="padding:8px 0;color:#666;vertical-align:top;">Message</td><td style="padding:8px 0;">{E(r.Message ?? "—")}</td></tr>
              </table>
              <p style="margin-top:22px;"><a href="https://admin.interviewme.global/access-requests" style="background:#34d399;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;">Open in the admin portal</a></p>
              <p style="color:#999;font-size:12px;">Call them, then create their organisation and send the payment link from the Access requests page.</p>
            </div>
            """;
        await email.SendAsync(to, $"New {r.Type} access request — {r.Company}", body, replyToEmail: r.Email);

        var ack = $"""
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
              <p style="font-size:18px;font-weight:700;"><span style="color:#34d399">The</span>Interview<span style="color:#34d399">Chair</span>.com</p>
              <p>Hi {E(r.Name.Split(' ')[0])},</p>
              <p>Thank you for asking about {E(r.Type)} access for <strong>{E(r.Company)}</strong>. We set up every account personally, so Francis will call you on <strong>{E(r.Phone)}</strong> shortly to talk it through and get you started.</p>
              <p>If anything changes, just reply to this email.</p>
              <p style="color:#666;">— The TheInterviewChair.com team</p>
            </div>
            """;
        await email.SendAsync(r.Email, "We've received your request — TheInterviewChair.com", ack, replyToEmail: to);
    }

    private static async Task SendPaymentLinkEmailAsync(AccessRequest r, string? url, decimal perSeat, IEmailSender email)
    {
        var total = perSeat * r.Seats;
        var body = $"""
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
              <p style="font-size:18px;font-weight:700;"><span style="color:#34d399">The</span>Interview<span style="color:#34d399">Chair</span>.com</p>
              <p>Hi {E(r.Name.Split(' ')[0])},</p>
              <p>Here is your secure payment link for <strong>{E(r.Company)}</strong>:</p>
              <p style="background:#f4f6ff;border-radius:10px;padding:14px 18px;">{r.Seats} seat{(r.Seats == 1 ? "" : "s")} × £{perSeat:0.00} per month = <strong>£{total:0.00} per month</strong></p>
              <p style="margin:26px 0;"><a href="{E(url)}" style="background:#34d399;color:#fff;padding:14px 30px;border-radius:12px;text-decoration:none;font-weight:700;">Set up payment →</a></p>
              <p style="color:#666;font-size:13px;">This link is valid for 24 hours. If it has expired, reply to this email and we'll send a fresh one. Payment is handled securely by Stripe — we never see your card details.</p>
            </div>
            """;
        await email.SendAsync(r.Email, "Your payment link — TheInterviewChair.com", body, replyToEmail: "francis@percentile.one");
    }
}
