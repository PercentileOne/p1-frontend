using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json.Linq;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Sql;
using SqlUser = Explain.Api.Infrastructure.Sql.Models.User;   // Microsoft.Azure.Cosmos also has a 'User'

namespace Explain.Api.Features.Users.DeleteAccount;

public record DeletionOutcome(bool Done, string? Error, Dictionary<string, int> Removed);

/// <summary>
/// Right to erasure (Francis, 2026-09-21; privacy policy: "delete your account and data within one month"). Removes a person from every
/// store that holds their data, in this order so a failure is safe to retry:
///   1. Stripe — cancel any live subscription (so we never keep charging someone who has gone). Failure aborts everything.
///   2. Cosmos documents (profile, interviews, talks, alerts, CV history, coach threads, reactions/comments they wrote, event log…)
///      and Blob files (interview recordings, profile images). Failures abort before step 3.
///   3. Azure SQL — the account, sign-in history, follows, access grants, the free-interview usage record (deleted with the account, as
///      Francis decided), and finally the user row. Only reached if steps 1–2 fully succeeded, so a half-deleted account can just retry.
/// Kept on purpose, for accounting: Subscriptions and PaymentRecords rows (keyed by an opaque id, no email/name). Interview passes are
/// anonymised (the buyer's/recipient's email and name are blanked) rather than deleted. The system-events archive is a rolling
/// 12-month blob store of anonymous-ish activity; it ages out on its own lifecycle rule and is not rewritten per user.
/// Every step is idempotent (missing containers/documents/blobs count as already gone).
/// </summary>
public class AccountDeletionService(AppDbContext db, CosmosService cosmos, IConfiguration config, ILogger<AccountDeletionService> logger)
{
    // Containers partitioned by this user's id (partition key path in comments).
    private static readonly string[] OwnedByUserId =
    [
        "profiles",              // /userId
        "lessonHistory",         // /userId
        "interviews",            // /candidateId
        "certExamSessions",      // /candidateId
        "talks",                 // /candidateId
        "qaLog",                 // /candidateId
        "questionBank",          // /candidateId
        "careerCoachThreads",    // /candidateId
        "careerCoachUsage",      // /candidateId
        "profileViewCounters",   // /candidateId
        "learnAlerts",           // /candidateId
        "learnAlertQuestions",   // /candidateId
        "alerts",                // /ownerId
        "alertMatches",          // /ownerId
        "cvAnalysisHistory",     // /ownerId
        "cvAnalysisUsage",       // /rateLimitKey (= candidate id when signed in)
        "introductions",         // /senderId
        "profile-comments",      // /profileUserId — everything left on their own profile
    ];

    // (container, field that identifies the user, that container's partition key field) — things they created in OTHER people's partitions.
    private static readonly (string Container, string UserField, string PkField)[] AuthoredElsewhere =
    [
        ("reactions", "userId", "targetId"),
        ("profile-comments", "authorUserId", "profileUserId"),
        ("systemEvents", "userId", "sessionId"),
    ];

    // Blob containers whose files live under "<userId>/".
    private static readonly string[] BlobContainers = ["interview-recordings", "profile-images"];

    public async Task<DeletionOutcome> DeleteAsync(SqlUser user, CancellationToken ct = default)
    {
        var removed = new Dictionary<string, int>();
        try
        {
            removed["stripeSubscriptionsCancelled"] = await CancelStripeAsync(user.Id, ct);

            foreach (var name in OwnedByUserId)
                removed[name] = await DeleteInPartitionAsync(name, user.Id, ct);
            foreach (var (container, userField, pkField) in AuthoredElsewhere)
                removed[$"{container}:by-user"] = await DeleteWhereAsync(container, userField, user.Id, pkField, ct);
            foreach (var container in BlobContainers)
                removed[$"blobs:{container}"] = await DeleteBlobsAsync(container, user.Id, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Nothing personal has been removed from SQL yet, so the account is intact and a retry simply carries on.
            logger.LogError(ex, "Account deletion for {UserId} stopped before the SQL step; safe to retry.", user.Id);
            return new DeletionOutcome(false, "We couldn't finish deleting your data just now. Nothing has been lost — please try again in a few minutes.", removed);
        }

        try
        {
            removed["sql"] = await PurgeSqlAsync(user, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Account deletion for {UserId} failed in the SQL step; safe to retry.", user.Id);
            return new DeletionOutcome(false, "We couldn't finish deleting your account just now. Please try again in a few minutes.", removed);
        }

        logger.LogWarning("Account {UserId} deleted at the account holder's request: {Removed}", user.Id, string.Join(", ", removed.Select(kv => $"{kv.Key}={kv.Value}")));
        return new DeletionOutcome(true, null, removed);
    }

    // ── Azure SQL (public so it can be tested against SQLite) ────────────────────────────────────────────────────────────────────
    public async Task<int> PurgeSqlAsync(SqlUser user, CancellationToken ct = default)
    {
        var id = user.Id;
        var email = user.Email.Trim().ToLowerInvariant();
        var emailKey = Explain.Api.Features.Entitlements.EmailNormaliser.Key(user.Email);
        var total = 0;

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        total += await db.Follows.Where(f => f.FollowerId == id || f.FolloweeId == id).ExecuteDeleteAsync(ct);
        total += await db.PasswordResetTokens.Where(t => t.UserId == id).ExecuteDeleteAsync(ct);
        total += await db.LoginHistories.Where(h => h.UserId == id).ExecuteDeleteAsync(ct);
        total += await db.InterviewUsages.Where(u => u.UserId == id || u.EmailKey == emailKey).ExecuteDeleteAsync(ct);   // incl. the free-interview record
        total += await db.AccessGrants.Where(g => g.UserId == id || g.Email == email).ExecuteDeleteAsync(ct);
        total += await db.OrganisationMembers.Where(m => m.UserId == id).ExecuteDeleteAsync(ct);
        total += await db.PortalFeedbacks.Where(f => f.Email != null && f.Email.ToLower() == email).ExecuteDeleteAsync(ct);

        // Passes are kept for accounting but stop naming a person.
        total += await db.InterviewPasses.Where(p => p.RecipientEmail == email)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.RecipientEmail, "deleted-account").SetProperty(p => p.RecipientName, "Deleted account")
                                      .SetProperty(p => p.RedeemedByUserId, (string?)null), ct);
        total += await db.InterviewPasses.Where(p => p.SenderEmail == email)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.SenderEmail, (string?)null).SetProperty(p => p.SenderName, (string?)null), ct);

        // UserRoles cascade with the user row.
        total += await db.Users.Where(u => u.Id == id).ExecuteDeleteAsync(ct);

        await tx.CommitAsync(ct);
        return total;
    }

    // ── Stripe ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    private async Task<int> CancelStripeAsync(string userId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(config["Stripe:SecretKey"])) return 0;
        var ids = await db.Subscriptions.AsNoTracking().Where(s => s.UserId == userId && s.StripeSubscriptionId != null)
            .Select(s => s.StripeSubscriptionId!).ToListAsync(ct);
        var cancelled = 0;
        var svc = new Stripe.SubscriptionService();
        foreach (var subId in ids)
        {
            try
            {
                var sub = await svc.GetAsync(subId, cancellationToken: ct);
                if (sub.Status != "canceled") { await svc.CancelAsync(subId, cancellationToken: ct); cancelled++; }
            }
            catch (Stripe.StripeException ex) when (ex.StripeError?.Code == "resource_missing") { /* already gone in Stripe */ }
        }
        return cancelled;
    }

    // ── Cosmos ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    private async Task<int> DeleteInPartitionAsync(string containerName, string partitionValue, CancellationToken ct)
    {
        var container = cosmos.GetContainer(containerName);
        var ids = new List<string>();
        try
        {
            using var feed = container.GetItemQueryIterator<JObject>(new QueryDefinition("SELECT c.id FROM c"),
                requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(partitionValue) });
            while (feed.HasMoreResults)
                foreach (var d in await feed.ReadNextAsync(ct)) ids.Add((string)d["id"]!);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return 0; }   // container not created in this environment

        foreach (var docId in ids) await DeleteDocAsync(container, docId, new PartitionKey(partitionValue), ct);
        return ids.Count;
    }

    private async Task<int> DeleteWhereAsync(string containerName, string userField, string userId, string pkField, CancellationToken ct)
    {
        var container = cosmos.GetContainer(containerName);
        var docs = new List<(string Id, string Pk)>();
        try
        {
            // Field names come from the constants above, never from input. Cross-partition by design (the user's things sit in other people's partitions).
            using var feed = container.GetItemQueryIterator<JObject>(
                new QueryDefinition($"SELECT c.id, c.{pkField} FROM c WHERE c.{userField} = @u").WithParameter("@u", userId));
            while (feed.HasMoreResults)
                foreach (var d in await feed.ReadNextAsync(ct)) docs.Add(((string)d["id"]!, (string?)d[pkField] ?? ""));
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return 0; }

        foreach (var (docId, pk) in docs) await DeleteDocAsync(container, docId, new PartitionKey(pk), ct);
        return docs.Count;
    }

    private static async Task DeleteDocAsync(Container container, string id, PartitionKey pk, CancellationToken ct)
    {
        try { await container.DeleteItemAsync<object>(id, pk, cancellationToken: ct); }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { /* already gone */ }
    }

    // ── Blob storage ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
    private async Task<int> DeleteBlobsAsync(string containerName, string userId, CancellationToken ct)
    {
        var connectionString = config.GetConnectionString("BlobStorage");
        if (string.IsNullOrWhiteSpace(connectionString)) return 0;
        var container = new BlobContainerClient(connectionString, containerName);
        var count = 0;
        try
        {
            await foreach (var blob in container.GetBlobsAsync(BlobTraits.None, BlobStates.None, userId + "/", ct))
            {
                await container.DeleteBlobIfExistsAsync(blob.Name, cancellationToken: ct);
                count++;
            }
        }
        catch (RequestFailedException ex) when (ex.Status == 404) { return 0; }   // container doesn't exist yet
        return count;
    }
}
