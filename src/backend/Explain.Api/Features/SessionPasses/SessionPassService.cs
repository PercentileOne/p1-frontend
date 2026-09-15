using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.SessionPasses;

/// <summary>
/// Source-agnostic — every method here works identically for a gifted pass and a self-purchase
/// pass, the only difference is which PassTiers entry was used to create it. Keeps the entire
/// entitlement mechanism in one place rather than duplicating it per tier.
/// </summary>
public class SessionPassService(CosmosService cosmos)
{
    private Container Container => cosmos.GetContainer("sessionPasses");

    public async Task<SessionPass> CreatePendingAsync(
        string recipientEmail, string recipientName, string? recipientJobTitle,
        string source, string? senderName, string? senderEmail)
    {
        var tier = PassTiers.Get(source) ?? throw new ArgumentException($"Unknown pass source: {source}");
        var email = recipientEmail.Trim().ToLower();

        var pass = new SessionPass(
            id: Guid.NewGuid().ToString(),
            recipientEmail: email,
            recipientName: recipientName.Trim(),
            recipientJobTitle: string.IsNullOrWhiteSpace(recipientJobTitle) ? null : recipientJobTitle.Trim(),
            source: source,
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

        var tier = PassTiers.Get(existing.Resource.source);
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
        return updated;
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
