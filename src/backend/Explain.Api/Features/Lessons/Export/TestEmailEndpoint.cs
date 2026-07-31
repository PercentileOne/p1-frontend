using System.Net;
using System.Net.Mail;

namespace Explain.Api.Features.Lessons.Export;

public static class TestEmailEndpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/lessons/export/test", async (IConfiguration config, ILogger<Program> logger) =>
        {
            var smtpHost  = config["Email:SmtpHost"]  ?? "smtp.sendgrid.net";
            var smtpPort  = int.Parse(config["Email:SmtpPort"] ?? "587");
            var smtpUser  = config["Email:SmtpUser"]  ?? "apikey";
            var smtpPass  = config["Email:SmtpPass"]  ?? "";
            var fromEmail = config["Email:FromEmail"] ?? "lessons@talktolearn.app";
            var fromName  = config["Email:FromName"]  ?? "TalkToLearn";
            const string toEmail = "francis@percentile.one";

            logger.LogInformation("Email test: connecting to {Host}:{Port} as {User}, from {From}",
                smtpHost, smtpPort, smtpUser, fromEmail);

            try
            {
                using var client = new SmtpClient(smtpHost, smtpPort)
                {
                    Credentials = new NetworkCredential(smtpUser, smtpPass),
                    EnableSsl   = true,
                };

                using var message = new MailMessage
                {
                    From       = new MailAddress(fromEmail, fromName),
                    Subject    = "TalkToLearn — SMTP Test",
                    Body       = "If you're reading this, SendGrid SMTP is working correctly. 🎉",
                    IsBodyHtml = false,
                };
                message.To.Add(new MailAddress(toEmail));

                await client.SendMailAsync(message);

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
