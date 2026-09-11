using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.CareerCoach;

/// <summary>
/// "My Career Coach" (Francis, 2026-09-11) — multiple named chat threads per candidate, each
/// a warm, on-brand conversation with an AI career coach. Deliberately BACKEND-orchestrated
/// rather than following this codebase's usual pattern (frontend builds the prompt, calls the
/// anonymous /api/ai-proxy directly) — that pattern has no way to enforce a real spend cap,
/// since /api/ai-proxy is unauthenticated and un-metered by design. An "unlimited" chat feature
/// is the one place in this app where every single message is a fresh, uncached AI call, so the
/// daily cap below has to be authoritative server-side, not a frontend-side soft check a
/// candidate (or anyone finding the endpoint) could simply bypass by calling ai-proxy directly.
/// </summary>
public static class Endpoint
{
    // Hard daily backstop (Francis, 2026-09-11: cost is the real risk on this feature).
    // Generous enough that no genuine coaching conversation ever hits it in normal use, tight
    // enough to bound worst-case monthly spend to something predictable regardless of how many
    // candidates are active or how enthusiastically any one of them chats.
    private const int DailyMessageCap = 40;

    // Only the last few exchanges ride along on every subsequent call — resending a thread's
    // FULL history on every message is exactly how a long-running "chat until the cows come
    // home" relationship quietly compounds token cost with every single message a returning
    // candidate ever sends. Recent context is what actually matters for a coherent reply; the
    // rest of the thread stays in Cosmos for the candidate to scroll back through, it just
    // isn't re-sent to the model.
    private const int ContextMessageCount = 12;

    private const string SystemPrompt = """
        You are the Career Coach on TheInterviewChair.com — a warm, genuinely encouraging career
        companion for job seekers. You help with career decisions, job search strategy, confidence,
        upskilling, interview prep, and making sense of a difficult job market. You know about this
        platform's own features (practice interviews, the Learn courses, the Careers explorer, Live
        Job Market data) and can point candidates toward them when relevant.

        Stay in your lane: you are not a lawyer, doctor, financial adviser, or therapist. If someone
        asks for advice that genuinely needs one of those, say so plainly and gently suggest they
        speak to a qualified professional — don't refuse coldly, just be honest about where your
        usefulness ends. If someone seems to be in real distress or mentions self-harm, respond with
        care, take it seriously, and encourage them to reach out to a real person or a crisis line —
        never treat it as just another chat topic to coach through.

        You're a career coach, not a general chatbot — if someone asks something with nothing to do
        with their career, job search, confidence, or upskilling (sports scores, general trivia,
        etc.), give a brief, honest one-line answer or say you can't help with that, then warmly
        steer the conversation back to what you're actually here for. Don't refuse coldly and don't
        pretend you can't talk about anything else — just keep the focus on their career.

        If asked directly whether you're an AI, say yes, honestly — you're an AI career coach, not a
        human on the other end. Otherwise just be yourself: warm, specific, genuinely helpful, never
        generic or corporate. Keep replies conversational — a few sentences, not an essay — unless
        the question genuinely calls for more.

        Write in plain text only — the chat window doesn't render markdown, so never use **bold**,
        # headings, or markdown-style bullet points. For a list, just use plain numbers like "1."
        or a line break and a dash, the way you'd type it in a text message.
        """;

    public static void Map(WebApplication app)
    {
        // GET /api/career-coach/threads — this candidate's threads, newest-first, for the
        // sidebar list. Lightweight projection (no message bodies) — the full thread is a
        // separate fetch once the candidate actually opens one.
        app.MapGet("/api/career-coach/threads", async (HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("careerCoachThreads");
            var query = new QueryDefinition(
                "SELECT c.id, c.title, c.lastMessageAt, ARRAY_LENGTH(c.messages) AS messageCount FROM c WHERE c.candidateId = @cid")
                .WithParameter("@cid", candidateId);
            var results = new List<ThreadSummary>();
            using var feed = container.GetItemQueryIterator<ThreadSummary>(query, requestOptions: new QueryRequestOptions { PartitionKey = new PartitionKey(candidateId) });
            while (feed.HasMoreResults) results.AddRange(await feed.ReadNextAsync());
            return Results.Ok(results.OrderByDescending(t => t.lastMessageAt));
        }).RequireAuthorization();

        // GET /api/career-coach/threads/{id} — one thread, full message history.
        app.MapGet("/api/career-coach/threads/{id}", async (string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("careerCoachThreads");
            try
            {
                var thread = await container.ReadItemAsync<ThreadDoc>(id, new PartitionKey(candidateId));
                return Results.Ok(thread.Resource);
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }
        }).RequireAuthorization();

        // POST /api/career-coach/threads — starts a new thread with its first message.
        // Title is derived free from the message text (no extra AI call just to name it —
        // same cost-consciousness as everything else on this endpoint).
        app.MapPost("/api/career-coach/threads", async (SendMessageRequest req, HttpContext ctx, CosmosService cosmos, IHttpClientFactory factory, IConfiguration config, ILogger<Program> logger) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(req.Text)) return Results.BadRequest(new { error = "text is required" });

            var capResult = await CheckAndIncrementDailyUsageAsync(candidateId, cosmos);
            if (!capResult.allowed) return CappedResponse(capResult.count);

            var now = DateTimeOffset.UtcNow;
            var userMessage = new ChatMessage("user", req.Text.Trim(), now);

            string reply;
            try { reply = await CallCoachAsync([userMessage], factory, config); }
            catch (Exception ex)
            {
                logger.LogError(ex, "Career Coach: model call failed for a new thread");
                return Results.Problem("The career coach is temporarily unavailable — please try again in a moment.", statusCode: 502);
            }

            var assistantMessage = new ChatMessage("assistant", reply, DateTimeOffset.UtcNow);
            var thread = new ThreadDoc(
                id: Guid.NewGuid().ToString(),
                candidateId: candidateId,
                title: DeriveTitle(req.Text),
                createdAt: now,
                lastMessageAt: assistantMessage.at,
                messages: [userMessage, assistantMessage]);

            var container = cosmos.GetContainer("careerCoachThreads");
            await container.CreateItemAsync(thread, new PartitionKey(candidateId));
            return Results.Ok(thread);
        }).RequireAuthorization();

        // POST /api/career-coach/threads/{id}/messages — sends a message into an existing thread.
        app.MapPost("/api/career-coach/threads/{id}/messages", async (string id, SendMessageRequest req, HttpContext ctx, CosmosService cosmos, IHttpClientFactory factory, IConfiguration config, ILogger<Program> logger) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(req.Text)) return Results.BadRequest(new { error = "text is required" });

            var container = cosmos.GetContainer("careerCoachThreads");
            ThreadDoc thread;
            try
            {
                thread = (await container.ReadItemAsync<ThreadDoc>(id, new PartitionKey(candidateId))).Resource;
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }

            var capResult = await CheckAndIncrementDailyUsageAsync(candidateId, cosmos);
            if (!capResult.allowed) return CappedResponse(capResult.count);

            var userMessage = new ChatMessage("user", req.Text.Trim(), DateTimeOffset.UtcNow);
            var contextMessages = thread.messages
                .Append(userMessage)
                .TakeLast(ContextMessageCount)
                .ToList();

            string reply;
            try { reply = await CallCoachAsync(contextMessages, factory, config); }
            catch (Exception ex)
            {
                logger.LogError(ex, "Career Coach: model call failed for thread {ThreadId}", id);
                return Results.Problem("The career coach is temporarily unavailable — please try again in a moment.", statusCode: 502);
            }

            var assistantMessage = new ChatMessage("assistant", reply, DateTimeOffset.UtcNow);
            var updated = thread with
            {
                messages = [.. thread.messages, userMessage, assistantMessage],
                lastMessageAt = assistantMessage.at,
            };
            await container.UpsertItemAsync(updated, new PartitionKey(candidateId));
            return Results.Ok(updated);
        }).RequireAuthorization();

        // DELETE /api/career-coach/threads/{id}
        app.MapDelete("/api/career-coach/threads/{id}", async (string id, HttpContext ctx, CosmosService cosmos) =>
        {
            var candidateId = ctx.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(candidateId)) return Results.Unauthorized();

            var container = cosmos.GetContainer("careerCoachThreads");
            try
            {
                await container.DeleteItemAsync<ThreadDoc>(id, new PartitionKey(candidateId));
                return Results.Ok();
            }
            catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return Results.NotFound();
            }
        }).RequireAuthorization();
    }

    private static IResult CappedResponse(int count) =>
        Results.Json(new
        {
            capped = true,
            count,
            message = $"You've reached today's message limit ({DailyMessageCap}) — come back tomorrow and we'll pick up right where we left off.",
        }, statusCode: (int)HttpStatusCode.TooManyRequests);

    // Atomic-in-the-common-case increment: patch an existing counter, or create one at 1 if
    // this is the candidate's first message today. The rare race where two concurrent first-
    // messages-of-the-day both try to create is handled by falling back to a patch on Conflict
    // — worst case under extreme concurrency is one message slipping through uncounted, which
    // is an acceptable trade for not needing a stored procedure just for a soft-ish cost cap.
    private static async Task<(bool allowed, int count)> CheckAndIncrementDailyUsageAsync(string candidateId, CosmosService cosmos)
    {
        var container = cosmos.GetContainer("careerCoachUsage");
        var docId = $"{candidateId}:{DateTimeOffset.UtcNow:yyyy-MM-dd}";

        try
        {
            var patched = await container.PatchItemAsync<UsageDoc>(
                docId,
                new PartitionKey(candidateId),
                [PatchOperation.Increment("/count", 1)]);
            var count = patched.Resource.count;
            return (count <= DailyMessageCap, count);
        }
        catch (CosmosException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            try
            {
                await container.CreateItemAsync(new UsageDoc(docId, candidateId, 1), new PartitionKey(candidateId));
                return (true, 1);
            }
            catch (CosmosException createEx) when (createEx.StatusCode == HttpStatusCode.Conflict)
            {
                // Lost the race — someone else's request created it a moment ago. Retry the patch once.
                var patched = await container.PatchItemAsync<UsageDoc>(
                    docId,
                    new PartitionKey(candidateId),
                    [PatchOperation.Increment("/count", 1)]);
                return (patched.Resource.count <= DailyMessageCap, patched.Resource.count);
            }
        }
    }

    private static string DeriveTitle(string firstMessage)
    {
        var trimmed = firstMessage.Trim();
        const int maxLen = 48;
        return trimmed.Length <= maxLen ? trimmed : trimmed[..maxLen].TrimEnd() + "…";
    }

    private static async Task<string> CallCoachAsync(IReadOnlyList<ChatMessage> context, IHttpClientFactory factory, IConfiguration config)
    {
        var apiKey = config["ModelRouter:ApiKey"] ?? throw new InvalidOperationException("ModelRouter:ApiKey not configured");
        var endpoint = config["ModelRouter:Endpoint"] ?? throw new InvalidOperationException("ModelRouter:Endpoint not configured");

        var messages = new List<object> { new { role = "system", content = SystemPrompt } };
        messages.AddRange(context.Select(m => (object)new { role = m.role, content = m.text }));

        var body = JsonSerializer.Serialize(new
        {
            model = "model-router",
            temperature = 0.7,
            max_tokens = 500,
            messages,
        });

        var client = factory.CreateClient();
        using var msg = new HttpRequestMessage(HttpMethod.Post, $"{endpoint.TrimEnd('/')}/openai/v1/chat/completions");
        msg.Headers.Add("api-key", apiKey);
        msg.Content = new StringContent(body, Encoding.UTF8, "application/json");

        using var resp = await client.SendAsync(msg);
        var responseBody = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"Model Router returned {resp.StatusCode}: {responseBody}");

        using var doc = JsonDocument.Parse(responseBody);
        var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
        return content ?? "Sorry, I didn't quite catch that — could you try rephrasing?";
    }
}

public record SendMessageRequest(string Text);

public record ChatMessage(string role, string text, DateTimeOffset at);

public record ThreadDoc(
    string id,
    string candidateId,
    string title,
    DateTimeOffset createdAt,
    DateTimeOffset lastMessageAt,
    List<ChatMessage> messages);

public record ThreadSummary(string id, string title, DateTimeOffset lastMessageAt, int messageCount);

public record UsageDoc(string id, string candidateId, int count);
