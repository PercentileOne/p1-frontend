using System.Net;
using System.Net.Mail;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Alerts;

/// <summary>
/// Talent alerts — a recruiter or employer sets a role + minimum-score threshold once, then
/// gets notified whenever a candidate's completed interview clears the bar. The push counterpart
/// to Introductions' pull model: instead of someone sending you a candidate, the platform tells
/// you when one shows up. See spec-alert-engine memory for the original two-sided design (this
/// implements the recruiter/employer notification half — Phase 1/2 of that spec, not the
/// candidate-facing "live demand feed" half, which is a separate, not-yet-built piece).
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // POST /api/alerts — create an alert. Any authenticated Recruiter or Employer; which one
        // is derived from the caller's own JWT permissions, same branching Introductions uses.
        app.MapPost("/api/alerts", async (Request req, HttpContext ctx, CosmosService cosmos) =>
        {
            var ownerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Results.Unauthorized();

            var perms = ctx.User.FindAll("perm").Select(c => c.Value).ToHashSet();
            var isRecruiter = perms.Contains(Permissions.ManageInterviews);
            var isEmployer = perms.Contains(Permissions.ViewEmployerPortal);
            if (!isRecruiter && !isEmployer) return Results.Forbid();

            if (string.IsNullOrWhiteSpace(req.Role))
                return Results.BadRequest(new { error = "A role is required." });

            var ownerEmail = ctx.User.FindFirst("email")?.Value;
            if (string.IsNullOrEmpty(ownerEmail)) return Results.Unauthorized();

            var alert = new Alert(
                id: Guid.NewGuid().ToString(),
                ownerId: ownerId,
                ownerType: isRecruiter ? "recruiter" : "employer",
                ownerName: ctx.User.FindFirst("name")?.Value ?? (isRecruiter ? "A recruiter" : "An employer"),
                ownerEmail: ownerEmail.Trim().ToLower(),
                role: req.Role.Trim(),
                minScore: Math.Clamp(req.MinScore, 0, 100),
                location: string.IsNullOrWhiteSpace(req.Location) ? null : req.Location.Trim(),
                radiusMiles: req.RadiusMiles,
                notifyEmail: req.NotifyEmail,
                notifyInApp: req.NotifyInApp,
                status: "active",
                createdAt: DateTimeOffset.UtcNow,
                matchCount: 0,
                lastMatchAt: null);

            var container = cosmos.GetContainer("alerts");
            await container.UpsertItemAsync(alert, new PartitionKey(alert.ownerId));
            return Results.Ok(alert);
        }).RequireAuthorization();

        // GET /api/alerts — the current owner's own alerts, newest first.
        app.MapGet("/api/alerts", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var ownerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("alerts");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.ownerId = @oid").WithParameter("@oid", ownerId);
            var alerts = new List<Alert>();
            using var feed = container.GetItemQueryIterator<Alert>(
                query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(ownerId) });
            while (feed.HasMoreResults)
                alerts.AddRange(await feed.ReadNextAsync());

            return Results.Ok(alerts.OrderByDescending(a => a.createdAt));
        }).RequireAuthorization();

        // PATCH /api/alerts/{id} — edit criteria, notification prefs, or pause/resume. A point
        // read+write on the caller's own partition — an alert's ownerId is always the creator, so
        // no cross-partition lookup is needed the way Introductions' respond/watch require.
        app.MapPatch("/api/alerts/{id}", async (string id, UpdateRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var ownerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("alerts");
            Alert existing;
            try
            {
                existing = await container.ReadItemAsync<Alert>(id, new PartitionKey(ownerId));
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }

            var updated = existing with
            {
                role = string.IsNullOrWhiteSpace(req.Role) ? existing.role : req.Role.Trim(),
                minScore = req.MinScore is { } ms ? Math.Clamp(ms, 0, 100) : existing.minScore,
                location = req.Location is not null ? (string.IsNullOrWhiteSpace(req.Location) ? null : req.Location.Trim()) : existing.location,
                radiusMiles = req.RadiusMiles ?? existing.radiusMiles,
                notifyEmail = req.NotifyEmail ?? existing.notifyEmail,
                notifyInApp = req.NotifyInApp ?? existing.notifyInApp,
                status = req.Status is "active" or "paused" ? req.Status : existing.status,
            };
            await container.UpsertItemAsync(updated, new PartitionKey(ownerId));
            return Results.Ok(updated);
        }).RequireAuthorization();

        // DELETE /api/alerts/{id}
        app.MapDelete("/api/alerts/{id}", async (string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var ownerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("alerts");
            try
            {
                await container.DeleteItemAsync<Alert>(id, new PartitionKey(ownerId));
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* already gone */ }
            return Results.NoContent();
        }).RequireAuthorization();

        // GET /api/alerts/matches — the current owner's match history, newest first.
        app.MapGet("/api/alerts/matches", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var ownerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("alertMatches");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.ownerId = @oid").WithParameter("@oid", ownerId);
            var matches = new List<AlertMatch>();
            using var feed = container.GetItemQueryIterator<AlertMatch>(
                query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(ownerId) });
            while (feed.HasMoreResults)
                matches.AddRange(await feed.ReadNextAsync());

            return Results.Ok(matches.OrderByDescending(m => m.matchedAt));
        }).RequireAuthorization();

        // POST /api/alerts/matches/{id}/view — clears the "new" badge on one match.
        app.MapPost("/api/alerts/matches/{id}/view", async (string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var ownerId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(ownerId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("alertMatches");
            AlertMatch existing;
            try
            {
                existing = await container.ReadItemAsync<AlertMatch>(id, new PartitionKey(ownerId));
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }
            var updated = existing with { viewed = true };
            await container.UpsertItemAsync(updated, new PartitionKey(ownerId));
            return Results.Ok(updated);
        }).RequireAuthorization();
    }

    /// <summary>
    /// Called from Features/Interviews/Endpoint.cs right after a completed interview is saved.
    /// Scans every active alert (cross-partition — small dataset at this stage, same trade-off
    /// as Introductions' received-list query) and fires a match for any whose role+score
    /// criteria the just-completed interview clears.
    /// </summary>
    public static async Task MatchIncomingCandidateAsync(
        string candidateId, string candidateName, string? role, double overallScore, string interviewId,
        CosmosService cosmos, IConfiguration config, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(role)) return;

        var alertsContainer = cosmos.GetContainer("alerts");
        var query = new QueryDefinition("SELECT * FROM c WHERE c.status = 'active'");
        var active = new List<Alert>();
        using (var feed = alertsContainer.GetItemQueryIterator<Alert>(query))
            while (feed.HasMoreResults)
                active.AddRange(await feed.ReadNextAsync());

        var hits = active.Where(a => overallScore >= a.minScore && RoleMatches(a.role, role)).ToList();
        if (hits.Count == 0) return;

        var matchesContainer = cosmos.GetContainer("alertMatches");
        foreach (var alert in hits)
        {
            var match = new AlertMatch(
                id: Guid.NewGuid().ToString(),
                ownerId: alert.ownerId,
                alertId: alert.id,
                candidateId: candidateId,
                candidateName: candidateName,
                role: role,
                overallScore: (int)Math.Round(overallScore),
                interviewId: interviewId,
                matchedAt: DateTimeOffset.UtcNow,
                viewed: false);
            await matchesContainer.UpsertItemAsync(match, new PartitionKey(match.ownerId));

            var updatedAlert = alert with { matchCount = alert.matchCount + 1, lastMatchAt = DateTimeOffset.UtcNow };
            await alertsContainer.UpsertItemAsync(updatedAlert, new PartitionKey(updatedAlert.ownerId));

            if (alert.notifyEmail)
            {
                try
                {
                    await SendAlertMatchEmailAsync(alert, match, config, logger);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to send alert match email for alert {AlertId}", alert.id);
                }
            }
        }
    }

    // Free-text roles never match exactly ("DevOps Lead" alert vs "Senior DevOps Engineer"
    // interview) — a case-insensitive substring check either direction is good enough at
    // this stage without pulling in real taxonomy/skills matching.
    private static bool RoleMatches(string alertRole, string candidateRole)
    {
        var a = alertRole.Trim().ToLowerInvariant();
        var c = candidateRole.Trim().ToLowerInvariant();
        return a.Length > 0 && (c.Contains(a) || a.Contains(c));
    }

    private static async Task SendAlertMatchEmailAsync(Alert alert, AlertMatch match, IConfiguration config, ILogger logger)
    {
        var smtpHost = config["Email:SmtpHost"];
        var smtpUser = config["Email:SmtpUser"];
        var smtpPass = config["Email:SmtpPass"];

        if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
        {
            logger.LogWarning("Email:Smtp* not configured — skipping alert match email to {Email}", alert.ownerEmail);
            return;
        }

        var smtpPort  = int.Parse(config["Email:SmtpPort"] ?? "587");
        var fromEmail = config["Email:FromEmail"] ?? "noreply@interviewme.global";
        var fromName  = config["Email:FromName"] ?? "InterviewMe";
        var portalUrl = alert.ownerType == "employer"
            ? "https://employer.interviewme.global/dashboard"
            : "https://recruiter.interviewme.global/dashboard";

        var body = $"""
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#07080f;font-family:-apple-system,'Segoe UI',sans-serif;">
              <div style="max-width:560px;margin:40px auto;padding:0 20px;">
                <div style="text-align:center;margin-bottom:28px;">
                  <p style="font-size:18px;font-weight:700;color:#fff;margin:0;">
                    <strong style="color:#fff">Interview</strong><strong style="color:#34D399">Me</strong><span style="color:#4F8EF7;font-weight:400">.global</span>
                  </p>
                </div>
                <div style="background:linear-gradient(160deg,#0d1117 0%,#1b140f 100%);border:1px solid rgba(245,158,11,0.3);border-radius:20px;padding:44px 36px 36px;box-shadow:0 0 60px rgba(245,158,11,0.08);">
                  <p style="text-align:center;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#F59E0B;margin:0 0 10px;">
                    🔔 Your alert just matched
                  </p>
                  <h1 style="text-align:center;font-size:23px;font-weight:800;color:#fff;margin:0 0 8px;line-height:1.35;">
                    {WebEncode(match.candidateName)} — {WebEncode(match.role)}
                  </h1>
                  <p style="text-align:center;font-size:15px;color:rgba(255,255,255,0.6);margin:0 0 24px;">
                    Scored <strong style="color:#34D399;">{match.overallScore}%</strong> · meets your {alert.minScore}%+ threshold for "{WebEncode(alert.role)}"
                  </p>
                  <div style="text-align:center;">
                    <a href="{portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#F59E0B,#d97706);color:#0d0904;font-size:15px;font-weight:700;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 8px 24px rgba(245,158,11,0.3);">
                      View in your Alerts tab →
                    </a>
                  </div>
                </div>
              </div>
            </body>
            </html>
            """;

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            Credentials = new NetworkCredential(smtpUser, smtpPass),
            EnableSsl   = true,
        };
        using var message = new MailMessage
        {
            From       = new MailAddress(fromEmail, fromName),
            Subject    = $"🔔 {match.candidateName} matches your alert — {match.role}",
            Body       = body,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(alert.ownerEmail));
        await client.SendMailAsync(message);
        logger.LogInformation("Alert match email sent to {Email} for alert {AlertId}", alert.ownerEmail, alert.id);
    }

    private static string WebEncode(string s) => WebUtility.HtmlEncode(s);

    public record Request(
        string Role,
        int MinScore,
        string? Location,
        int? RadiusMiles,
        bool NotifyEmail,
        bool NotifyInApp);

    public record UpdateRequest(
        string? Role,
        int? MinScore,
        string? Location,
        int? RadiusMiles,
        bool? NotifyEmail,
        bool? NotifyInApp,
        string? Status);
}

public record Alert(
    string id,
    string ownerId,
    string ownerType,      // "recruiter" | "employer"
    string ownerName,
    string ownerEmail,
    string role,
    int minScore,
    string? location,
    int? radiusMiles,
    bool notifyEmail,
    bool notifyInApp,
    string status,         // "active" | "paused"
    DateTimeOffset createdAt,
    int matchCount,
    DateTimeOffset? lastMatchAt);

public record AlertMatch(
    string id,
    string ownerId,
    string alertId,
    string candidateId,
    string candidateName,
    string role,
    int overallScore,
    string? interviewId,
    DateTimeOffset matchedAt,
    bool viewed);
