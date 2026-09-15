using Explain.Api.Infrastructure.Email;

namespace Explain.Api.Features.Lessons.Export;

public static class TestEmailEndpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/lessons/export/test", async (IEmailSender emailSender, ILogger<Program> logger) =>
        {
            const string toEmail = "francis@percentile.one";
            logger.LogInformation("Email test: sending via Azure Communication Services to {To}", toEmail);

            try
            {
                await emailSender.SendAsync(toEmail, "TheInterviewChair.com — Email Test",
                    "If you're reading this, Azure Communication Services Email is working correctly. 🎉");

                logger.LogInformation("Email test succeeded — sent to {To}", toEmail);
                return Results.Ok(new { ok = true, message = $"Test email sent to {toEmail}" });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Email test FAILED");
                return Results.Json(new { ok = false, error = ex.Message, detail = ex.ToString() },
                    statusCode: 500);
            }
        }).AllowAnonymous();
    }
}
