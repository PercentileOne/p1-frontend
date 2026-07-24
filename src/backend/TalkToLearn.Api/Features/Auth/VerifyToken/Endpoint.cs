using Microsoft.Azure.Cosmos;
using TalkToLearn.Api.Common;
using TalkToLearn.Api.Infrastructure.Cosmos;
using AppUser = TalkToLearn.Api.Domain.Auth.User;

namespace TalkToLearn.Api.Features.Auth.VerifyToken;

// GET /auth/verify?token=xxx
// Validates magic link token, creates user if new, sets session cookie,
// redirects to /onboarding (new) or /dashboard (returning).

public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/auth/verify", Handle)
           .WithName("VerifyToken")
           .WithTags("Auth")
           .AllowAnonymous();
    }

    private static async Task<IResult> Handle(
        string? token,
        TokenService tokens,
        CosmosService cosmos,
        IConfiguration config)
    {
        var appUrl = config["AppUrl"] ?? "http://localhost:5173";

        if (string.IsNullOrWhiteSpace(token))
            return Results.Redirect($"{appUrl}/login?error=missing_token");

        var email = tokens.VerifyMagicLinkToken(token);
        if (email is null)
            return Results.Redirect($"{appUrl}/login?error=invalid_token");

        var container = cosmos.GetContainer("users");
        var query     = new QueryDefinition("SELECT * FROM c WHERE c.email = @email AND c.pk = 'user'")
                            .WithParameter("@email", email);

        AppUser? user = null;
        var feed = container.GetItemQueryIterator<AppUser>(query);
        while (feed.HasMoreResults)
        {
            var page = await feed.ReadNextAsync();
            user = page.FirstOrDefault();
            if (user is not null) break;
        }

        var isNew = user is null;
        if (isNew)
        {
            user = AppUser.Create(email);
            await container.UpsertItemAsync(user, new PartitionKey("user"));
        }

        var sessionToken = tokens.CreateSessionToken(user!.Id, user.Email, user.Name, user.Role);
        var redirectTo   = isNew ? $"{appUrl}/onboarding" : $"{appUrl}/dashboard";

        return new CookieRedirectResult(redirectTo, "ttl_session", sessionToken);
    }
}
