using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.PlatformSettings;

/// <summary>
/// Global, platform-wide settings — the first of their kind in this codebase (every other
/// toggle so far is per-record, e.g. UserProfile.CommentsEnabled). Deliberately narrow: one
/// document per setting rather than a general-purpose settings blob. Gated CAN_VIEW_SYSTEM_SETTINGS
/// (Super Admin only) — a genuine kill switch, not something every ordinary admin can flip.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/admin/settings/name-bank", async (CosmosService cosmos) =>
        {
            var setting = await GetOrDefaultAsync(cosmos);
            return Results.Ok(setting);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        app.MapPost("/api/admin/settings/name-bank", async (UpdateRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var updatedBy = ctx.User.FindFirst("sub")?.Value ?? "unknown";
            var setting = new NameBankSetting(
                id: "nameBank",
                pk: "nameBank",
                autoGenerateEnabled: req.AutoGenerateEnabled,
                updatedAt: DateTimeOffset.UtcNow,
                updatedBy: updatedBy);

            var container = cosmos.GetContainer("platformSettings");
            await container.UpsertItemAsync(setting, new PartitionKey("nameBank"));
            return Results.Ok(setting);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        // LiveAvatar kill switch — unlike Name Bank, this defaults to ENABLED (see
        // GetLiveAvatarOrDefaultAsync): the feature is live and wanted today, this exists so
        // Francis can pull the plug fast if HeyGen usage/cost spirals, not to gate a new spend
        // behind explicit opt-in. Off means every interview falls back to its pre-LiveAvatar
        // path instantly (static photo + ElevenLabs TTS) — no redeploy needed.
        app.MapGet("/api/admin/settings/live-avatar", async (CosmosService cosmos) =>
        {
            var setting = await GetLiveAvatarOrDefaultAsync(cosmos);
            return Results.Ok(setting);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        app.MapPost("/api/admin/settings/live-avatar", async (UpdateLiveAvatarRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var updatedBy = ctx.User.FindFirst("sub")?.Value ?? "unknown";
            var setting = new LiveAvatarSetting(
                id: "liveAvatar",
                pk: "liveAvatar",
                enabled: req.Enabled,
                updatedAt: DateTimeOffset.UtcNow,
                updatedBy: updatedBy);

            var container = cosmos.GetContainer("platformSettings");
            await container.UpsertItemAsync(setting, new PartitionKey("liveAvatar"));
            return Results.Ok(setting);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        // Question Packs daily-caps switch (Francis, 2026-09-22: "please leave it uncapped for now, or add a switch
        // in the admin portal for me to switch it on and off") — unlike LiveAvatar's default-ON, a missing document
        // here means UNCAPPED, deliberately: the whole point of asking for this was to stop being capped starting
        // the moment it ships, without having to flip anything on first. See Features/QuestionPacks/Endpoint.cs's
        // CapsEnabledAsync for where this is read on every preview/hot-topics/checkout call.
        app.MapGet("/api/admin/settings/question-pack-caps", async (CosmosService cosmos) =>
        {
            var setting = await GetQuestionPackCapsOrDefaultAsync(cosmos);
            return Results.Ok(setting);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        app.MapPost("/api/admin/settings/question-pack-caps", async (UpdateQuestionPackCapsRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var updatedBy = ctx.User.FindFirst("sub")?.Value ?? "unknown";
            var setting = new QuestionPackCapsSetting(
                id: "questionPackCaps",
                pk: "questionPackCaps",
                capsEnabled: req.CapsEnabled,
                updatedAt: DateTimeOffset.UtcNow,
                updatedBy: updatedBy);

            var container = cosmos.GetContainer("platformSettings");
            await container.UpsertItemAsync(setting, new PartitionKey("questionPackCaps"));
            return Results.Ok(setting);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        // Question Packs free-launch-period switch — see GetQuestionPackFreeOrDefaultAsync's own note on the
        // default. On means the checkout endpoint skips Stripe entirely and delivers the pack for £0.
        app.MapGet("/api/admin/settings/question-pack-free", async (CosmosService cosmos) =>
        {
            var setting = await GetQuestionPackFreeOrDefaultAsync(cosmos);
            return Results.Ok(setting);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        app.MapPost("/api/admin/settings/question-pack-free", async (UpdateQuestionPackFreeRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var updatedBy = ctx.User.FindFirst("sub")?.Value ?? "unknown";
            var setting = new QuestionPackFreeSetting(
                id: "questionPackFree",
                pk: "questionPackFree",
                freeEnabled: req.FreeEnabled,
                updatedAt: DateTimeOffset.UtcNow,
                updatedBy: updatedBy);

            var container = cosmos.GetContainer("platformSettings");
            await container.UpsertItemAsync(setting, new PartitionKey("questionPackFree"));
            return Results.Ok(setting);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        // /api/ai-proxy daily-ceiling switch (Francis, 2026-09-24) — unlike Question Packs' caps, a missing doc here
        // means protection is ON: the whole point is that the unauthenticated AI proxy is never left unmetered by
        // default. The switch exists purely as a safety valve (turn it off if the ceiling ever wrongly blocks real
        // users, e.g. mid-demo). See Program.cs's /api/ai-proxy handler for where this is read.
        app.MapGet("/api/admin/settings/ai-proxy-protection", async (CosmosService cosmos) =>
        {
            var setting = await GetAiProxyProtectionOrDefaultAsync(cosmos);
            return Results.Ok(setting);
        }).RequireAuthorization(Permissions.ViewSystemSettings);

        app.MapPost("/api/admin/settings/ai-proxy-protection", async (UpdateAiProxyProtectionRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var updatedBy = ctx.User.FindFirst("sub")?.Value ?? "unknown";
            var setting = new AiProxyProtectionSetting(
                id: "aiProxyProtection",
                pk: "aiProxyProtection",
                protectionEnabled: req.ProtectionEnabled,
                updatedAt: DateTimeOffset.UtcNow,
                updatedBy: updatedBy);

            var container = cosmos.GetContainer("platformSettings");
            await container.UpsertItemAsync(setting, new PartitionKey("aiProxyProtection"));
            return Results.Ok(setting);
        }).RequireAuthorization(Permissions.ViewSystemSettings);
    }

    public static async Task<AiProxyProtectionSetting> GetAiProxyProtectionOrDefaultAsync(CosmosService cosmos)
    {
        var container = cosmos.GetContainer("platformSettings");
        try
        {
            var response = await container.ReadItemAsync<AiProxyProtectionSetting>("aiProxyProtection", new PartitionKey("aiProxyProtection"));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return new AiProxyProtectionSetting("aiProxyProtection", "aiProxyProtection", true, DateTimeOffset.MinValue, "");
        }
    }

    public static async Task<QuestionPackCapsSetting> GetQuestionPackCapsOrDefaultAsync(CosmosService cosmos)
    {
        var container = cosmos.GetContainer("platformSettings");
        try
        {
            var response = await container.ReadItemAsync<QuestionPackCapsSetting>("questionPackCaps", new PartitionKey("questionPackCaps"));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return new QuestionPackCapsSetting("questionPackCaps", "questionPackCaps", false, DateTimeOffset.MinValue, "");
        }
    }

    /// <summary>
    /// Missing doc = FREE (Francis, 2026-09-22, from dialysis: "for now, it's free... the same way other services
    /// were free to start with until they got a good amount of users"). Deliberately the same "takes effect the
    /// moment it ships, no click needed" default as GetQuestionPackCapsOrDefaultAsync above. Read by both the
    /// checkout endpoint (whether to actually charge) and the public pricing endpoint (what to show on screen) —
    /// see Features/QuestionPacks/Endpoint.cs.
    /// </summary>
    public static async Task<QuestionPackFreeSetting> GetQuestionPackFreeOrDefaultAsync(CosmosService cosmos)
    {
        var container = cosmos.GetContainer("platformSettings");
        try
        {
            var response = await container.ReadItemAsync<QuestionPackFreeSetting>("questionPackFree", new PartitionKey("questionPackFree"));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return new QuestionPackFreeSetting("questionPackFree", "questionPackFree", true, DateTimeOffset.MinValue, "");
        }
    }

    /// <summary>
    /// Missing doc = disabled — no auto-spend until an admin has explicitly opted in.
    /// Called from Features/NameGreetings/Endpoint.cs's miss branch too.
    /// </summary>
    public static async Task<NameBankSetting> GetOrDefaultAsync(CosmosService cosmos)
    {
        var container = cosmos.GetContainer("platformSettings");
        try
        {
            var response = await container.ReadItemAsync<NameBankSetting>("nameBank", new PartitionKey("nameBank"));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return new NameBankSetting("nameBank", "nameBank", false, DateTimeOffset.MinValue, "");
        }
    }

    /// <summary>
    /// Missing doc = enabled — the opposite default to Name Bank's, deliberately: LiveAvatar
    /// is already the wanted, live behaviour, so absence of a doc (e.g. before an admin has
    /// ever touched this setting) must not silently turn it off. Called from
    /// Features/Interviews/AvatarSession's public read endpoint too.
    /// </summary>
    public static async Task<LiveAvatarSetting> GetLiveAvatarOrDefaultAsync(CosmosService cosmos)
    {
        var container = cosmos.GetContainer("platformSettings");
        try
        {
            var response = await container.ReadItemAsync<LiveAvatarSetting>("liveAvatar", new PartitionKey("liveAvatar"));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return new LiveAvatarSetting("liveAvatar", "liveAvatar", true, DateTimeOffset.MinValue, "");
        }
    }
}

public record UpdateRequest(bool AutoGenerateEnabled);

public record NameBankSetting(
    string id,
    string pk,
    bool autoGenerateEnabled,
    DateTimeOffset updatedAt,
    string updatedBy);

public record UpdateLiveAvatarRequest(bool Enabled);

public record LiveAvatarSetting(
    string id,
    string pk,
    bool enabled,
    DateTimeOffset updatedAt,
    string updatedBy);

public record UpdateQuestionPackCapsRequest(bool CapsEnabled);

public record QuestionPackCapsSetting(
    string id,
    string pk,
    bool capsEnabled,
    DateTimeOffset updatedAt,
    string updatedBy);

public record UpdateAiProxyProtectionRequest(bool ProtectionEnabled);

public record AiProxyProtectionSetting(
    string id,
    string pk,
    bool protectionEnabled,
    DateTimeOffset updatedAt,
    string updatedBy);

public record UpdateQuestionPackFreeRequest(bool FreeEnabled);

public record QuestionPackFreeSetting(
    string id,
    string pk,
    bool freeEnabled,
    DateTimeOffset updatedAt,
    string updatedBy);

