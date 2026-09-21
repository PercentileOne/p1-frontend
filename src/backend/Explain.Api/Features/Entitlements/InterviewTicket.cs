using System.Security.Cryptography;
using System.Text;

namespace Explain.Api.Features.Entitlements;

/// <summary>
/// The server-side backstop for the paywall (Francis, 2026-09-21). The browser check at "Start Interview" is a courtesy that can be
/// skipped by anyone who calls the API directly, and the LiveAvatar seat is roughly £0.40 of an interview's ~£0.44 cost. So when an
/// interview is allowed, the server hands back a short-lived signed ticket, and the avatar-session endpoint refuses to mint an
/// avatar session without a valid one once enforcement is on.
///
/// Ticket = "{userId}.{expiryUnixSeconds}.{signature}", HMAC-SHA256 over "userId.expiry" with a key derived from the app's JWT secret
/// (so there is no new secret to manage). Valid for 90 minutes — long enough for a whole interview including LiveAvatar reconnects.
/// It proves "this user was allowed to start an interview recently", nothing more.
/// </summary>
public static class InterviewTicket
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(90);

    public static string Create(string secret, string userId, DateTimeOffset now)
    {
        var expiry = now.Add(Lifetime).ToUnixTimeSeconds();
        var payload = $"{userId}.{expiry}";
        return $"{payload}.{Sign(secret, payload)}";
    }

    public static bool IsValid(string? secret, string? ticket, DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(ticket)) return false;
        var lastDot = ticket.LastIndexOf('.');
        if (lastDot <= 0) return false;
        var payload = ticket[..lastDot];
        var signature = ticket[(lastDot + 1)..];

        var expected = Sign(secret, payload);
        if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(signature))) return false;

        var expDot = payload.LastIndexOf('.');
        return expDot > 0 && long.TryParse(payload[(expDot + 1)..], out var expiry) && expiry > now.ToUnixTimeSeconds();
    }

    private static string Sign(string secret, string payload)
    {
        var key = SHA256.HashData(Encoding.UTF8.GetBytes("interview-ticket:" + secret));
        var mac = HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(payload));
        return Convert.ToBase64String(mac).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
