using MediatR;
using Microsoft.Azure.Cosmos;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Domain.Profile;
using TalkToLearn.Api.Infrastructure.Cosmos;

namespace TalkToLearn.Api.Features.Profile.GetProfile;

public record GetProfileQuery(string UserId) : IRequest<Result<UserProfile>>;

public class GetProfileHandler(
    CosmosService cosmos,
    ILogger<GetProfileHandler> logger)
    : IRequestHandler<GetProfileQuery, Result<UserProfile>>
{
    public async Task<Result<UserProfile>> Handle(GetProfileQuery query, CancellationToken ct)
    {
        var container = cosmos.GetContainer("profiles");

        try
        {
            // Point read — O(1), cheapest possible Cosmos operation
            var response = await container.ReadItemAsync<UserProfile>(
                query.UserId, new PartitionKey(query.UserId), cancellationToken: ct);

            return Result<UserProfile>.Success(response.Resource);
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Profile doesn't exist yet — return empty shell so mobile app can render gracefully
            logger.LogWarning("Profile not found for userId {UserId} — returning empty profile", query.UserId);
            var empty = new UserProfile { UserId = query.UserId };
            return Result<UserProfile>.Success(empty);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch profile for {UserId}", query.UserId);
            return Result<UserProfile>.Failure("Could not load profile.", 500);
        }
    }
}
