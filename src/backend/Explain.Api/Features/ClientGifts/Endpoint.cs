using System.Net;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Cosmos;
using Explain.Api.Infrastructure.Email;
using Explain.Api.Features.QuestionPacks;

namespace Explain.Api.Features.ClientGifts;

/// <summary>
/// "Gift interview questions to your client" (Francis, 2026-09-23, from a real conversation with
/// Mike Petrie at Vallum Associates): a recruiter preps the CANDIDATE the usual way (Interview
/// Preps), but can also send the CLIENT — the actual hiring-side interviewer — their own free
/// batch of interview questions, branded as a gift from the recruiter/agency. Deliberately a much
/// larger count (default 50, same 1-50 range as the public Question Packs product) than a
/// candidate's own pack, so the client never fears they've just been handed the same list the
/// candidate got. Free, included with the recruiter's seat — no Stripe involved at all.
///
/// Same client + same job role reuses the previously generated pack (see BuildKey) rather than
/// paying for a fresh Model Router call every time — Francis's own observation: "the client may
/// just use the same questions from their last interview, so the service won't be used every
/// time". Pass Regenerate=true to force a fresh, different set instead.
///
/// Mirrors Features/Introductions' Cosmos/email shape closely — same "watch/claim free, no
/// recipient account needed" model, just gifting a downloadable question set instead of an
/// interview link.
/// </summary>
public static class Endpoint
{
    public record GiftRequest(
        string? EmployerEmail, string? EmployerCompany, string? JobRole,
        string? Difficulty, int? Count, string? Message, bool? Regenerate);

    public static void Map(WebApplication app)
    {
        // POST /api/client-gifts — a recruiter gifting a batch of questions to their client.
        app.MapPost("/api/client-gifts", async (GiftRequest req, HttpContext ctx, CosmosService cosmos, IEmailSender emailSender, IHttpClientFactory factory, IConfiguration config, ILogger<Program> logger) =>
        {
            var recruiterId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(recruiterId)) return Results.Unauthorized();
            var perms = ctx.User.FindAll("perm").Select(c => c.Value).ToHashSet();
            if (!perms.Contains("CAN_MANAGE_INTERVIEWS")) return Results.Forbid();

            var employerEmail = (req.EmployerEmail ?? "").Trim().ToLower();
            if (employerEmail.Length == 0 || !employerEmail.Contains('@'))
                return Results.BadRequest(new { error = "A valid client email is required." });
            var role = QuestionPacks.Endpoint.CleanRole(req.JobRole);
            if (role is null) return Results.BadRequest(new { error = "Tell us the job role you'd like questions for." });
            var difficulty = QuestionPackGenerator.CleanDifficulty(req.Difficulty);
            var count = QuestionPackGenerator.CleanCount(req.Count ?? 50);
            var regenerate = req.Regenerate ?? false;

            var recruiterName = ctx.User.FindFirst("name")?.Value ?? "Your recruiter";
            var agencyName = ctx.User.FindFirst("orgName")?.Value;

            var container = cosmos.GetContainer("client-gifts");
            var giftId = BuildKey(recruiterId, employerEmail, role);

            ClientGift? gift = null;
            try { gift = await container.ReadItemAsync<ClientGift>(giftId, new PartitionKey(recruiterId)); }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* first time for this client+role */ }

            if (gift is null || regenerate)
            {
                List<QuestionPackGenerator.QaPair> questions;
                try { questions = await QuestionPackGenerator.GenerateAsync(role, [], difficulty, count, factory, config); }
                catch (Exception ex)
                {
                    logger.LogError(ex, "ClientGifts: pack generation failed for {Role}", role);
                    return Results.Json(new { error = "We couldn't generate the questions just now — please try again." }, statusCode: 502);
                }
                if (questions.Count == 0)
                    return Results.Json(new { error = "We couldn't generate the questions just now — please try again." }, statusCode: 502);

                gift = new ClientGift(
                    id: giftId,
                    recruiterId: recruiterId,
                    recruiterName: recruiterName,
                    agencyName: agencyName,
                    employerEmail: employerEmail,
                    employerCompany: string.IsNullOrWhiteSpace(req.EmployerCompany) ? gift?.employerCompany : req.EmployerCompany!.Trim(),
                    jobRole: role,
                    difficulty: difficulty,
                    count: questions.Count,
                    questions: questions,
                    message: string.IsNullOrWhiteSpace(req.Message) ? gift?.message : req.Message!.Trim(),
                    createdAt: gift?.createdAt ?? DateTimeOffset.UtcNow,
                    lastSentAt: DateTimeOffset.UtcNow,
                    sendCount: (gift?.sendCount ?? 0) + 1);
            }
            else
            {
                // Reusing an existing pack — still refresh the company/message/last-sent, exactly the
                // "same client, same role, don't regenerate" path Francis asked for.
                gift = gift with
                {
                    employerCompany = string.IsNullOrWhiteSpace(req.EmployerCompany) ? gift.employerCompany : req.EmployerCompany!.Trim(),
                    message = string.IsNullOrWhiteSpace(req.Message) ? gift.message : req.Message!.Trim(),
                    lastSentAt = DateTimeOffset.UtcNow,
                    sendCount = gift.sendCount + 1,
                };
            }

            await container.UpsertItemAsync(gift, new PartitionKey(recruiterId));

            try { await SendGiftEmailAsync(gift, emailSender, config, logger); }
            catch (Exception ex) { logger.LogError(ex, "Failed to send client-gift email to {Email}", gift.employerEmail); }

            return Results.Ok(new { gift.id, reused = !regenerate && gift.sendCount > 1, gift.count });
        }).RequireAuthorization();

        // POST /api/client-gifts/delete — removes the recruiter's OWN gifts (Francis, 2026-09-25: clearing out test sends).
        // Ownership is the Cosmos partition key (recruiterId from the JWT), so anyone else's id is simply not found.
        // The public link the client was emailed (/questions/gift/{id}) stops working once its gift is deleted.
        app.MapPost("/api/client-gifts/delete", async (GiftDeleteRequest req, HttpContext ctx, CosmosService cosmos) =>
        {
            var recruiterId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(recruiterId)) return Results.Unauthorized();
            var ids = (req.Ids ?? []).Where(i => !string.IsNullOrWhiteSpace(i)).Distinct().Take(200).ToList();
            if (ids.Count == 0) return Results.BadRequest(new { error = "No client gifts selected." });

            var container = cosmos.GetContainer("client-gifts");
            var deleted = 0;
            foreach (var id in ids)
            {
                try { await container.DeleteItemAsync<ClientGift>(id, new PartitionKey(recruiterId)); deleted++; }
                catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound) { /* not theirs, or already gone */ }
            }
            return Results.Ok(new { deleted });
        }).RequireAuthorization();

        // GET /api/client-gifts — this recruiter's own gift history, newest first.
        app.MapGet("/api/client-gifts", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var recruiterId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(recruiterId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("client-gifts");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.recruiterId = @rid").WithParameter("@rid", recruiterId);
            var gifts = new List<ClientGift>();
            using var feed = container.GetItemQueryIterator<ClientGift>(
                query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(recruiterId) });
            while (feed.HasMoreResults) gifts.AddRange(await feed.ReadNextAsync());

            return Results.Ok(gifts.OrderByDescending(g => g.lastSentAt)
                .Select(g => new { g.id, g.employerEmail, g.employerCompany, g.jobRole, g.difficulty, g.count, g.lastSentAt, g.sendCount }));
        }).RequireAuthorization();

        // GET /api/client-gifts/{id} — deliberately anonymous, same trust level as
        // Introductions' watch link: whoever has the emailed link can view/print the questions.
        app.MapGet("/api/client-gifts/{id}", async (string id, CosmosService cosmos) =>
        {
            var container = cosmos.GetContainer("client-gifts");
            var query = new QueryDefinition("SELECT * FROM c WHERE c.id = @id").WithParameter("@id", id);
            ClientGift? gift = null;
            using (var feed = container.GetItemQueryIterator<ClientGift>(query))
                while (feed.HasMoreResults && gift is null) gift = (await feed.ReadNextAsync()).FirstOrDefault();
            if (gift is null) return Results.NotFound(new { error = "This link isn't valid." });

            return Results.Ok(new
            {
                jobRole = gift.jobRole,
                difficulty = gift.difficulty,
                questions = gift.questions,
                recruiterName = gift.recruiterName,
                agencyName = gift.agencyName,
                employerCompany = gift.employerCompany,
            });
        }).AllowAnonymous();
    }

    // Stable per (recruiter, client, role) so a repeat gift updates the SAME document instead of
    // piling up duplicates — this key IS the cache Francis asked for.
    private static string BuildKey(string recruiterId, string employerEmail, string role) =>
        Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes($"{recruiterId}|{employerEmail}|{role.ToLowerInvariant()}"))).ToLowerInvariant();

    private static async Task SendGiftEmailAsync(ClientGift gift, IEmailSender emailSender, IConfiguration config, ILogger logger)
    {
        var appUrl = config["CandidateAppUrl"] ?? "http://localhost:5173";
        var viewUrl = $"{appUrl}/questions/gift/{gift.id}";
        var fromLine = gift.agencyName is not null ? $"{gift.recruiterName}, from {gift.agencyName}" : gift.recruiterName;
        var messageLine = gift.message is not null
            ? $"<p style=\"text-align:center;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 24px;font-style:italic;\">\"{WebEncode(gift.message)}\"</p>"
            : "";

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
                <div style="background:linear-gradient(160deg,#0d1117 0%,#0f1b16 100%);border:1px solid rgba(52,211,153,0.25);border-radius:20px;padding:44px 36px 36px;box-shadow:0 0 60px rgba(52,211,153,0.08);">
                  <p style="text-align:center;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#34D399;margin:0 0 10px;">
                    A gift from {WebEncode(fromLine)}
                  </p>
                  <h1 style="text-align:center;font-size:23px;font-weight:800;color:#fff;margin:0 0 18px;line-height:1.35;">
                    {gift.count} interview questions for your {WebEncode(gift.jobRole)} interview
                  </h1>
                  <p style="text-align:center;font-size:13px;color:rgba(255,255,255,0.55);line-height:1.7;margin:0 0 24px;">
                    {WebEncode(gift.recruiterName)} thought you'd appreciate a head start — a printable set of {gift.count} AI-written interview questions with model answers, so you never have to scramble for what to ask.
                  </p>
                  {messageLine}
                  <div style="text-align:center;margin-bottom:12px;">
                    <a href="{viewUrl}" style="display:inline-block;background:linear-gradient(135deg,#34D399,#059669);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 8px 24px rgba(52,211,153,0.35);">
                      View &amp; download your questions →
                    </a>
                  </div>
                  <p style="text-align:center;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(52,211,153,0.6);margin:0;">Free · no account needed</p>
                </div>
              </div>
            </body>
            </html>
            """;

        await emailSender.SendAsync(gift.employerEmail, $"{fromLine} has gifted you {gift.count} interview questions", body);
        logger.LogInformation("Client-gift email sent to {Email}", gift.employerEmail);
    }

    private static string WebEncode(string s) => WebUtility.HtmlEncode(s);
}

public record GiftDeleteRequest(List<string>? Ids);

public record ClientGift(
    string id,
    string recruiterId,
    string recruiterName,
    string? agencyName,
    string employerEmail,
    string? employerCompany,
    string jobRole,
    string difficulty,
    int count,
    List<QuestionPackGenerator.QaPair> questions,
    string? message,
    DateTimeOffset createdAt,
    DateTimeOffset lastSentAt,
    int sendCount);
