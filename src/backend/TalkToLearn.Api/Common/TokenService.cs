using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace TalkToLearn.Api.Common;

public class TokenService(IConfiguration config)
{
    private readonly string _jwtSecret      = config["Jwt:Secret"]!;
    private readonly string _magicSecret    = config["Jwt:MagicSecret"]!;

    public string CreateMagicLinkToken(string email)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_magicSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims:  [new Claim("email", email)],
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string? VerifyMagicLinkToken(string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_magicSecret));
            var result  = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey         = key,
                ValidateIssuer           = false,
                ValidateAudience         = false,
                ClockSkew                = TimeSpan.Zero,
            }, out _);
            return result.FindFirstValue("email");
        }
        catch { return null; }
    }

    public string CreateSessionToken(string userId, string email, string name, string role)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: [
                new Claim("sub",   userId),
                new Claim("email", email),
                new Claim("name",  name),
                new Claim("role",  role),
            ],
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
