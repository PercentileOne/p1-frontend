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

            if (string.IsNullOrWhiteSpace(req.FirstName))
                return Results.BadRequest(new { error = "First name is required." });
            if (string.IsNullOrWhiteSpace(req.LastName))
                return Results.BadRequest(new { error = "Last name is required." });
            if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
                return Results.BadRequest(new { error = "A valid candidate email is required." });
            if (string.IsNullOrWhiteSpace(req.Role))
                return Results.BadRequest(new { error = "Role is required." });
            if (string.IsNullOrWhiteSpace(req.Level))
                return Results.BadRequest(new { error = "Level/seniority is required." });
            if (req.InterviewDate is null)
                return Results.BadRequest(new { error = "Interview date is required." });
            // Job spec is the recruiter's responsibility, not the candidate's — questions need
            // to be grounded in the real role, not guessed from a one-line job title.
            if (string.IsNullOrWhiteSpace(req.JobSpecText))
                return Results.BadRequest(new { error = "Job spec is required." });

            var recruiterName = ctx.User.FindFirst("name")?.Value ?? "Your recruiter";

            var prep = new InterviewPrep(
                id: Guid.NewGuid().ToString(),
                recruiterId: recruiterId,
                recruiterName: recruiterName,
                title: string.IsNullOrWhiteSpace(req.Title) ? null : req.Title.Trim(),
                firstName: req.FirstName.Trim(),
                lastName: req.LastName.Trim(),
                email: req.Email.Trim().ToLower(),
                role: req.Role.Trim(),
                level: req.Level.Trim(),
                interviewDate: req.InterviewDate.Value,
                // Stored now so a future step can pre-generate the interview ahead of the
                // candidate's session (less waiting time for them) — not wired up yet, since
                // there's nowhere on the candidate side to consume it until the "Received
                // Interview Prep" connection (see class doc above) exists.
                jobSpecText: req.JobSpecText.Trim(),
                cvText: string.IsNullOrWhiteSpace(req.CvText) ? null : req.CvText.Trim(),
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

        var registerUrl = "https://candidate.interviewme.global/register" +
            $"?email={Uri.EscapeDataString(prep.email)}" +
            $"&firstName={Uri.EscapeDataString(prep.firstName)}" +
            $"&lastName={Uri.EscapeDataString(prep.lastName)}";

        var interviewDateStr = prep.interviewDate.ToString("dddd d MMMM 'at' h:mmtt");

        var benefits = new[]
        {
            "Practice with Sarah &amp; James, our AI interviewers, in a realistic mock interview",
            $"Questions tailored specifically to a {WebUtility.HtmlEncode(prep.role)} ({WebUtility.HtmlEncode(prep.level)}) role",
            "Instant, honest feedback to sharpen every answer",
            "100% free — no card, no catch",
        };
        var benefitsHtml = string.Join("\n", benefits.Select(b => $"""
                  <tr>
                    <td style="padding:0 0 14px;vertical-align:top;width:26px;">
                      <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(52,211,153,0.15);color:#34D399;font-size:12px;font-weight:800;line-height:20px;text-align:center;">✓</span>
                    </td>
                    <td style="padding:0 0 14px 10px;vertical-align:top;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;">{b}</td>
                  </tr>
            """));

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

                <div style="background:linear-gradient(160deg,#0d1117 0%,#0f1b16 100%);border:1px solid rgba(52,211,153,0.25);border-radius:20px;padding:44px 36px 36px;box-shadow:0 0 60px rgba(52,211,153,0.08);">

                  <div style="text-align:center;margin-bottom:22px;">
                    <span style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;background:radial-gradient(circle,rgba(52,211,153,0.22) 0%,rgba(52,211,153,0.06) 70%);font-size:28px;">🎁</span>
                  </div>

                  <p style="text-align:center;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#34D399;margin:0 0 10px;">A free gift from {WebUtility.HtmlEncode(prep.recruiterName)}</p>

                  <h1 style="text-align:center;font-size:23px;font-weight:800;color:#fff;margin:0 0 18px;line-height:1.35;">
                    {WebUtility.HtmlEncode(prep.firstName)}, here's a head start on your {WebUtility.HtmlEncode(prep.role)} interview
                  </h1>

                  <p style="text-align:center;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.7;margin:0 0 28px;">
                    {WebUtility.HtmlEncode(prep.recruiterName)} wants you walking into your interview on <strong style="color:#fff">{interviewDateStr}</strong> feeling fully prepared — so they've unlocked free access to InterviewMe, built just for this role.
                  </p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
                    {benefitsHtml}
                  </table>

                  <div style="text-align:center;margin-bottom:16px;">
                    <a href="{registerUrl}" style="display:inline-block;background:linear-gradient(135deg,#34D399,#059669);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 8px 24px rgba(52,211,153,0.35);">
                      Claim your free prep →
                    </a>
                  </div>
                  <p style="text-align:center;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(52,211,153,0.6);margin:0 0 28px;">100% free · no card required</p>

                  <p style="font-size:11px;color:rgba(255,255,255,0.25);line-height:1.7;margin:0;word-break:break-all;text-align:center;">
                    Or copy this link into your browser:<br/>{registerUrl}
                  </p>
                </div>

                <p style="text-align:center;font-size:12px;color:rgba(255,255,255,0.25);margin-top:24px;">
                  A gift from {WebUtility.HtmlEncode(prep.recruiterName)}, sent via InterviewMe.global
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
            Subject    = $"🎁 {prep.recruiterName} sent you a free gift for your {prep.role} interview",
            Body       = body,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(prep.email));
        await client.SendMailAsync(message);
        logger.LogInformation("Interview prep invite sent to {Email}", prep.email);
    }

    public record Request(
        string? Title,
        string FirstName,
        string LastName,
        string Email,
        string Role,
        string Level,
        DateTimeOffset? InterviewDate,
        string JobSpecText,
        string? CvText);
}

public record InterviewPrep(
    string id,
    string recruiterId,
    string recruiterName,
    string? title,
    string firstName,
    string lastName,
    string email,
    string role,
    string level,
    DateTimeOffset interviewDate,
    string jobSpecText,
    string? cvText,
    string status,
    DateTimeOffset createdAt);
