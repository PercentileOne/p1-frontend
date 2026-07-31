namespace Explain.Api.Features.Auth.Logout;

// POST /auth/logout — clears the session cookie

public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/auth/logout", Handle)
           .WithName("Logout")
           .WithTags("Auth")
           .AllowAnonymous();
    }

    private static IResult Handle(HttpContext ctx)
    {
        ctx.Response.Cookies.Delete("ttl_session");
        return Results.Ok(new { message = "Logged out." });
    }
}
