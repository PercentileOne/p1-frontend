using System.Security.Cryptography;
using Microsoft.Azure.Cosmos;
using Explain.Api.Infrastructure.Anthropic;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.LearnAlerts;

/// <summary>
/// The "whose turn is it to get a question" half of Learn Alerts. Runs inside Explain.Api itself
/// via PeriodicTimer rather than as a separate Azure Function — this App Service is already
/// always-on, so an in-process hosted service does the same job with no new Azure resource to
/// deploy or pay for. See src/agents/P1.CareersAgent/Functions/WeeklySalaryUpdateFunction.cs for
/// the same "find due items, process each with its own try/catch" shape this mirrors.
/// </summary>
public class LearnAlertsSendService(
    CosmosService cosmos,
    AnthropicService anthropic,
    IConfiguration config,
    ILogger<LearnAlertsSendService> logger) : BackgroundService
{
    private static readonly TimeSpan TickInterval = TimeSpan.FromMinutes(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Small delay on startup so this doesn't race Cosmos container creation during app boot.
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        using var timer = new PeriodicTimer(TickInterval);
        do
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Learn Alerts send tick failed");
            }
        } while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        // "o"-formatted UTC string, matching how LearnAlert.nextSendAt/createdAt are stored —
        // see Endpoint.cs's own comment on why these are strings, not raw DateTimeOffset.
        var nowIso = now.ToString("o");
        var alertsContainer = cosmos.GetContainer("learnAlerts");

        // Cross-partition — this is the one query in the feature that genuinely needs to scan
        // every candidate, same trade-off Features/Alerts/Endpoint.cs's MatchIncomingCandidateAsync
        // already makes for the same reason (small dataset at this stage).
        var query = new QueryDefinition("SELECT * FROM c WHERE c.status = 'active' AND c.nextSendAt <= @now")
            .WithParameter("@now", nowIso);
        var due = new List<LearnAlert>();
        using (var feed = alertsContainer.GetItemQueryIterator<LearnAlert>(query))
            while (feed.HasMoreResults)
                due.AddRange(await feed.ReadNextAsync(ct));

        if (due.Count == 0) return;
        logger.LogInformation("Learn Alerts: {Count} due", due.Count);

        var questionsContainer = cosmos.GetContainer("learnAlertQuestions");

        foreach (var alert in due)
        {
            try
            {
                var createdAt = DateTimeOffset.Parse(alert.createdAt);
                if (now >= createdAt.AddMonths(alert.durationMonths))
                {
                    await alertsContainer.UpsertItemAsync(alert with { status = "completed" }, new PartitionKey(alert.candidateId), cancellationToken: ct);
                    continue;
                }

                var generated = await Endpoint.GenerateQuestionAsync(anthropic, alert.jobTitle, alert.difficulty, alert.specialFocus, logger);
                if (generated is null)
                {
                    // One bad AI call shouldn't strand a candidate on a multi-times-a-day cadence
                    // waiting a full interval — retry in an hour rather than pushing nextSendAt
                    // out by the alert's own (possibly much longer) interval.
                    await alertsContainer.UpsertItemAsync(alert with { nextSendAt = now.AddHours(1).ToString("o") }, new PartitionKey(alert.candidateId), cancellationToken: ct);
                    continue;
                }

                var question = new LearnAlertQuestion(
                    id: Guid.NewGuid().ToString(),
                    candidateId: alert.candidateId,
                    alertId: alert.id,
                    jobTitle: alert.jobTitle,
                    questionText: generated.Value.Question,
                    options: generated.Value.Options,
                    correctIndex: generated.Value.CorrectIndex,
                    answerToken: GenerateToken(),
                    sentAt: nowIso,
                    answeredAt: null,
                    selectedIndex: null,
                    isCorrect: null);
                await questionsContainer.UpsertItemAsync(question, new PartitionKey(question.candidateId), cancellationToken: ct);

                await Endpoint.SendQuestionEmailAsync(alert, question, config, logger);

                var updatedAlert = alert with { sentCount = alert.sentCount + 1, nextSendAt = now.AddHours(alert.intervalHours).ToString("o") };
                await alertsContainer.UpsertItemAsync(updatedAlert, new PartitionKey(updatedAlert.candidateId), cancellationToken: ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to send Learn Alert question for alert {AlertId}", alert.id);
            }
        }
    }

    private static string GenerateToken()
    {
        const string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var bytes = RandomNumberGenerator.GetBytes(24);
        return new string(bytes.Select(b => chars[b % chars.Length]).ToArray());
    }
}
