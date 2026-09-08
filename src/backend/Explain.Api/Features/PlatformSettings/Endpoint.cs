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
