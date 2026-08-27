using System.Net;
using System.Net.Mail;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Introductions;

/// <summary>
/// The "introduce an employer" loop, one level up from Interview Preps: a recruiter or the
/// candidate themselves sends an employer a link to watch one candidate's interview/score, no
/// employer account required to watch. Mirrors InterviewPreps' Cosmos/email pattern closely.
///
/// Two senders, one shape, different meaning: a Recruiter introduction is fee-bearing (needs a
/// timestamp/provenance record so a placement fee is never disputable), a Candidate's own share
/// is free. Both land in the same employer inbox — see GET .../received below.
///
/// "Watch free, act requires an account" — same reasoning as the candidate side (guest interview
/// rooms were rejected for exactly this). GET .../watch/{id} is deliberately anonymous.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // POST /api/introductions — send an employer a link to one candidate's interview.
        // Any authenticated Recruiter or Candidate can call this; which one determines whether
        // a fee applies. Not gated by a single named permission because it's legitimately either.
        app.MapPost("/api/introductions", async (Request req, HttpContext ctx, CosmosService cosmos, IConfiguration config, ILogger<Program> logger) =>
        {
            var senderId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(senderId)) return Results.Unauthorized();

            var perms = ctx.User.FindAll("perm").Select(c => c.Value).ToHashSet();
            var isRecruiter = perms.Contains("CAN_MANAGE_INTERVIEWS");
            var isCandidate = perms.Contains("CAN_PRACTICE_INTERVIEW");
            if (!isRecruiter && !isCandidate)
                return Results.Forbid();

            if (string.IsNullOrWhiteSpace(req.CandidateName))
                return Results.BadRequest(new { error = "Candidate name is required." });
            if (string.IsNullOrWhiteSpace(req.EmployerEmail) || !req.EmployerEmail.Contains('@'))
                return Results.BadRequest(new { error = "A valid employer email is required." });

            var senderName = ctx.User.FindFirst("name")?.Value ?? (isRecruiter ? "A recruiter" : "A candidate");
            var senderType = isRecruiter ? "recruiter" : "candidate";

            // Only a recruiter's introduction can carry a fee — a candidate sharing their own
            // interview is always free, regardless of what a tampered request body claims.
            var proposedFeeGbp = isRecruiter ? req.ProposedFeeGbp : null;

            var intro = new Introduction(
                id: Guid.NewGuid().ToString(),
                senderId: senderId,
                senderType: senderType,
                senderName: senderName,
                candidateName: req.CandidateName.Trim(),
                candidateRole: req.CandidateRole?.Trim(),
                overallScore: req.OverallScore,
                playbackUrl: req.PlaybackUrl?.Trim(),
                employerEmail: req.EmployerEmail.Trim().ToLower(),
                employerCompany: string.IsNullOrWhiteSpace(req.EmployerCompany) ? null : req.EmployerCompany.Trim(),
                message: string.IsNullOrWhiteSpace(req.Message) ? null : req.Message.Trim(),
                proposedFeeGbp: proposedFeeGbp,
                status: "sent",
                createdAt: DateTimeOffset.UtcNow,
                viewedAt: null);

            var container = cosmos.GetContainer("introductions");
            await container.UpsertItemAsync(intro, new PartitionKey(intro.senderId));

            try
            {
                await SendIntroductionEmailAsync(intro, config, logger);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send introduction email to {Email}", intro.employerEmail);
            }

            return Results.Ok(intro);
        }).RequireAuthorization();

        // GET /api/introductions — every introduction the current sender (recruiter or
        // candidate) has sent, newest first.
        app.MapGet("/api/introductions", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var senderId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(senderId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("introductions");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.senderId = @sid")
                .WithParameter("@sid", senderId);

            var intros = new List<Introduction>();
            using var feed = container.GetItemQueryIterator<Introduction>(
                query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(senderId) });
            while (feed.HasMoreResults)
                intros.AddRange(await feed.ReadNextAsync());

            return Results.Ok(intros.OrderByDescending(i => i.createdAt));
        }).RequireAuthorization();

        // GET /api/introductions/received — every introduction addressed to the logged-in
        // employer's own email. Cross-partition (partitioned by senderId, not employerEmail) —
        // same trade-off InterviewPreps makes for its candidate-side received list: a fine cost
        // for a comparatively rare, low-volume read.
        app.MapGet("/api/introductions/received", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var email = ctx.User.FindFirst("email")?.Value;
            if (string.IsNullOrEmpty(email)) return Results.Unauthorized();

            var container = cosmos.GetContainer("introductions");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.employerEmail = @email")
                .WithParameter("@email", email.Trim().ToLower());

            var intros = new List<Introduction>();
            using var feed = container.GetItemQueryIterator<Introduction>(query); // cross-partition — see class doc
            while (feed.HasMoreResults)
                intros.AddRange(await feed.ReadNextAsync());

            return Results.Ok(intros.OrderByDescending(i => i.createdAt));
        }).RequireAuthorization(Permissions.ViewEmployerPortal);

        // GET /api/introductions/watch/{id} — deliberately anonymous. Anyone with the link can
        // watch; only acting on it (accept/decline) requires an employer account. Cosmos point
        // reads need the partition key, which the public link doesn't carry, so this does a
        // cross-partition lookup by id instead — acceptable at this volume, same reasoning as
        // the received-list query above.
        app.MapGet("/api/introductions/watch/{id}", async (string id, CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("introductions");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.id = @id").WithParameter("@id", id);

            Introduction? intro = null;
            using (var feed = container.GetItemQueryIterator<Introduction>(query))
            {
                while (feed.HasMoreResults && intro is null)
                    intro = (await feed.ReadNextAsync()).FirstOrDefault();
            }
            if (intro is null) return Results.NotFound(new { error = "This introduction link isn't valid." });

            if (intro.status == "sent")
            {
                var viewed = intro with { status = "viewed", viewedAt = DateTimeOffset.UtcNow };
                await container.UpsertItemAsync(viewed, new PartitionKey(viewed.senderId));
                intro = viewed;
            }

            return Results.Ok(intro);
        }).AllowAnonymous();

        // POST /api/introductions/{id}/respond — the employer accepting or declining. Requires
        // a real employer account (the "act requires an account" half of the model).
        app.MapPost("/api/introductions/{id}/respond", async (string id, RespondRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var email = ctx.User.FindFirst("email")?.Value;
            if (string.IsNullOrEmpty(email)) return Results.Unauthorized();
            if (req.Status != "accepted" && req.Status != "declined")
                return Results.BadRequest(new { error = "Status must be 'accepted' or 'declined'." });

            var container = cosmos.GetContainer("introductions");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.id = @id").WithParameter("@id", id);

            Introduction? intro = null;
            using (var feed = container.GetItemQueryIterator<Introduction>(query))
            {
                while (feed.HasMoreResults && intro is null)
                    intro = (await feed.ReadNextAsync()).FirstOrDefault();
            }
            if (intro is null) return Results.NotFound(new { error = "Introduction not found." });
            if (intro.employerEmail != email.Trim().ToLower()) return Results.Forbid();

            var updated = intro with { status = req.Status };
            await container.UpsertItemAsync(updated, new PartitionKey(updated.senderId));
            return Results.Ok(updated);
        }).RequireAuthorization(Permissions.ViewEmployerPortal);
    }

    private static async Task SendIntroductionEmailAsync(Introduction intro, IConfiguration config, ILogger logger)
    {
        var smtpHost = config["Email:SmtpHost"];
        var smtpUser = config["Email:SmtpUser"];
        var smtpPass = config["Email:SmtpPass"];

        if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
        {
            logger.LogWarning("Email:Smtp* not configured — skipping introduction email to {Email}", intro.employerEmail);
            return;
        }

        var smtpPort  = int.Parse(config["Email:SmtpPort"] ?? "587");
        var fromEmail = config["Email:FromEmail"] ?? "noreply@interviewme.global";
        var fromName  = config["Email:FromName"] ?? "InterviewMe";

        var watchUrl = $"https://employer.interviewme.global/watch/{intro.id}";
        var scoreLine = intro.overallScore is not null ? $" — scored {intro.overallScore}%" : "";
        var feeLine = intro.proposedFeeGbp is not null
            ? $"<p style=\"text-align:center;font-size:12px;color:rgba(255,255,255,0.4);margin:0 0 20px;\">Proposed introduction fee: £{intro.proposedFeeGbp:N0}</p>"
            : "";

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
                  <p style="text-align:center;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#34D399;margin:0 0 10px;">
                    {WebEncode(intro.senderName)} thinks you should meet
                  </p>
                  <h1 style="text-align:center;font-size:23px;font-weight:800;color:#fff;margin:0 0 18px;line-height:1.35;">
                    {WebEncode(intro.candidateName)}{(intro.candidateRole is not null ? $" — {WebEncode(intro.candidateRole)}" : "")}{scoreLine}
                  </h1>
                  {(intro.message is not null ? $"<p style=\"text-align:center;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 24px;font-style:italic;\">\"{WebEncode(intro.message)}\"</p>" : "")}
                  <div style="text-align:center;margin-bottom:12px;">
                    <a href="{watchUrl}" style="display:inline-block;background:linear-gradient(135deg,#34D399,#059669);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 8px 24px rgba(52,211,153,0.35);">
                      Watch the interview →
                    </a>
                  </div>
                  <p style="text-align:center;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(52,211,153,0.6);margin:0 0 6px;">Free to watch · no account needed</p>
                  {feeLine}
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
            Subject    = $"{intro.senderName} thinks you should meet {intro.candidateName}",
            Body       = body,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(intro.employerEmail));
        await client.SendMailAsync(message);
        logger.LogInformation("Introduction email sent to {Email}", intro.employerEmail);
    }

    private static string WebEncode(string s) => WebUtility.HtmlEncode(s);

    public record Request(
        string CandidateName,
        string? CandidateRole,
        int? OverallScore,
        string? PlaybackUrl,
        string EmployerEmail,
        string? EmployerCompany,
        string? Message,
        decimal? ProposedFeeGbp);

    public record RespondRequest(string Status);
}

public record Introduction(
    string id,
    string senderId,
    string senderType,          // "recruiter" | "candidate"
    string senderName,
    string candidateName,
    string? candidateRole,
    int? overallScore,
    string? playbackUrl,
    string employerEmail,
    string? employerCompany,
    string? message,
    decimal? proposedFeeGbp,    // only ever set when senderType == "recruiter"
    string status,              // "sent" | "viewed" | "accepted" | "declined"
    DateTimeOffset createdAt,
    DateTimeOffset? viewedAt);
