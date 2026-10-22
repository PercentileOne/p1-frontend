using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Explain.Api.Features.PrivatePages;

/// <summary>One person's access to the private pages: a label (who it is for, e.g. "mukesh") and their own password.</summary>
public sealed record Access(string Label, string Password);

/// <summary>
/// The rules behind the private pages (Francis, 2026-10-22: the pitch deck, architecture, feed spec, pricing model, patent list and investor figures must not be open to anyone with the link).
/// Pure functions, so every rule is tested without a web server. Passwords live only in an App Service setting, never in the repository; with none set, every page stays locked.
/// Each person gets their own label and password, so one can be removed or changed without touching the others, and a changed or removed password stops that person's earlier unlocks working.
/// </summary>
public static class PrivatePageAccess
{
    public const int MinPasswordLength = 8;
    private static readonly Regex LabelPattern = new("^[A-Za-z0-9_-]{1,32}$", RegexOptions.Compiled);
    private static readonly Regex NamePattern = new("^[a-z0-9-]{1,40}$", RegexOptions.Compiled);

    /// <summary>Page names are lowercase letters, digits and hyphens only, which also rules out any path trick such as "../".</summary>
    public static bool IsValidName(string? name) => name is not null && NamePattern.IsMatch(name);

    /// <summary>
    /// Reads the setting: "label=password" entries separated by commas, for example "francis=a long phrase,mukesh=another phrase". An entry with a bad label or a password shorter than
    /// <see cref="MinPasswordLength"/> characters is ignored, so a weak password can never be active. A password may not contain a comma.
    /// </summary>
    public static IReadOnlyList<Access> ParsePasswords(string? setting)
    {
        var list = new List<Access>();
        if (string.IsNullOrWhiteSpace(setting)) return list;
        foreach (var part in setting.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var eq = part.IndexOf('=');
            if (eq <= 0) continue;
            var label = part[..eq].Trim();
            var password = part[(eq + 1)..];
            if (!LabelPattern.IsMatch(label) || password.Length < MinPasswordLength) continue;
            if (list.Any(a => a.Label.Equals(label, StringComparison.OrdinalIgnoreCase))) continue;
            list.Add(new Access(label, password));
        }
        return list;
    }

    /// <summary>The label whose password this is, or null. Every entry is compared, in constant time, so the answer does not leak which entry came close.</summary>
    public static string? Check(string? password, IReadOnlyList<Access> entries)
    {
        if (string.IsNullOrEmpty(password) || password.Length > 200) return null;
        var given = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        string? match = null;
        foreach (var e in entries)
        {
            var theirs = SHA256.HashData(Encoding.UTF8.GetBytes(e.Password));
            if (CryptographicOperations.FixedTimeEquals(given, theirs) && match is null) match = e.Label;
        }
        return match;
    }

    /// <summary>The signing key for unlock tokens, made from the server's existing secret. With no secret, a random key lasts until the next restart.</summary>
    public static byte[] DeriveKey(string? secret) =>
        string.IsNullOrEmpty(secret) ? RandomNumberGenerator.GetBytes(32) : SHA256.HashData(Encoding.UTF8.GetBytes("private-pages-v1|" + secret));

    private static string Fingerprint(Access entry, byte[] key) =>
        Convert.ToHexString(HMACSHA256.HashData(key, Encoding.UTF8.GetBytes("pw|" + entry.Password)))[..16];

    private static string B64(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[]? FromB64(string s)
    {
        try
        {
            var t = s.Replace('-', '+').Replace('_', '/');
            return Convert.FromBase64String(t.PadRight(t.Length + (4 - t.Length % 4) % 4, '='));
        }
        catch (FormatException) { return null; }
    }

    /// <summary>A signed token: who it is for, when it ends, and a fingerprint of their password at the time (so changing the password ends it).</summary>
    public static string MakeToken(Access entry, byte[] key, DateTimeOffset expires)
    {
        var payload = Encoding.UTF8.GetBytes($"{entry.Label}|{expires.ToUnixTimeSeconds()}|{Fingerprint(entry, key)}");
        return B64(payload) + "." + B64(HMACSHA256.HashData(key, payload));
    }

    /// <summary>The label a token belongs to, or null when it is forged, expired, for someone no longer in the list, or made before their password changed.</summary>
    public static string? VerifyToken(string? token, IReadOnlyList<Access> entries, byte[] key, DateTimeOffset now)
    {
        if (string.IsNullOrEmpty(token) || token.Length > 400) return null;
        var dot = token.IndexOf('.');
        if (dot <= 0 || dot == token.Length - 1) return null;
        var payload = FromB64(token[..dot]);
        var signature = FromB64(token[(dot + 1)..]);
        if (payload is null || signature is null) return null;
        if (!CryptographicOperations.FixedTimeEquals(HMACSHA256.HashData(key, payload), signature)) return null;
        var parts = Encoding.UTF8.GetString(payload).Split('|');
        if (parts.Length != 3 || !long.TryParse(parts[1], out var exp)) return null;
        if (DateTimeOffset.FromUnixTimeSeconds(exp) <= now) return null;
        var entry = entries.FirstOrDefault(a => a.Label.Equals(parts[0], StringComparison.OrdinalIgnoreCase));
        if (entry is null) return null;
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(Fingerprint(entry, key)), Encoding.UTF8.GetBytes(parts[2])) ? entry.Label : null;
    }

    /// <summary>
    /// Makes a stored page safe to show inside the unlock page's frame: root-relative addresses (/favicon.svg, /img/...) become full addresses on the public site, the visit tracker is removed
    /// (the unlock page already records the visit), and links that leave the page open in a new tab instead of inside the frame.
    /// </summary>
    public static string PrepareForEmbedding(string html, string siteOrigin)
    {
        var origin = siteOrigin.TrimEnd('/');
        html = Regex.Replace(html, "<script[^>]*\\bsrc=\"[^\"]*track\\.js[^\"]*\"[^>]*>\\s*</script>", "", RegexOptions.IgnoreCase);
        html = Regex.Replace(html, "(?<a>\\b(?:src|href|poster|action)=)(?<q>[\"'])/(?!/)", m => m.Groups["a"].Value + m.Groups["q"].Value + origin + "/", RegexOptions.IgnoreCase);
        html = Regex.Replace(html, "url\\((?<q>[\"']?)/(?!/)", m => "url(" + m.Groups["q"].Value + origin + "/", RegexOptions.IgnoreCase);
        const string opener = "<script>document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(a){var h=a.getAttribute('href')||'';if(h.charAt(0)!=='#'&&h.indexOf('javascript:')!==0){a.target='_blank';a.rel='noopener noreferrer';}}},true);</script>";
        var close = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        return close >= 0 ? html.Insert(close, opener) : html + opener;
    }
}
