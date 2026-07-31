using System.IdentityModel.Tokens.Jwt;
using System.Text;
using MediatR;
using Microsoft.IdentityModel.Tokens;
using Explain.Api.Common;

namespace Explain.Api.Features.Auth.GetSession;

public class GetSessionQueryHandler(
    IConfiguration config,
    ILogger<GetSessionQueryHandler> logger)
    : IRequestHandler<GetSessionQuery, Result<SessionDto>>
{
    public Task<Result<SessionDto>> Handle(GetSessionQuery query, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(query.Token))
            return Task.FromResult(Result<SessionDto>.Failure("No token provided.", 401));

        try
        {
            var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
            var handler = new JwtSecurityTokenHandler();
            handler.InboundClaimTypeMap.Clear(); // preserve original claim names (e.g. "email" not URI)
            var result  = handler.ValidateToken(query.Token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey         = key,
                ValidateIssuer           = false,
                ValidateAudience         = false,
            }, out _);

            var name        = result.FindFirst("name")?.Value ?? "";
            var firstName   = name.Contains(' ') ? name.Split(' ')[0] : name;
            var permissions = result.FindAll("perm").Select(c => c.Value).ToList();
            var session     = new SessionDto(
                result.FindFirst("sub")?.Value   ?? "",
                result.FindFirst("email")?.Value ?? "",
                name,
                firstName,
                result.FindFirst("role")?.Value  ?? "",
                permissions);

            logger.LogInformation("Session valid for {Email}", session.Email);
            return Task.FromResult(Result<SessionDto>.Success(session));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Invalid session token");
            return Task.FromResult(Result<SessionDto>.Failure("Invalid or expired token.", 401));
        }
    }
}
