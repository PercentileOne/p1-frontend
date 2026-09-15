using Azure;
using Azure.Communication.Email;

namespace Explain.Api.Infrastructure.Email;

/// <summary>
/// Single shared email sender for the whole backend — replaces 11 separate inline
/// <c>SmtpClient</c> blocks (one per feature) that each built their own SendGrid connection.
/// Migrated to Azure Communication Services 2026-09-15: SendGrid's own account had gone down
/// platform-wide (their status page listed "Sendgrid Mail Sending" as degraded) for long enough,
/// early enough in this product's life, that Francis wanted off it entirely in favour of staying
/// on Microsoft's own stack. Every call site now goes through here instead of constructing its
/// own transport, so the next provider change (if any) is a one-file edit, not eleven.
/// </summary>
// Provider-agnostic on purpose — call sites build this, not Azure's own EmailAttachment type,
// so a future provider swap only touches AcsEmailSender's internals, not every call site again.
public record EmailAttachment(string FileName, string ContentType, byte[] Content);

public interface IEmailSender
{
    Task SendAsync(
        string toEmail, string subject, string htmlBody,
        string? replyToEmail = null, EmailAttachment? attachment = null, CancellationToken ct = default);
}

public class AcsEmailSender : IEmailSender
{
    private readonly EmailClient? _client;
    private readonly string? _fromEmail;
    private readonly ILogger<AcsEmailSender> _logger;

    public AcsEmailSender(IConfiguration config, ILogger<AcsEmailSender> logger)
    {
        _logger = logger;
        // Unlike SendGrid's SmtpClient (MailAddress(email, displayName) per send), ACS Email has
        // no per-message display-name parameter — the friendly "From" name recipients see is
        // configured once on the domain's sender username in the Azure portal/CLI, not passed
        // here. Nothing to do in code for it; see the "Sender Usernames" section of the linked
        // domain resource if the display name ever needs changing.
        _fromEmail = config["Acs:FromEmail"];
        var connectionString = config["Acs:ConnectionString"];
        // Both must be present to actually send — left unset (local dev, or before this is
        // configured in a given environment), every call below logs and no-ops rather than
        // throwing, same best-effort convention every one of these email call sites already used
        // with SmtpClient.
        _client = string.IsNullOrEmpty(connectionString) ? null : new EmailClient(connectionString);
    }

    public async Task SendAsync(
        string toEmail, string subject, string htmlBody,
        string? replyToEmail = null, EmailAttachment? attachment = null, CancellationToken ct = default)
    {
        if (_client is null || string.IsNullOrEmpty(_fromEmail))
        {
            _logger.LogWarning("Email not sent to {ToEmail} — Acs:ConnectionString/Acs:FromEmail not configured.", toEmail);
            return;
        }

        var message = new EmailMessage(
            senderAddress: _fromEmail,
            recipients: new EmailRecipients([new EmailAddress(toEmail)]),
            content: new EmailContent(subject) { Html = htmlBody });
        if (!string.IsNullOrEmpty(replyToEmail))
            message.ReplyTo.Add(new EmailAddress(replyToEmail));
        if (attachment is not null)
        {
            message.Attachments.Add(new Azure.Communication.Email.EmailAttachment(
                attachment.FileName, attachment.ContentType, BinaryData.FromBytes(attachment.Content)));
        }

        try
        {
            await _client.SendAsync(WaitUntil.Started, message, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {ToEmail} via Azure Communication Services", toEmail);
        }
    }
}
