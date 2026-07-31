using System.Net;
using System.Net.Mail;
using MediatR;
using Explain.Api.Common;

namespace Explain.Api.Features.Lessons.Export;

public class ExportLessonHandler(
    IConfiguration config,
    ILogger<ExportLessonHandler> logger)
    : IRequestHandler<ExportLessonCommand, Result<ExportResultDto>>
{
    public async Task<Result<ExportResultDto>> Handle(ExportLessonCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.RecipientEmail))
            return Result<ExportResultDto>.Failure("Recipient email is required.");

        logger.LogInformation("Exporting lesson '{Subject}' to {Email}",
            cmd.Lesson.Title, cmd.RecipientEmail);

        try
        {
            var html       = LessonHtmlBuilder.Build(cmd.Lesson, cmd.RecipientName);
            var pdfBytes   = LessonPdfBuilder.Build(cmd.Lesson, cmd.RecipientName);
            await SendEmailAsync(cmd.RecipientEmail, cmd.RecipientName, cmd.Lesson.Title, html, pdfBytes, ct);

            logger.LogInformation("Lesson '{Subject}' sent successfully to {Email}",
                cmd.Lesson.Title, cmd.RecipientEmail);

            return Result<ExportResultDto>.Success(
                new ExportResultDto($"Your lesson has been sent to {cmd.RecipientEmail}"));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to export lesson '{Subject}' to {Email}",
                cmd.Lesson.Title, cmd.RecipientEmail);
            return Result<ExportResultDto>.Failure("Failed to send lesson. Please try again.", 500);
        }
    }

    private async Task SendEmailAsync(
        string toEmail, string toName, string lessonTitle, string html, byte[] pdfBytes, CancellationToken ct)
    {
        var smtpHost  = config["Email:SmtpHost"]  ?? throw new InvalidOperationException("Email:SmtpHost not configured");
        var smtpPort  = int.Parse(config["Email:SmtpPort"] ?? "587");
        var smtpUser  = config["Email:SmtpUser"]  ?? throw new InvalidOperationException("Email:SmtpUser not configured");
        var smtpPass  = config["Email:SmtpPass"]  ?? throw new InvalidOperationException("Email:SmtpPass not configured");
        var fromEmail = config["Email:FromEmail"] ?? "lessons@talktolearn.app";
        var fromName  = config["Email:FromName"]  ?? "TalkToLearn";

        using var client = new SmtpClient(smtpHost, smtpPort)
        {
            Credentials = new NetworkCredential(smtpUser, smtpPass),
            EnableSsl   = true,
        };

        var safeTitle = string.Concat(lessonTitle.Split(Path.GetInvalidFileNameChars()));
        var fileName  = $"TalkToLearn - {safeTitle}.pdf";

        using var message = new MailMessage
        {
            From       = new MailAddress(fromEmail, fromName),
            Subject    = $"Your TalkToLearn Lesson: {lessonTitle}",
            Body       = html,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(toEmail, toName));

        var pdfStream  = new MemoryStream(pdfBytes);
        var attachment = new Attachment(pdfStream, fileName, "application/pdf");
        message.Attachments.Add(attachment);

        await client.SendMailAsync(message, ct);
    }
}
