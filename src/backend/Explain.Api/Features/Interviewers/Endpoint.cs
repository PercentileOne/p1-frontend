using System.Net;
using System.Text.RegularExpressions;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Interviewers;

/// <summary>
/// The interviewers registry (Francis, 2026-10-07): every interviewer a candidate can meet — their Spatius face, background picture, voice, a one-line description and their
/// personality settings — in one place that an admin edits, instead of three avatar-ID boxes and image files committed to the repo. The room, the picker at intake, the
/// demo and the marketing hero all read from here (see docs/specs/interviewers-and-picker-plan.md). One Cosmos document per interviewer, in a small container with a single
/// partition. Backgrounds live in a PRIVATE blob container and are served through <c>GET /interviewers/{id}/background</c> (never public blob access, CLAUDE.md section 2).
/// </summary>
public static partial class Endpoint
{
    public const string ContainerName = "interviewers";
    public const string AssetsContainer = "interviewer-assets";
    public const string Partition = "interviewer";
    private const long MaxBackgroundBytes = 6 * 1024 * 1024;

    public static readonly string[] Roles = ["hr", "technical", "briefing"];

    public static void Map(WebApplication app)
    {
        // ── Admin (Super Admin, like the avatar-provider setting: these decide who candidates meet) ──────────────────────────────────────────
        app.MapGet("/api/admin/interviewers", async (CosmosService cosmos, CancellationToken ct) =>
        {
            var list = await ListAsync(cosmos, activeOnly: false, ct);
            if (list.Count == 0) list = await SeedFromExistingSettingsAsync(cosmos, ct); // first visit: start from the avatars already in use
            return Results.Ok(list.Select(ToAdminDto));
        }).RequireAuthorization(Permissions.ViewSystemSettings).WithName("AdminInterviewers").WithTags("Interviewers");

        app.MapPut("/api/admin/interviewers/{id}", async (string id, SaveInterviewerRequest req, HttpContext ctx, CosmosService cosmos, CancellationToken ct) =>
        {
            if (!IsValidId(id)) return Results.BadRequest(new { error = "The id may only contain lowercase letters, numbers and hyphens (2 to 32 characters)." });
            var (clean, error) = Validate(req);
            if (error is not null) return Results.BadRequest(new { error });

            var existing = await GetAsync(cosmos, id, ct);
            var doc = new Interviewer(
                id: id, pk: Partition,
                displayName: clean!.DisplayName, role: clean.Role, spatiusAvatarId: clean.SpatiusAvatarId,
                voiceId: clean.VoiceId, description: clean.Description,
                depth: clean.Depth, strictness: clean.Strictness, warmth: clean.Warmth, humour: clean.Humour, pace: clean.Pace,
                active: clean.Active, sortOrder: clean.SortOrder, defaultFor: clean.DefaultFor,
                backgroundUrl: existing?.backgroundUrl,
                updatedAt: DateTimeOffset.UtcNow, updatedBy: ctx.User.FindFirst("sub")?.Value ?? "unknown");

            // Only one interviewer can be the default for a seat: taking it from another one is part of the same save.
            if (doc.defaultFor is not null) await ClearDefaultFromOthersAsync(cosmos, doc.defaultFor, id, ct);
            await cosmos.GetContainer(ContainerName).UpsertItemAsync(doc, new PartitionKey(Partition), cancellationToken: ct);
            InvalidateCache();
            return Results.Ok(ToAdminDto(doc));
        }).RequireAuthorization(Permissions.ViewSystemSettings).WithName("AdminSaveInterviewer").WithTags("Interviewers");

        app.MapDelete("/api/admin/interviewers/{id}", async (string id, CosmosService cosmos, IConfiguration config, CancellationToken ct) =>
        {
            if (!IsValidId(id)) return Results.BadRequest(new { error = "Unknown interviewer." });
            var existing = await GetAsync(cosmos, id, ct);
            if (existing is null) return Results.NotFound();
            if (existing.defaultFor is not null)
                return Results.BadRequest(new { error = $"{existing.displayName} is the default for the {existing.defaultFor} seat. Make another interviewer the default first." });
            try { await cosmos.GetContainer(ContainerName).DeleteItemAsync<Interviewer>(id, new PartitionKey(Partition), cancellationToken: ct); }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* already gone */ }
            InvalidateCache();
            var assets = AssetsClient(config);
            if (assets is not null) { try { await foreach (var b in assets.GetBlobsAsync(BlobTraits.None, BlobStates.None, prefix: id + "/", cancellationToken: ct)) await assets.DeleteBlobIfExistsAsync(b.Name, cancellationToken: ct); } catch { /* best effort */ } }
            return Results.NoContent();
        }).RequireAuthorization(Permissions.ViewSystemSettings).WithName("AdminDeleteInterviewer").WithTags("Interviewers");

        app.MapPost("/api/admin/interviewers/{id}/background", async (string id, IFormFile file, HttpContext ctx, CosmosService cosmos, IConfiguration config, CancellationToken ct) =>
        {
            if (!IsValidId(id)) return Results.BadRequest(new { error = "Unknown interviewer." });
            var existing = await GetAsync(cosmos, id, ct);
            if (existing is null) return Results.NotFound(new { error = "Save the interviewer first, then add the background." });
            if (file is null || file.Length == 0) return Results.BadRequest(new { error = "Choose an image." });
            if (file.Length > MaxBackgroundBytes) return Results.BadRequest(new { error = "That image is larger than 6 MB." });

            byte[] bytes;
            using (var ms = new MemoryStream()) { await file.CopyToAsync(ms, ct); bytes = ms.ToArray(); }
            var kind = SniffImage(bytes);
            if (kind is null) return Results.BadRequest(new { error = "Use a JPG, PNG or WebP image." });

            var assets = AssetsClient(config);
            if (assets is null) return Results.Json(new { error = "Image storage isn't configured." }, statusCode: 503);
            await assets.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct);
            // Replace any earlier background (it may have been another format).
            await foreach (var b in assets.GetBlobsAsync(BlobTraits.None, BlobStates.None, prefix: id + "/background.", cancellationToken: ct)) await assets.DeleteBlobIfExistsAsync(b.Name, cancellationToken: ct);
            var blob = assets.GetBlobClient($"{id}/background.{kind.Value.Ext}");
            using (var ms = new MemoryStream(bytes))
                await blob.UploadAsync(ms, new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = kind.Value.Mime, CacheControl = "public, max-age=86400" } }, ct);

            var updated = existing with { backgroundUrl = $"/interviewers/{id}/background?v={DateTimeOffset.UtcNow.ToUnixTimeSeconds()}", updatedAt = DateTimeOffset.UtcNow, updatedBy = ctx.User.FindFirst("sub")?.Value ?? "unknown" };
            await cosmos.GetContainer(ContainerName).UpsertItemAsync(updated, new PartitionKey(Partition), cancellationToken: ct);
            InvalidateCache();
            return Results.Ok(ToAdminDto(updated));
        }).RequireAuthorization(Permissions.ViewSystemSettings).DisableAntiforgery().WithName("AdminInterviewerBackground").WithTags("Interviewers");

        // ── Public (what candidates and the marketing page may see) ────────────────────────────────────────────────────────────────────────────
        // A background picture. Private container, streamed through here with a day's caching, so the browser never needs blob access.
        app.MapGet("/interviewers/{id}/background", async (string id, IConfiguration config, HttpContext ctx, CancellationToken ct) =>
        {
            if (!IsValidId(id)) return Results.NotFound();
            var assets = AssetsClient(config);
            if (assets is null) return Results.NotFound();
            await foreach (var b in assets.GetBlobsAsync(BlobTraits.None, BlobStates.None, prefix: id + "/background.", cancellationToken: ct))
            {
                var client = assets.GetBlobClient(b.Name);
                var download = await client.DownloadStreamingAsync(cancellationToken: ct);
                ctx.Response.Headers.CacheControl = "public, max-age=86400";
                ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
                return Results.Stream(download.Value.Content, download.Value.Details.ContentType ?? "image/jpeg");
            }
            return Results.NotFound();
        }).AllowAnonymous().WithName("InterviewerBackground").WithTags("Interviewers");

        // The active interviewers, public fields only (no voice id, no audit fields): for the intake picker, the demo and the hero.
        app.MapGet("/interviews/interviewers", async (CosmosService cosmos, CancellationToken ct) =>
        {
            var list = await ListAsync(cosmos, activeOnly: true, ct);
            return Results.Ok(list.Select(ToPublicDto));
        }).AllowAnonymous().WithName("PublicInterviewers").WithTags("Interviewers");
    }

    // ── Data access ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

    // The active list is read on every interview start, demo start and room load, and changes only when an admin saves, so it is kept in memory for a few seconds (and cleared by
    // every admin change on this instance; another instance picks a change up within the lifetime below).
    private static readonly TimeSpan ActiveCacheLifetime = TimeSpan.FromSeconds(20);
    private static (DateTimeOffset At, List<Interviewer> List)? _activeCache;
    private static void InvalidateCache() => _activeCache = null;

    public static async Task<List<Interviewer>> ListAsync(CosmosService cosmos, bool activeOnly, CancellationToken ct = default)
    {
        if (activeOnly && _activeCache is { } hit && DateTimeOffset.UtcNow - hit.At < ActiveCacheLifetime) return hit.List;
        var all = await ReadAllAsync(cosmos, ct);
        var ordered = all.OrderBy(i => i.sortOrder).ThenBy(i => i.displayName, StringComparer.OrdinalIgnoreCase).ToList();
        var active = ordered.Where(i => i.active).ToList();
        _activeCache = (DateTimeOffset.UtcNow, active);
        return activeOnly ? active : ordered;
    }

    private static async Task<List<Interviewer>> ReadAllAsync(CosmosService cosmos, CancellationToken ct)
    {
        var results = new List<Interviewer>();
        var query = new QueryDefinition("SELECT * FROM c WHERE c.pk = @pk").WithParameter("@pk", Partition);
        try
        {
            using var feed = cosmos.GetContainer(ContainerName).GetItemQueryIterator<Interviewer>(query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(Partition), MaxItemCount = 100 });
            while (feed.HasMoreResults) results.AddRange(await feed.ReadNextAsync(ct));
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return []; }
        return results;
    }

    public static async Task<Interviewer?> GetAsync(CosmosService cosmos, string id, CancellationToken ct = default)
    {
        try { return (await cosmos.GetContainer(ContainerName).ReadItemAsync<Interviewer>(id, new PartitionKey(Partition), cancellationToken: ct)).Resource; }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { return null; }
    }

    /// <summary>
    /// Who sits in each of the room's three seats: the interviewer marked as the default for that seat in the registry, falling back to the three avatar IDs in Admin &gt; Live
    /// Avatar when the registry has none. The backgrounds are the uploaded pictures (null = the room uses the picture files it ships with).
    /// </summary>
    public record SeatAvatars(string? Hr, string? Technical, string? Michelle, string? HrBackground, string? TechnicalBackground, string? MichelleBackground);

    public static async Task<SeatAvatars> ResolveSeatsAsync(CosmosService cosmos, PlatformSettings.AvatarProviderSetting fallback, CancellationToken ct = default)
    {
        var list = await ListAsync(cosmos, activeOnly: true, ct);
        Interviewer? Pick(string seat) => list.FirstOrDefault(i => string.Equals(i.defaultFor, seat, StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(i.spatiusAvatarId));
        var hr = Pick("hr"); var tech = Pick("technical"); var michelle = Pick("briefing");
        return new SeatAvatars(
            hr?.spatiusAvatarId ?? fallback.spatiusAvatarHr, tech?.spatiusAvatarId ?? fallback.spatiusAvatarTechnical, michelle?.spatiusAvatarId ?? fallback.spatiusAvatarMichelle,
            hr?.backgroundUrl, tech?.backgroundUrl, michelle?.backgroundUrl);
    }

    /// <summary>
    /// The ElevenLabs voice of whoever is the default interviewer for a room seat ("hr", "technical" or "michelle"), when one is set in the registry; otherwise null and the caller
    /// uses the voice from the server settings as before. This is how a voice chosen on the Interviewers page is heard in the room.
    /// </summary>
    public static async Task<string?> VoiceForSeatAsync(CosmosService cosmos, string? seat, CancellationToken ct = default)
    {
        var key = seat?.ToLowerInvariant() switch { "hr" => "hr", "technical" => "technical", "michelle" or "briefing" => "briefing", _ => null };
        if (key is null) return null;
        try
        {
            var voice = (await DefaultForAsync(cosmos, key, ct))?.voiceId;
            return !string.IsNullOrWhiteSpace(voice) && SafeTokenPattern().IsMatch(voice) ? voice : null;
        }
        catch (Exception) { return null; } // never let the registry stop an interview from speaking
    }

    /// <summary>The interviewer set as the default for a seat ("hr", "technical" or "briefing"), or null when none is (the room then uses the older avatar settings).</summary>
    public static async Task<Interviewer?> DefaultForAsync(CosmosService cosmos, string seat, CancellationToken ct = default) =>
        (await ListAsync(cosmos, activeOnly: true, ct)).FirstOrDefault(i => string.Equals(i.defaultFor, seat, StringComparison.OrdinalIgnoreCase));

    private static async Task ClearDefaultFromOthersAsync(CosmosService cosmos, string seat, string exceptId, CancellationToken ct)
    {
        foreach (var other in await ListAsync(cosmos, activeOnly: false, ct))
            if (other.id != exceptId && string.Equals(other.defaultFor, seat, StringComparison.OrdinalIgnoreCase))
                await cosmos.GetContainer(ContainerName).UpsertItemAsync(other with { defaultFor = null, updatedAt = DateTimeOffset.UtcNow }, new PartitionKey(Partition), cancellationToken: ct);
    }

    /// <summary>
    /// The first time the page is opened the registry is empty, so it starts from the avatars the room already uses (the three IDs in Admin &gt; Live Avatar) plus Haruto,
    /// so nothing changes for anyone. Backgrounds are left empty: until one is uploaded the room keeps using the picture files it ships with.
    /// </summary>
    private static async Task<List<Interviewer>> SeedFromExistingSettingsAsync(CosmosService cosmos, CancellationToken ct)
    {
        var setting = await PlatformSettings.Endpoint.GetAvatarProviderOrDefaultAsync(cosmos);
        var now = DateTimeOffset.UtcNow;
        // voiceId = the ElevenLabs voice Francis chose for each (2026-10-07). Stored now; the room reads it once the per-interviewer voices are wired up (Phase 2).
        Interviewer Make(string id, string name, string role, string? avatarId, string? voiceId, string description, int depth, int strict, int warm, int humour, int pace, int order, string? defaultFor) =>
            new(id, Partition, name, role, avatarId ?? "", voiceId, description, depth, strict, warm, humour, pace, true, order, defaultFor, null, now, "seed");
        var seeds = new List<Interviewer>
        {
            Make("amina", "Amina", "hr", setting.spatiusAvatarHr, "oO7sLA3dWfQXsKeSAjpA", "Your HR interviewer: professional, fair and encouraging.", 3, 3, 4, 2, 3, 10, "hr"),
            Make("wayne", "Wayne", "technical", setting.spatiusAvatarTechnical, "bDTlr4ICxntY9qVWyL0o", "Your technical interviewer: direct, thorough, goes deep on detail.", 5, 4, 2, 2, 4, 20, "technical"),
            Make("michelle", "Michelle", "briefing", setting.spatiusAvatarMichelle, "6fZce9LFNG3iEITDfqZZ", "Your recruitment consultant: briefs you before you meet the panel.", 2, 1, 5, 3, 3, 30, "briefing"),
            Make("haruto", "Haruto", "technical", "17dcea17-a918-4963-ad1b-742bc0e82d10", "Y4QW1GVPTWtbS9vlIcVk", "A calm, methodical technical interviewer with a dry sense of humour.", 4, 3, 3, 3, 3, 40, null),
        };
        // A seat that has no avatar ID yet is left out (an interviewer without a face can't be used).
        seeds = seeds.Where(s => !string.IsNullOrWhiteSpace(s.spatiusAvatarId)).ToList();
        foreach (var s in seeds) await cosmos.GetContainer(ContainerName).UpsertItemAsync(s, new PartitionKey(Partition), cancellationToken: ct);
        InvalidateCache();
        return seeds;
    }

    // ── Validation ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{1,31}$")] private static partial Regex IdPattern();
    [GeneratedRegex("^[A-Za-z0-9-]{1,64}$")] private static partial Regex SafeTokenPattern();

    public static bool IsValidId(string? id) => !string.IsNullOrEmpty(id) && IdPattern().IsMatch(id);

    public record CleanInterviewer(string DisplayName, string Role, string SpatiusAvatarId, string? VoiceId, string Description, int Depth, int Strictness, int Warmth, int Humour, int Pace, bool Active, int SortOrder, string? DefaultFor);

    public static (CleanInterviewer? Value, string? Error) Validate(SaveInterviewerRequest req)
    {
        var name = (req.DisplayName ?? "").Trim();
        if (name.Length is < 2 or > 40 || name.Any(char.IsControl) || name.IndexOfAny(['<', '>', '{', '}']) >= 0) return (null, "Give the interviewer a name of 2 to 40 letters.");
        var role = (req.Role ?? "").Trim().ToLowerInvariant();
        if (!Roles.Contains(role)) return (null, "The role must be hr, technical or briefing.");
        var avatar = (req.SpatiusAvatarId ?? "").Trim();
        if (!SafeTokenPattern().IsMatch(avatar)) return (null, "The Spatius avatar ID may only contain letters, numbers and hyphens.");
        var voice = string.IsNullOrWhiteSpace(req.VoiceId) ? null : req.VoiceId.Trim();
        if (voice is not null && !SafeTokenPattern().IsMatch(voice)) return (null, "The voice ID may only contain letters, numbers and hyphens.");
        var description = (req.Description ?? "").Trim();
        if (description.Length > 160 || description.Any(char.IsControl) || description.IndexOfAny(['<', '>']) >= 0) return (null, "Keep the description under 160 characters, without angle brackets.");
        static int Level(int? v) => Math.Clamp(v ?? 3, 1, 5);
        var defaultFor = string.IsNullOrWhiteSpace(req.DefaultFor) ? null : req.DefaultFor.Trim().ToLowerInvariant();
        if (defaultFor is not null && !Roles.Contains(defaultFor)) return (null, "The default seat must be hr, technical or briefing.");
        if (defaultFor is not null && defaultFor != role) return (null, "An interviewer can only be the default for a seat that matches their role.");
        return (new CleanInterviewer(name, role, avatar, voice, description, Level(req.Depth), Level(req.Strictness), Level(req.Warmth), Level(req.Humour), Level(req.Pace),
            req.Active ?? true, Math.Clamp(req.SortOrder ?? 100, 0, 10000), defaultFor), null);
    }

    /// <summary>The image types accepted for a background, recognised from the file's own first bytes (never from its name or the browser's claim).</summary>
    public static (string Ext, string Mime)? SniffImage(ReadOnlySpan<byte> b)
    {
        if (b.Length >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF) return ("jpg", "image/jpeg");
        if (b.Length >= 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47 && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) return ("png", "image/png");
        if (b.Length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return ("webp", "image/webp");
        return null;
    }

    private static BlobContainerClient? AssetsClient(IConfiguration config)
    {
        var cs = config.GetConnectionString("BlobStorage");
        return string.IsNullOrWhiteSpace(cs) ? null : new BlobContainerClient(cs, AssetsContainer);
    }

    // ── Shapes ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

    public static object ToAdminDto(Interviewer i) => new
    {
        i.id, i.displayName, i.role, i.spatiusAvatarId, i.voiceId, i.description,
        traits = new { depth = i.depth, strictness = i.strictness, warmth = i.warmth, humour = i.humour, pace = i.pace },
        i.active, i.sortOrder, i.defaultFor, i.backgroundUrl, i.updatedAt,
    };

    public static object ToPublicDto(Interviewer i) => new
    {
        i.id, i.displayName, i.role, avatarId = i.spatiusAvatarId, i.description,
        traits = new { depth = i.depth, strictness = i.strictness, warmth = i.warmth, humour = i.humour, pace = i.pace },
        i.sortOrder, i.backgroundUrl,
    };
}

public record SaveInterviewerRequest(
    string? DisplayName, string? Role, string? SpatiusAvatarId, string? VoiceId, string? Description,
    int? Depth, int? Strictness, int? Warmth, int? Humour, int? Pace,
    bool? Active, int? SortOrder, string? DefaultFor);

/// <summary>One interviewer. Property names are lowercase because that is how they are stored (same convention as the other platform documents).</summary>
public record Interviewer(
    string id, string pk, string displayName, string role, string spatiusAvatarId, string? voiceId, string description,
    int depth, int strictness, int warmth, int humour, int pace,
    bool active, int sortOrder, string? defaultFor, string? backgroundUrl,
    DateTimeOffset updatedAt, string updatedBy);
