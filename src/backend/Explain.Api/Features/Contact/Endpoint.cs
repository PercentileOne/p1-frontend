using Explain.Api.Infrastructure.Email;

namespace Explain.Api.Features.Contact;

public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/contact", Handle)
           .WithName("ContactForm")
           .WithTags("Contact")
           .AllowAnonymous();
    }

    private static async Task<IResult> Handle(Request req, IEmailSender emailSender, ILogger<Program> logger)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            return Results.BadRequest(new { error = "Name and a valid email are required." });

        try
        {
            var subject = $"TheInterviewChair.com Contact: {req.Type ?? "Enquiry"} — {req.Name}";
            var body = $"""
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
                  <h2 style="color:#34d399;">New contact form submission</h2>
                  <table style="width:100%;border-collapse:collapse;">
                    <tr><td style="padding:8px 0;color:#666;width:120px;">Name</td><td style="padding:8px 0;font-weight:bold;">{req.Name}</td></tr>
                    <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:{req.Email}">{req.Email}</a></td></tr>
                    <tr><td style="padding:8px 0;color:#666;">Type</td><td style="padding:8px 0;">{req.Type ?? "Not specified"}</td></tr>
                    <tr><td style="padding:8px 0;color:#666;vertical-align:top;">Message</td><td style="padding:8px 0;">{req.Message ?? "No message provided."}</td></tr>
                  </table>
                  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
                  <p style="color:#999;font-size:12px;">Sent from www.theinterviewchair.com/contact</p>
                </div>
                """;

            await emailSender.SendAsync("francis@percentile.one", subject, body, replyToEmail: req.Email);

            logger.LogInformation("Contact form submitted by {Name} <{Email}> ({Type})", req.Name, req.Email, req.Type);
            return Results.Ok(new { message = "Message sent." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send contact form from {Email}", req.Email);
            return Results.Problem("Failed to send message. Please try again.", statusCode: 500);
        }
    }

    private record Request(string Name, string Email, string? Type, string? Message);
}
