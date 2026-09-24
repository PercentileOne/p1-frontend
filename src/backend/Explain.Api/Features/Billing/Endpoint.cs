using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Features.Billing;

/// <summary>
/// Admin-facing revenue summary (Francis, 2026-09-24: "a financial page too... investors would
/// love it"). Deliberately reports only real, currently-known numbers — no fabricated growth
/// chart, since there's no historical snapshot table yet to build one honestly from. Two
/// different levels of confidence are kept explicit, not blended into one misleading total:
/// candidate subscription MRR is Stripe-verified (Subscriptions/PaymentRecords), while
/// organisation seat MRR is a manually-set rate (Organisation.SeatCount/SeatMonthlyFeeGbp) —
/// real committed revenue, but not yet itself Stripe-billed (see Organisations/Endpoint.cs).
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/admin/billing/summary", async (AppDbContext db) =>
        {
            var now = DateTime.UtcNow;
            var thirtyDaysAgo = now.AddDays(-30);

            var activeSubs = await db.Subscriptions.AsNoTracking()
                .Where(s => s.Status == "active")
                .ToListAsync();
            var candidateMrr = activeSubs.Sum(s => s.PriceGbp);

            var activeOrgs = await db.Organisations.AsNoTracking()
                .Where(o => o.Status == "active")
                .ToListAsync();
            var seatMrr = activeOrgs.Sum(o => o.SeatCount * o.EffectiveSeatMonthlyFeeGbp);

            var paidPasses = await db.InterviewPasses.AsNoTracking()
                .Where(p => p.Status == "paid" && p.PaidAt != null)
                .ToListAsync();
            var paidPacks = await db.QuestionPacks.AsNoTracking()
                .Where(p => p.Status == "paid" && p.PaidAt != null)
                .ToListAsync();

            var oneOffLast30Days = paidPasses.Where(p => p.PaidAt >= thirtyDaysAgo).Sum(p => p.AmountGbp)
                + paidPacks.Where(p => p.PaidAt >= thirtyDaysAgo).Sum(p => p.AmountGbp);
            var oneOffAllTime = paidPasses.Sum(p => p.AmountGbp) + paidPacks.Sum(p => p.AmountGbp);

            var recentPassTx = paidPasses
                .Select(p => new { type = p.Source == "gift" ? "Interview Gift" : "Interview Pass", label = p.RecipientEmail, amountGbp = p.AmountGbp, at = p.PaidAt!.Value });
            var recentPackTx = paidPacks
                .Select(p => new { type = "Question Pack", label = p.JobRole, amountGbp = p.AmountGbp, at = p.PaidAt!.Value });
            var recentSubTx = await db.PaymentRecords.AsNoTracking()
                .Where(p => p.Status == "succeeded")
                .OrderByDescending(p => p.PaidAt)
                .Take(30)
                .Join(db.Users, p => p.UserId, u => u.Id, (p, u) => new { type = "Subscription", label = u.Email, amountGbp = p.AmountGbp, at = p.PaidAt })
                .ToListAsync();

            var recentTransactions = recentSubTx
                .Concat(recentPassTx)
                .Concat(recentPackTx)
                .OrderByDescending(t => t.at)
                .Take(30)
                .ToList();

            return Results.Ok(new
            {
                candidateMrrGbp = candidateMrr,
                seatMrrGbp = seatMrr,
                totalMrrGbp = candidateMrr + seatMrr,
                activeSubscriberCount = activeSubs.Count,
                activeOrganisationCount = activeOrgs.Count,
                oneOffLast30DaysGbp = oneOffLast30Days,
                oneOffAllTimeGbp = oneOffAllTime,
                recentTransactions,
            });
        }).RequireAuthorization(Permissions.ViewAdminPortal);
    }
}
