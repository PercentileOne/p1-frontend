using MediatR;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Email;

namespace Explain.Api.Features.Lessons.Export;

public class ExportLessonHandler(
    IEmailSender emailSender,
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
        var safeTitle = string.Concat(lessonTitle.Split(Path.GetInvalidFileNameChars()));
        var fileName  = $"TalkToLearn - {safeTitle}.pdf";
        var attachment = new EmailAttachment(fileName, "application/pdf", pdfBytes);

        await emailSender.SendAsync(toEmail, $"Your TalkToLearn Lesson: {lessonTitle}", html, attachment: attachment, ct: ct);
    }
}
