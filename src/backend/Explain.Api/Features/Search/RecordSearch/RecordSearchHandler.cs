using MediatR;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Domain.Search;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Search.RecordSearch;

public class RecordSearchHandler(
    CosmosService cosmos,
    ILogger<RecordSearchHandler> logger)
    : IRequestHandler<RecordSearchCommand, Result<bool>>
{
    public async Task<Result<bool>> Handle(RecordSearchCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.UserId) || string.IsNullOrWhiteSpace(cmd.Subject))
            return Result<bool>.Failure("UserId and Subject are required.", 400);

        var ev = new SearchEvent
        {
            UserId   = cmd.UserId,
            Subject  = cmd.Subject.Trim(),
            Category = cmd.Category,
        };

        try
        {
            var container = cosmos.GetContainer("searches");
            await container.UpsertItemAsync(ev, new PartitionKey("search"), cancellationToken: ct);
            logger.LogInformation("Search recorded: {Subject} by {UserId}", ev.Subject, ev.UserId);
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to record search for {UserId}", cmd.UserId);
            return Result<bool>.Failure("Failed to record search.", 500);
        }
    }
}
