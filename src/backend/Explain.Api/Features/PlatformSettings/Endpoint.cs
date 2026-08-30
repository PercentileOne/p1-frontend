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
}

public record UpdateRequest(bool AutoGenerateEnabled);

public record NameBankSetting(
    string id,
    string pk,
    bool autoGenerateEnabled,
    DateTimeOffset updatedAt,
    string updatedBy);
