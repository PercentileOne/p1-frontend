namespace Explain.Api.Features.ExamCatalog.Refresh;

/// <summary>
/// Manual trigger + status for the weekly exam-catalog refresh (see ExamCatalogRefreshService).
/// Gated by the same shared secret the API already holds for the exam-catalog agent
/// (ExamCatalogAgent:AdminKey) in an `x-admin-key` header — a machine/ops trigger, so it works
/// without a signed-in admin. (An admin-portal UI would sit on top of this later.)
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // POST /api/admin/exam-catalog/refresh?maxChecks=3   (maxChecks optional: run a tiny test pass)
        app.MapPost("/api/admin/exam-catalog/refresh", (HttpContext ctx, int? maxChecks, IConfiguration config, ExamCatalogRefreshService svc) =>
        {
            if (!Authorised(ctx, config)) return Results.Unauthorized();
            if (svc.IsRunning) return Results.Conflict(new { error = "A refresh is already running." });
            _ = Task.Run(() => svc.RunAsync("manual", maxChecks)); // returns immediately — a run takes minutes
            return Results.Accepted(value: new { started = true, maxChecks });
        }).AllowAnonymous();

        // GET /api/admin/exam-catalog/refresh — the latest run's digest
        app.MapGet("/api/admin/exam-catalog/refresh", async (HttpContext ctx, IConfiguration config, ExamCatalogRefreshService svc) =>
        {
            if (!Authorised(ctx, config)) return Results.Unauthorized();
            var state = await svc.ReadStateAsync();
            return state is null ? Results.Ok(new { status = "never-run", running = svc.IsRunning }) : Results.Ok(new { running = svc.IsRunning, state });
        }).AllowAnonymous();
    }

    private static bool Authorised(HttpContext ctx, IConfiguration config)
    {
        var key = config["ExamCatalogAgent:AdminKey"];
        return !string.IsNullOrEmpty(key) && ctx.Request.Headers["x-admin-key"] == key;
    }
}
