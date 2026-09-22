using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.QuestionPacks;

/// <summary>
/// "Printable Interview Questions" (Francis, 2026-09-22) — the standalone, no-login, no-live-interview product this whole app
/// actually started as an idea for: name a job role, pay a small one-off fee, download a PDF of 25 AI-written questions with model
/// answers. Stored in Azure SQL, same reasoning as InterviewPass (SessionPassService) — a paid, one-off entitlement belongs beside
/// Subscriptions/AccessGrants, not in Cosmos.
/// </summary>
public class QuestionPackService(AppDbContext db)
{
    public record QaPair(string Question, string Answer);

    public static List<QaPair> ParseQuestions(string json)
    {
        try { return JsonSerializer.Deserialize<List<QaPair>>(json, JsonOpts) ?? []; }
        catch { return []; }
    }

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public async Task<QuestionPack> CreatePendingAsync(string jobRole, string? focusAreas, List<QaPair> questions, decimal amountGbp)
    {
        var pack = new QuestionPack
        {
            JobRole = jobRole.Trim(),
            FocusAreas = string.IsNullOrWhiteSpace(focusAreas) ? null : focusAreas.Trim(),
            QuestionsJson = JsonSerializer.Serialize(questions),
            Status = "pending",
            AmountGbp = amountGbp,
            Currency = "GBP",
        };
        db.QuestionPacks.Add(pack);
        await db.SaveChangesAsync();
        return pack;
    }

    public async Task AttachCheckoutSessionAsync(string packId, string stripeCheckoutSessionId)
    {
        var pack = await db.QuestionPacks.FirstOrDefaultAsync(p => p.Id == packId);
        if (pack is null) return;
        pack.StripeCheckoutSessionId = stripeCheckoutSessionId;
        await db.SaveChangesAsync();
    }

    // Called only from the Stripe webhook (checkout.session.completed) — same reasoning as SessionPassService.MarkPaidAsync: never
    // trust the client-side success redirect, which can be skipped, replayed, or reached without ever actually paying. Idempotent.
    public async Task<QuestionPack?> MarkPaidAsync(string packId, string stripePaymentIntentId, string? buyerEmail)
    {
        var pack = await db.QuestionPacks.FirstOrDefaultAsync(p => p.Id == packId);
        if (pack is null) return null;
        if (pack.Status == "paid") return pack; // already handled — Stripe redelivered the event

        pack.Status = "paid";
        pack.StripePaymentIntentId = stripePaymentIntentId;
        pack.BuyerEmail = string.IsNullOrWhiteSpace(buyerEmail) ? null : buyerEmail.Trim().ToLower();
        pack.PaidAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return pack;
    }

    // The only lookup the success page ever needs — by Stripe's own opaque session id, same trust level as
    // SessionPassService.GetByCheckoutSessionIdAsync. Returns null (not just "not paid") if the pack isn't paid yet, so the caller
    // can't distinguish "wrong id" from "not paid" — nothing sensitive either way, but no reason to leak the difference.
    public async Task<QuestionPack?> GetPaidByCheckoutSessionIdAsync(string checkoutSessionId)
    {
        var pack = await db.QuestionPacks.AsNoTracking().FirstOrDefaultAsync(p => p.StripeCheckoutSessionId == checkoutSessionId);
        return pack is { Status: "paid" } ? pack : null;
    }

    public async Task MarkRefundedByPaymentIntentAsync(string paymentIntentId)
    {
        var rows = await db.QuestionPacks.Where(p => p.StripePaymentIntentId == paymentIntentId && p.Status != "refunded").ToListAsync();
        foreach (var pack in rows) pack.Status = "refunded";
        if (rows.Count > 0) await db.SaveChangesAsync();
    }
}
