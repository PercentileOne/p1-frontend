namespace TalkToLearn.Api.Features.Auth.VerifyToken;

// Custom IResult that redirects AND sets an HttpOnly session cookie
public class CookieRedirectResult(string location, string cookieName, string cookieValue) : IResult
{
    public Task ExecuteAsync(HttpContext ctx)
    {
        ctx.Response.Cookies.Append(cookieName, cookieValue, new CookieOptions
        {
            HttpOnly = true,
            Secure   = false,   // set true in production (HTTPS)
            SameSite = SameSiteMode.Lax,
            Expires  = DateTimeOffset.UtcNow.AddDays(30),
            Path     = "/",
        });
        ctx.Response.Redirect(location);
        return Task.CompletedTask;
    }
}
