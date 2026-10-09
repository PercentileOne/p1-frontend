using System.Security.Cryptography;
using Microsoft.Azure.Cosmos;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.AccessCodes;

// Invite codes (2026-10-09): a code typed (or carried in a link) at registration that gives that person free access, with their own email and password. Redeeming one just adds the same
// "comp" access grant an admin could add by hand on the Access page, so every access check (Features/Entitlements) already understands it, and "revoke" works the same way.
// Codes live in Cosmos (a handful of small documents, one partition), so no database migration is needed.
//
// Admin (Access > Invite codes): create a code (a name for it, how many people may use it, an end date, and how long the free access then lasts), switch it off, see who used it.
// Public: POST /api/access-codes/check tells the registration form whether a code is good (rate limited, so codes cannot be guessed in bulk).

public record Redemption(string email, DateTimeOffset at);

/// <summary>One invite code. Property names are lowercase because that is how they are stored (same convention as the other platform documents).</summary>
public record AccessCode(
    string id, string pk, string label, bool active, int? maxUses, int uses, DateTimeOffset? expiresAt, int? grantDays,
    DateTimeOffset createdAt, string createdBy, List<Redemption> redemptions);

public static class Endpoint
{
    public const string ContainerName = "accessCodes";
    public const string Partition = "codes";
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I, so a code read aloud or typed from a message is not misread
    private const int MaxRedemptionsKept = 500;

    /// <summary>Upper-case letters and digits only (spaces, dashes and the like are ignored), 4 to 24 of them; anything else is not a code.</summary>
    public static string? Normalise(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var s = new string(raw.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        return s.Length is >= 4 and <= 24 ? s : null;
    }

    /// <summary>Why this code cannot be used right now, or null if it can.</summary>
    public static string? CheckUsable(AccessCode c, DateTimeOffset now)
    {
        if (!c.active) return "That invite code is no longer active.";
        if (c.expiresAt is { } end && end <= now) return "That invite code has expired.";
        if (c.maxUses is { } max && c.uses >= max) return "That invite code has already been used the maximum number of times.";
        return null;
    }

    public static async Task<AccessCode?> FindAsync(CosmosService cosmos, string normalised, CancellationToken ct = default)
    {
        try { return (await cosmos.GetContainer(ContainerName).ReadItemAsync<AccessCode>(normalised, new PartitionKey(Partition), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return null; }
    }

    /// <summary>
    /// Counts a use of the code and adds the free-access grant for this email. Safe to call twice for the same person (the grant is only added once). Returns false if the code
    /// could not be used after all (someone else took the last place a moment earlier), in which case nothing is granted.
    /// </summary>
    public static async Task<bool> RedeemAsync(CosmosService cosmos, AppDbContext db, string normalisedCode, string email, string? userId, CancellationToken ct = default)
    {
        var container = cosmos.GetContainer(ContainerName);
        AccessCode? used = null;
        for (var attempt = 0; attempt < 4 && used is null; attempt++)
        {
            ItemResponse<AccessCode> read;
            try { read = await container.ReadItemAsync<AccessCode>(normalisedCode, new PartitionKey(Partition), cancellationToken: ct); }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { return false; }
            var code = read.Resource;
            if (CheckUsable(code, DateTimeOffset.UtcNow) is not null) return false;
            var redemptions = (code.redemptions ?? []).Append(new Redemption(email, DateTimeOffset.UtcNow)).TakeLast(MaxRedemptionsKept).ToList();
            var next = code with { uses = code.uses + 1, redemptions = redemptions };
            try
            {
                await container.ReplaceItemAsync(next, normalisedCode, new PartitionKey(Partition), new ItemRequestOptions { IfMatchEtag = read.ETag }, ct);
                used = next;
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.PreconditionFailed) { /* someone else used it at the same moment: read again and retry */ }
        }
        if (used is null) return false;

        var lower = email.Trim().ToLowerInvariant();
        var already = await db.AccessGrants.AnyAsync(g => g.Email == lower && g.RevokedAt == null && (g.ExpiresAt == null || g.ExpiresAt > DateTime.UtcNow), ct);
        if (!already)
        {
            db.AccessGrants.Add(new AccessGrant
            {
                Email = lower, UserId = userId, Kind = "comp",
                Reason = $"Invite code {used.id} ({used.label})", GrantedBy = "invite code",
                ExpiresAt = used.grantDays is { } days ? DateTime.UtcNow.AddDays(days) : null,
            });
            await db.SaveChangesAsync(ct);
        }
        return true;
    }

    private static string NewCode() => new(Enumerable.Range(0, 8).Select(_ => Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)]).ToArray());

    public static void Map(WebApplication app)
    {
        // ── Admin ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        app.MapGet("/api/admin/access-codes", async (CosmosService cosmos, CancellationToken ct) =>
        {
            var list = new List<AccessCode>();
            try
            {
                using var feed = cosmos.GetContainer(ContainerName).GetItemQueryIterator<AccessCode>(new QueryDefinition("SELECT * FROM c"), requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(Partition) });
                while (feed.HasMoreResults) list.AddRange(await feed.ReadNextAsync(ct));
            }
            catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound) { /* nothing created yet */ }
            return Results.Ok(list.OrderByDescending(c => c.createdAt));
        }).RequireAuthorization(Permissions.ManageUsers).WithName("AdminAccessCodes").WithTags("AccessCodes");

        app.MapPost("/api/admin/access-codes", async (SaveRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var (clean, error) = Validate(req);
            if (error is not null) return Results.BadRequest(new { error });
            var wanted = string.IsNullOrWhiteSpace(req.Code) ? null : Normalise(req.Code);
            if (!string.IsNullOrWhiteSpace(req.Code) && wanted is null) return Results.BadRequest(new { error = "A code is 4 to 24 letters and numbers." });
            var id = wanted ?? NewCode();
            if (await FindAsync(cosmos, id, ct) is not null) return Results.Conflict(new { error = $"The code {id} already exists." });
            var doc = new AccessCode(id, Partition, clean!.Label, true, clean.MaxUses, 0, clean.ExpiresAt, clean.GrantDays, DateTimeOffset.UtcNow, ctx.User.FindFirst("email")?.Value ?? "admin", []);
            await cosmos.GetContainer(ContainerName).CreateItemAsync(doc, new PartitionKey(Partition), cancellationToken: ct);
            return Results.Ok(doc);
        }).RequireAuthorization(Permissions.ManageUsers).WithName("AdminCreateAccessCode").WithTags("AccessCodes");

        app.MapPut("/api/admin/access-codes/{code}", async (string code, SaveRequest req, CosmosService cosmos, CancellationToken ct) =>
        {
            var id = Normalise(code);
            var existing = id is null ? null : await FindAsync(cosmos, id, ct);
            if (existing is null) return Results.NotFound();
            var (clean, error) = Validate(req);
            if (error is not null) return Results.BadRequest(new { error });
            var next = existing with { label = clean!.Label, active = req.Active ?? existing.active, maxUses = clean.MaxUses, expiresAt = clean.ExpiresAt, grantDays = clean.GrantDays };
            await cosmos.GetContainer(ContainerName).UpsertItemAsync(next, new PartitionKey(Partition), cancellationToken: ct);
            return Results.Ok(next);
        }).RequireAuthorization(Permissions.ManageUsers).WithName("AdminSaveAccessCode").WithTags("AccessCodes");

        // ── Public: is this code any good? (for the registration form) ───────────────────────────────────────────────────────────────────────────
        app.MapPost("/api/access-codes/check", async (CheckRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            if (!(await Explain.Api.Features.CvAnalysis.Endpoint.CheckAndIncrementDailyUsageAsync($"accesscode:check:ip:{ip}", 60, cosmos)).allowed)
                return Results.Json(new { valid = false, message = "Too many tries today. Please try again tomorrow." }, statusCode: 429);
            var id = Normalise(req.Code);
            var found = id is null ? null : await FindAsync(cosmos, id, ct);
            if (found is null) return Results.Ok(new { valid = false, message = "That invite code isn't valid." });
            var problem = CheckUsable(found, DateTimeOffset.UtcNow);
            return Results.Ok(new { valid = problem is null, message = problem ?? "Invite code accepted: your free access starts when you register." });
        }).AllowAnonymous().WithName("CheckAccessCode").WithTags("AccessCodes");
    }

    public record SaveRequest(string? Code, string? Label, bool? Active, int? MaxUses, DateTimeOffset? ExpiresAt, int? GrantDays);
    public record CheckRequest(string? Code);
    public record CleanCode(string Label, int? MaxUses, DateTimeOffset? ExpiresAt, int? GrantDays);

    public static (CleanCode? Value, string? Error) Validate(SaveRequest r)
    {
        var label = (r.Label ?? "").Trim();
        if (label.Length is < 2 or > 80) return (null, "Give the code a name (2 to 80 characters), so you remember who it is for.");
        if (label.Any(char.IsControl)) return (null, "The name contains characters that are not allowed.");
        if (r.MaxUses is < 1 or > 100000) return (null, "How many people may use it: 1 to 100,000, or leave blank for no limit.");
        if (r.GrantDays is < 1 or > 3650) return (null, "How long the free access lasts: 1 to 3,650 days, or leave blank for no end.");
        return (new CleanCode(label, r.MaxUses, r.ExpiresAt, r.GrantDays), null);
    }
}
