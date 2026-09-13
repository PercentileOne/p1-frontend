using System.Net;
using System.Net.Mail;
using System.Text.Json;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Anthropic;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.LearnAlerts;

/// <summary>
/// A candidate sets up a spaced-repetition MCQ alert for a job title — the platform emails one
/// AI-generated question at a time, on a candidate-chosen cadence, for a chosen duration.
/// Same "owner sets criteria once, platform pushes to them" shape as Features/Alerts/Endpoint.cs
/// (recruiter/employer talent alerts), copied-then-trimmed rather than shared since the payload
/// and the push mechanism (a question+answer loop, not a score-threshold match) are genuinely
/// different. The actual sending is done by LearnAlertsSendService (a BackgroundService, not a
/// separate Azure Function — see this feature's own plan/PR: Explain.Api is already an always-on
/// App Service, so a PeriodicTimer inside it needs no new Azure resource).
///
/// Anti-prefetch design (see GET .../answer/{token} below): corporate email scanners (Outlook
/// Safe Links, Gmail) pre-fetch every link in an email before a human opens it. If a bare GET
/// recorded the answer, every question would appear answered — usually wrong — within seconds of
/// sending. So the GET only ever renders a confirmation page; only the POST it submits to
/// actually records anything, since scanners fetch URLs but never submit forms.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        // POST /api/learn-alerts — create a new alert for the current candidate.
        app.MapPost("/api/learn-alerts", async (Request req, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();
            var candidateEmail = ctx.User.FindFirst("email")?.Value;
            if (string.IsNullOrEmpty(candidateEmail)) return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(req.JobTitle))
                return Results.BadRequest(new { error = "A job title is required." });

            var intervalHours = Math.Clamp(req.IntervalHours, 4, 168);
            var durationMonths = Math.Clamp(req.DurationMonths, 1, 3);
            var difficulty = req.Difficulty is "Standard" or "Pro" or "Expert" ? req.Difficulty : "Pro";
            var visibility = req.Visibility == "public" ? "public" : "hidden";

            // Stored as "o"-formatted UTC strings, not raw DateTimeOffset — Cosmos query-side
            // comparisons (LearnAlertsSendService's "which alerts are due") are safer as fixed-
            // width, lexicographically-sortable strings, same reasoning CosmosCareerService.cs
            // already documents for its own date fields.
            var nowIso = DateTimeOffset.UtcNow.ToString("o");
            var alert = new LearnAlert(
                id: Guid.NewGuid().ToString(),
                candidateId: candidateId,
                candidateEmail: candidateEmail.Trim().ToLower(),
                candidateName: ctx.User.FindFirst("name")?.Value ?? "there",
                jobTitle: req.JobTitle.Trim(),
                difficulty: difficulty,
                intervalHours: intervalHours,
                durationMonths: durationMonths,
                visibility: visibility,
                status: "active",
                createdAt: nowIso,
                // First question goes out on the very next send-service tick, not after a full
                // intervalHours wait — a candidate who just set this up expects to see it work.
                nextSendAt: nowIso,
                sentCount: 0,
                correctCount: 0,
                currentStreak: 0,
                longestStreak: 0);

            var container = cosmos.GetContainer("learnAlerts");
            await container.UpsertItemAsync(alert, new PartitionKey(alert.candidateId));
            return Results.Ok(alert);
        }).RequireAuthorization();

        // GET /api/learn-alerts — the current candidate's own alerts, newest first.
        app.MapGet("/api/learn-alerts", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            var alerts = await ReadCandidateAlertsAsync(cosmos, candidateId);
            return Results.Ok(alerts.OrderByDescending(a => a.createdAt));
        }).RequireAuthorization();

        // PATCH /api/learn-alerts/{id} — edit criteria or pause/resume.
        app.MapPatch("/api/learn-alerts/{id}", async (string id, UpdateRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("learnAlerts");
            LearnAlert existing;
            try
            {
                existing = await container.ReadItemAsync<LearnAlert>(id, new PartitionKey(candidateId));
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }

            var resuming = req.Status == "active" && existing.status != "active";
            var updated = existing with
            {
                jobTitle = string.IsNullOrWhiteSpace(req.JobTitle) ? existing.jobTitle : req.JobTitle.Trim(),
                difficulty = req.Difficulty is "Standard" or "Pro" or "Expert" ? req.Difficulty : existing.difficulty,
                intervalHours = req.IntervalHours is { } ih ? Math.Clamp(ih, 4, 168) : existing.intervalHours,
                durationMonths = req.DurationMonths is { } dm ? Math.Clamp(dm, 1, 3) : existing.durationMonths,
                visibility = req.Visibility is "public" or "hidden" ? req.Visibility : existing.visibility,
                status = req.Status is "active" or "paused" ? req.Status : existing.status,
                // Resuming a paused alert shouldn't dump every question that "would have" gone
                // out while paused — just pick up from now.
                nextSendAt = resuming ? DateTimeOffset.UtcNow.ToString("o") : existing.nextSendAt,
            };
            await container.UpsertItemAsync(updated, new PartitionKey(candidateId));
            return Results.Ok(updated);
        }).RequireAuthorization();

        // DELETE /api/learn-alerts/{id}
        app.MapDelete("/api/learn-alerts/{id}", async (string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("learnAlerts");
            try
            {
                await container.DeleteItemAsync<LearnAlert>(id, new PartitionKey(candidateId));
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* already gone */ }
            return Results.NoContent();
        }).RequireAuthorization();

        // GET /api/learn-alerts/summary — aggregate across all the candidate's alerts, for both
        // the Learn Alerts page and (phase 2) the dashboard's "Most Studied Topic" card slide.
        app.MapGet("/api/learn-alerts/summary", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            var alerts = await ReadCandidateAlertsAsync(cosmos, candidateId);
            var summary = new Summary(
                totalSent: alerts.Sum(a => a.sentCount),
                totalCorrect: alerts.Sum(a => a.correctCount),
                bestCurrentStreak: alerts.Count == 0 ? 0 : alerts.Max(a => a.currentStreak),
                bestLongestStreak: alerts.Count == 0 ? 0 : alerts.Max(a => a.longestStreak));
            return Results.Ok(summary);
        }).RequireAuthorization();

        // GET /learn-alerts/answer/{token}?choice=N — AllowAnonymous, reached straight from the
        // emailed link. Renders a confirmation page ONLY — see this file's own top comment on
        // why the GET itself must never record anything.
        app.MapGet("/learn-alerts/answer/{token}", async (string token, int? choice, CosmosService cosmos) =>
        {
            var question = await FindQuestionByTokenAsync(cosmos, token);
            if (question is null) return Results.Content(RenderMessagePage("Link not found", "This question link isn't valid — it may have already expired."), "text/html");
            if (choice is not (>= 0 and <= 3))
                return Results.Content(RenderMessagePage("Something's off", "That answer link looks incomplete."), "text/html");

            if (question.answeredAt is not null)
                return Results.Content(RenderResultPage(question, question.selectedIndex == question.correctIndex, alreadyAnswered: true, intervalHours: null), "text/html");

            return Results.Content(RenderConfirmPage(question, choice.Value), "text/html");
        }).AllowAnonymous();

        // POST /learn-alerts/answer/{token}/confirm — the only place an answer is actually
        // recorded. Idempotent: a second confirm on an already-answered question just re-shows
        // the original result instead of double-counting.
        app.MapPost("/learn-alerts/answer/{token}/confirm", async (string token, HttpRequest req, CosmosService cosmos) =>
        {
            var form = await req.ReadFormAsync();
            if (!int.TryParse(form["choice"], out var choice) || choice is < 0 or > 3)
                return Results.Content(RenderMessagePage("Something's off", "That answer link looks incomplete."), "text/html");

            var question = await FindQuestionByTokenAsync(cosmos, token);
            if (question is null) return Results.Content(RenderMessagePage("Link not found", "This question link isn't valid — it may have already expired."), "text/html");

            var questionsContainer = cosmos.GetContainer("learnAlertQuestions");
            var alertsContainer = cosmos.GetContainer("learnAlerts");

            if (question.answeredAt is not null)
            {
                // Already recorded (e.g. the candidate hit Confirm twice) — show the same result,
                // don't touch the streak again.
                return Results.Content(RenderResultPage(question, question.selectedIndex == question.correctIndex, alreadyAnswered: true, intervalHours: null), "text/html");
            }

            var isCorrect = choice == question.correctIndex;
            var answered = question with { answeredAt = DateTimeOffset.UtcNow.ToString("o"), selectedIndex = choice, isCorrect = isCorrect };
            await questionsContainer.UpsertItemAsync(answered, new PartitionKey(answered.candidateId));

            LearnAlert? alert;
            try
            {
                alert = await alertsContainer.ReadItemAsync<LearnAlert>(question.alertId, new PartitionKey(question.candidateId));
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                alert = null;
            }

            int? intervalHours = alert?.intervalHours;
            if (alert is not null)
            {
                var newStreak = isCorrect ? alert.currentStreak + 1 : 0;
                var updatedAlert = alert with
                {
                    correctCount = alert.correctCount + (isCorrect ? 1 : 0),
                    currentStreak = newStreak,
                    longestStreak = Math.Max(alert.longestStreak, newStreak),
                };
                await alertsContainer.UpsertItemAsync(updatedAlert, new PartitionKey(updatedAlert.candidateId));
            }

            return Results.Content(RenderResultPage(answered, isCorrect, alreadyAnswered: false, intervalHours: intervalHours), "text/html");
        }).AllowAnonymous().DisableAntiforgery();
    }

    private static async Task<List<LearnAlert>> ReadCandidateAlertsAsync(CosmosService cosmos, string candidateId)
    {
        var container = cosmos.GetContainer("learnAlerts");
        var query = new QueryDefinition("SELECT * FROM c WHERE c.candidateId = @cid").WithParameter("@cid", candidateId);
        var alerts = new List<LearnAlert>();
        using var feed = container.GetItemQueryIterator<LearnAlert>(
            query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(candidateId) });
        while (feed.HasMoreResults)
            alerts.AddRange(await feed.ReadNextAsync());
        return alerts;
    }

    // Cross-partition — a raw token gives no candidateId to scope the read to, same trade-off
    // Talks/Endpoint.cs's GET /api/talks/shared/{shareToken} already makes for the same reason.
    private static async Task<LearnAlertQuestion?> FindQuestionByTokenAsync(CosmosService cosmos, string token)
    {
        var container = cosmos.GetContainer("learnAlertQuestions");
        var query = new QueryDefinition("SELECT * FROM c WHERE c.answerToken = @token").WithParameter("@token", token);
        using var feed = container.GetItemQueryIterator<LearnAlertQuestion>(query);
        if (!feed.HasMoreResults) return null;
        var page = await feed.ReadNextAsync();
        return page.FirstOrDefault();
    }

    // ── Question generation (called by LearnAlertsSendService) ──────────────────────────────

    public static async Task<(string Question, List<string> Options, int CorrectIndex)?> GenerateQuestionAsync(
        AnthropicService anthropic, string jobTitle, string difficulty, ILogger logger)
    {
        var prompt =
            "Generate ONE multiple-choice interview-knowledge question testing genuine expertise a \"" +
            jobTitle + "\" candidate at \"" + difficulty + "\" difficulty should know.\n" +
            "Return JSON only, no markdown: {\"question\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"answer\":0}\n" +
            "\"answer\" is the INDEX (0-3) of the correct option. Make the three wrong options " +
            "genuinely plausible to someone who half-knows the subject, not obviously silly.";

        try
        {
            var json = await anthropic.CompleteAsync(prompt, maxTokens: 500);
            var raw = JsonSerializer.Deserialize<RawQuestion>(json, JsonOpts);
            if (raw?.Question is null || raw.Options is not { Count: 4 }) return null;
            return (raw.Question, raw.Options, Math.Clamp(raw.Answer, 0, 3));
        }
        catch (Exception ex)
        {
            logger.LogWarning("Learn Alerts question generation failed for '{JobTitle}': {Error}", jobTitle, ex.Message);
            return null;
        }
    }

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };
    private class RawQuestion
    {
        public string? Question { get; set; }
        public List<string>? Options { get; set; }
        public int Answer { get; set; }
    }

    // ── Email (called by LearnAlertsSendService) ────────────────────────────────────────────

    // The backend's own public host — these links are handled by this same Minimal API
    // (GET/POST /learn-alerts/answer/...), not a frontend SPA route, so this points at
    // api.explain.global, not AppUrl (which is the candidate-portal frontend). Hardcoded
    // rather than configured, same convention as Talks/Endpoint.cs's ShareBaseUrl const.
    private const string AnswerBaseUrl = "https://api.explain.global/learn-alerts/answer";

    public static async Task SendQuestionEmailAsync(LearnAlert alert, LearnAlertQuestion question, IConfiguration config, ILogger logger)
    {
        var smtpHost = config["Email:SmtpHost"];
        var smtpUser = config["Email:SmtpUser"];
        var smtpPass = config["Email:SmtpPass"];
        if (string.IsNullOrWhiteSpace(smtpHost) || string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
        {
            logger.LogWarning("Email:Smtp* not configured — skipping Learn Alert question email to {Email}", alert.candidateEmail);
            return;
        }

        var smtpPort = int.Parse(config["Email:SmtpPort"] ?? "587");
        var fromEmail = config["Email:FromEmail"] ?? "noreply@theinterviewchair.com";
        var fromName = config["Email:FromName"] ?? "TheInterviewChair.com";

        var optionLinks = string.Join("", question.options.Select((opt, i) => $"""
            <a href="{AnswerBaseUrl}/{question.answerToken}?choice={i}" style="display:block;text-align:left;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:14px 18px;margin-bottom:10px;color:#fff;text-decoration:none;font-size:14px;font-weight:600;">
              {WebUtility.HtmlEncode(opt)}
            </a>
            """));

        var body = $"""
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#07080f;font-family:-apple-system,'Segoe UI',sans-serif;">
              <div style="max-width:560px;margin:40px auto;padding:0 20px;">
                <div style="text-align:center;margin-bottom:28px;">
                  <p style="font-size:18px;font-weight:700;color:#fff;margin:0;">
                    <strong style="color:#34D399">The</strong><strong style="color:#fff">Interview</strong><strong style="color:#34D399">Chair</strong><span style="color:rgba(255,255,255,0.55);font-weight:400">.com</span>
                  </p>
                </div>
                <div style="background:linear-gradient(160deg,#0d1117 0%,#0f1a14 100%);border:1px solid rgba(52,211,153,0.3);border-radius:20px;padding:36px 30px;">
                  <p style="text-align:center;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#34D399;margin:0 0 10px;">
                    🧠 Learn Alert — {WebUtility.HtmlEncode(alert.jobTitle)}
                  </p>
                  <h1 style="text-align:center;font-size:19px;font-weight:700;color:#fff;margin:0 0 24px;line-height:1.5;">
                    {WebUtility.HtmlEncode(question.questionText)}
                  </h1>
                  {optionLinks}
                  <p style="text-align:center;font-size:12px;color:rgba(255,255,255,0.4);margin:20px 0 0;">
                    Pick an answer above — you'll get a confirmation page before it's scored.
                  </p>
                </div>
              </div>
            </body>
            </html>
            """;

        using var client = new SmtpClient(smtpHost, smtpPort) { Credentials = new NetworkCredential(smtpUser, smtpPass), EnableSsl = true };
        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = $"🧠 Quick one for you: {alert.jobTitle}",
            Body = body,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(alert.candidateEmail));
        await client.SendMailAsync(message);
        logger.LogInformation("Learn Alert question email sent to {Email} for alert {AlertId}", alert.candidateEmail, alert.id);
    }

    // ── HTML pages for the click-through flow ───────────────────────────────────────────────

    private static string RenderConfirmPage(LearnAlertQuestion q, int choice)
    {
        var pickedText = WebUtility.HtmlEncode(q.options[choice]);
        return WrapPage($"""
            <p style="font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#34D399;margin:0 0 10px;">Confirm your answer</p>
            <h1 style="font-size:19px;font-weight:700;color:#fff;margin:0 0 18px;line-height:1.5;">{WebUtility.HtmlEncode(q.questionText)}</h1>
            <p style="font-size:15px;color:rgba(255,255,255,0.75);margin:0 0 26px;">You picked: <strong style="color:#fff;">{pickedText}</strong></p>
            <form method="post" action="{AnswerBaseUrl}/{q.answerToken}/confirm">
              <input type="hidden" name="choice" value="{choice}" />
              <button type="submit" style="width:100%;padding:15px;border:none;border-radius:12px;background:linear-gradient(135deg,#34D399,#059669);color:#04150f;font-size:15px;font-weight:800;cursor:pointer;">
                Confirm my answer
              </button>
            </form>
            """);
    }

    private static string RenderResultPage(LearnAlertQuestion q, bool isCorrect, bool alreadyAnswered, int? intervalHours)
    {
        var correctText = WebUtility.HtmlEncode(q.options[q.correctIndex]);
        var prefix = alreadyAnswered ? "<p style=\"font-size:12px;color:rgba(255,255,255,0.4);margin:0 0 14px;\">You already answered this one.</p>" : "";
        return isCorrect
            ? WrapPage($"""
                {prefix}
                <div style="font-size:44px;margin-bottom:8px;">🎉</div>
                <h1 style="font-size:22px;font-weight:800;color:#34D399;margin:0 0 10px;">Nailed it!</h1>
                <p style="font-size:15px;color:rgba(255,255,255,0.75);margin:0;">The correct answer was <strong style="color:#fff;">{correctText}</strong>.</p>
                """, confetti: true)
            : WrapPage($"""
                {prefix}
                <div style="font-size:44px;margin-bottom:8px;">🙂</div>
                <h1 style="font-size:22px;font-weight:800;color:#fff;margin:0 0 10px;">Never mind!</h1>
                <p style="font-size:15px;color:rgba(255,255,255,0.75);margin:0 0 6px;">The correct answer was <strong style="color:#fff;">{correctText}</strong>.</p>
                <p style="font-size:13px;color:rgba(255,255,255,0.5);margin:0;">
                  {(intervalHours is { } ih ? $"You'll get another one in about {FormatInterval(ih)}." : "")}
                </p>
                """);
    }

    // "in about 8 hours" for sub-daily cadences, "in about 3 days" once it rounds to a whole day
    // or more — matches how the frequency itself is presented in the create form.
    private static string FormatInterval(int hours)
    {
        if (hours < 24) return $"{hours} hour{(hours == 1 ? "" : "s")}";
        var days = hours / 24;
        return $"{days} day{(days == 1 ? "" : "s")}";
    }

    private static string RenderMessagePage(string title, string message) => WrapPage($"""
        <h1 style="font-size:20px;font-weight:700;color:#fff;margin:0 0 10px;">{WebUtility.HtmlEncode(title)}</h1>
        <p style="font-size:14px;color:rgba(255,255,255,0.6);margin:0;">{WebUtility.HtmlEncode(message)}</p>
        """);

    // Small, dependency-free confetti burst (CSS + a few lines of JS) — matches this codebase's
    // existing "no chart/animation library, hand-roll it" convention (WaveformBars, DimensionRow).
    private static string WrapPage(string innerHtml, bool confetti = false) => $"""
        <!DOCTYPE html>
        <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
        <body style="margin:0;padding:0;background:#07080f;font-family:-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
          <div style="max-width:480px;width:100%;margin:20px;padding:36px 30px;background:linear-gradient(160deg,#0d1117 0%,#0f1a14 100%);border:1px solid rgba(52,211,153,0.3);border-radius:20px;text-align:center;">
            {innerHtml}
          </div>
          {(confetti ? ConfettiScript : "")}
        </body>
        </html>
        """;

    private const string ConfettiScript = """
        <canvas id="c" style="position:fixed;inset:0;pointer-events:none;"></canvas>
        <script>
          var c = document.getElementById('c'), ctx = c.getContext('2d');
          c.width = innerWidth; c.height = innerHeight;
          var colors = ['#34D399','#4F8EF7','#F59E0B','#EF4444','#fff'];
          var pieces = Array.from({length:120}, function(){ return {
            x: Math.random()*c.width, y: -20-Math.random()*c.height*0.5,
            r: 4+Math.random()*5, c: colors[Math.floor(Math.random()*colors.length)],
            vy: 2+Math.random()*3, vx: -2+Math.random()*4, rot: Math.random()*360, vr: -6+Math.random()*12
          };});
          (function tick(){
            ctx.clearRect(0,0,c.width,c.height);
            pieces.forEach(function(p){
              p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
              ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
              ctx.fillStyle=p.c; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6); ctx.restore();
            });
            if (pieces.some(function(p){ return p.y < c.height+20; })) requestAnimationFrame(tick);
          })();
        </script>
        """;

    public record Request(string JobTitle, string Difficulty, int IntervalHours, int DurationMonths, string Visibility);
    public record UpdateRequest(string? JobTitle, string? Difficulty, int? IntervalHours, int? DurationMonths, string? Visibility, string? Status);
    public record Summary(int totalSent, int totalCorrect, int bestCurrentStreak, int bestLongestStreak);
}

public record LearnAlert(
    string id,
    string candidateId,
    string candidateEmail,
    string candidateName,
    string jobTitle,
    string difficulty,      // "Standard" | "Pro" | "Expert" — same vocabulary as interview difficulty
    int intervalHours,      // 4-168, hours between questions — supports both "3x/day" (8) and "weekly" (168)
    int durationMonths,     // 1-3
    string visibility,      // "public" | "hidden" — reserved for a future leaderboard, unused for now
    string status,          // "active" | "paused" | "completed"
    string createdAt,       // "o"-formatted UTC — see the POST handler's own comment
    string nextSendAt,      // ditto
    int sentCount,
    int correctCount,
    int currentStreak,
    int longestStreak);

public record LearnAlertQuestion(
    string id,
    string candidateId,
    string alertId,
    string jobTitle,
    string questionText,
    List<string> options,
    int correctIndex,
    string answerToken,
    string sentAt,           // "o"-formatted UTC
    string? answeredAt,
    int? selectedIndex,
    bool? isCorrect);
