using System.Net;
using System.Net.Mail;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.InterviewPreps;

/// <summary>
/// A recruiter sending a candidate ahead of a real interview a link to prepare — the first
/// step of the loop: recruiter sends prep -> candidate practices -> candidate shares a good
/// score -> employer discovers it -> candidate gets the job. See project docs for the full
/// vision; this endpoint is the recruiter-side "send" only. Candidate account creation from
/// this link reuses the same real, permission-backed Register flow used everywhere else — not
/// the disconnected Cosmos-only magic-link path, which issues sessions with zero permissions
/// and doesn't actually send email yet. Tying a created account back to this specific prep
/// record (a "Received Interview Prep" list on the candidate side) is deliberately not built
/// here — a separate, focused piece of work.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/api/interview-preps", async (Request req, HttpContext ctx, CosmosService cosmos, IConfiguration config, ILogger<Program> logger) =>
        {
            var recruiterId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(recruiterId)) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(req.CandidateName))
                return Results.BadRequest(new { error = "Candidate name is required." });
            if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
                return Results.BadRequest(new { error = "A valid candidate email is required." });
            if (string.IsNullOrWhiteSpace(req.Role))
                return Results.BadRequest(new { error = "Role is required." });
            if (string.IsNullOrWhiteSpace(req.Level))
                return Results.BadRequest(new { error = "Level/seniority is required." });
            if (req.InterviewDate is null)
                return Results.BadRequest(new { error = "Interview date is required." });

            var recruiterName = ctx.User.FindFirst("name")?.Value ?? "Your recruiter";

            var prep = new InterviewPrep(
                id: Guid.NewGuid().ToString(),
                recruiterId: recruiterId,
                recruiterName: recruiterName,
                candidateName: req.CandidateName.Trim(),
                knownAs: string.IsNullOrWhiteSpace(req.KnownAs) ? null : req.KnownAs.Trim(),
                email: req.Email.Trim().ToLower(),
                role: req.Role.Trim(),
                level: req.Level.Trim(),
                interviewDate: req.InterviewDate.Value,
                status: "sent",
                createdAt: DateTimeOffset.UtcNow);

            var container = cosmos.GetContainer("interview-preps");
            await container.UpsertItemAsync(prep, new PartitionKey(recruiterId));

            try
            {
                await SendInviteEmailAsync(prep, config, logger);
            }
            catch (Exception ex)
            {
                // The prep record is saved regardless — it still shows in the recruiter's sent
                // list even if the email itself failed (SMTP hiccup, unconfigured locally, etc).
                logger.LogError(ex, "Failed to send interview prep invite email to {Email}", prep.email);
            }

            return Results.Ok(prep);
        }).RequireAuthorization(Permissions.ManageInterviews);

        // GET /api/interview-preps — every prep the current recruiter has sent, newest first.
        app.MapGet("/api/interview-preps", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var recruiterId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(recruiterId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("interview-preps");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.recruiterId = @rid")
                .WithParameter("@rid", recruiterId);

            var preps = new List<InterviewPrep>();
            using var feed = container.GetItemQueryIterator<InterviewPrep>(
                query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(recruiterId) });
            while (feed.HasMoreResults)
                preps.AddRange(await feed.ReadNextAsync());

            return Results.Ok(preps.OrderByDescending(p => p.createdAt));
        }).RequireAuthorization(Permissions.ManageInterviews);
    }

    private static async Task SendInviteEmailAsync(InterviewPrep prep, IConfiguration config, ILogger logger)
    {
        var smtpHost  = config["Email:SmtpHost"];
        var smtpUser  = config["Email:SmtpUser"];
        var smtpPass  = config["Email:SmtpPass"];

        if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
        {
            logger.LogWarning("Email:Smtp* not configured — skipping interview prep invite email to {Email}", prep.email);
            return;
        }

        var smtpPort  = int.Parse(config["Email:SmtpPort"] ?? "587");
        var fromEmail = config["Email:FromEmail"] ?? "noreply@interviewme.global";
        var fromName  = config["Email:FromName"] ?? "InterviewMe";

        var nameParts  = prep.candidateName.Split(' ', 2);
        var firstName  = prep.knownAs ?? nameParts[0];
        var registerUrl = "https://candidate.interviewme.global/register" +
            $"?email={Uri.EscapeDataString(prep.email)}" +
            $"&firstName={Uri.EscapeDataString(nameParts[0])}" +
            (nameParts.Length > 1 ? $"&lastName={Uri.EscapeDataString(nameParts[1])}" : "");

        var interviewDateStr = prep.interviewDate.ToString("dddd d MMMM 'at' h:mmtt");

        var body = $"""
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#07080f;font-family:-apple-system,'Segoe UI',sans-serif;">
              <div style="max-width:560px;margin:40px auto;padding:0 20px;">
                <div style="text-align:center;margin-bottom:32px;">
                  <p style="font-size:18px;font-weight:700;color:#fff;margin:0;">
                    <strong style="color:#fff">Interview</strong><strong style="color:#34D399">Me</strong><span style="color:#4F8EF7;font-weight:400">.global</span>
                  </p>
                </div>
                <div style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 36px;">
                  <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 12px;">You've been invited to prepare for an interview</h1>
                  <p style="font-size:15px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 24px;">
                    Hi {firstName}, {prep.recruiterName} has set you up to prepare for your <strong style="color:#fff">{prep.role}</strong> ({prep.level}) interview on <strong style="color:#fff">{interviewDateStr}</strong>.
                  </p>
                  <p style="font-size:15px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 32px;">
                    Create your free account to practice with AI interviewers, get personalised questions, and walk in ready.
                  </p>
                  <div style="text-align:center;margin-bottom:32px;">
                    <a href="{registerUrl}" style="display:inline-block;background:linear-gradient(135deg,#34D399,#059669);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;">
                      Start preparing →
                    </a>
                  </div>
                  <p style="font-size:12px;color:rgba(255,255,255,0.3);line-height:1.7;margin:0;word-break:break-all;">
                    Or copy this link into your browser:<br/>{registerUrl}
                  </p>
                </div>
                <p style="text-align:center;font-size:12px;color:rgba(255,255,255,0.2);margin-top:24px;">
                  Sent via InterviewMe.global on behalf of {prep.recruiterName}.
                </p>
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
            Subject    = $"You're set up for your {prep.role} interview",
            Body       = body,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(prep.email));
        await client.SendMailAsync(message);
        logger.LogInformation("Interview prep invite sent to {Email}", prep.email);
    }

    public record Request(
        string CandidateName,
        string? KnownAs,
        string Email,
        string Role,
        string Level,
        DateTimeOffset? InterviewDate);
}

public record InterviewPrep(
    string id,
    string recruiterId,
    string recruiterName,
    string candidateName,
    string? knownAs,
    string email,
    string role,
    string level,
    DateTimeOffset interviewDate,
    string status,
    DateTimeOffset createdAt);
