using MediatR;
using Microsoft.Azure.Cosmos;
using Explain.Api.Common;
using Explain.Api.Domain.Profile;
using Explain.Api.Infrastructure.Cosmos;

namespace Explain.Api.Features.Profile.GetPublicProfile;

public record GetPublicProfileQuery(string UserId) : IRequest<Result<PublicProfile>>;

public class GetPublicProfileHandler(
    CosmosService cosmos,
    ILogger<GetPublicProfileHandler> logger)
    : IRequestHandler<GetPublicProfileQuery, Result<PublicProfile>>
{
    public async Task<Result<PublicProfile>> Handle(GetPublicProfileQuery query, CancellationToken ct)
    {
        var container = cosmos.GetContainer("profiles");

        try
        {
            var response = await container.ReadItemAsync<UserProfile>(
                query.UserId, new PartitionKey(query.UserId), cancellationToken: ct);

            return Result<PublicProfile>.Success(PublicProfile.From(response.Resource));
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return Result<PublicProfile>.Failure("Profile not found.", 404);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch public profile for {UserId}", query.UserId);
            return Result<PublicProfile>.Failure("Could not load profile.", 500);
        }
    }
}
