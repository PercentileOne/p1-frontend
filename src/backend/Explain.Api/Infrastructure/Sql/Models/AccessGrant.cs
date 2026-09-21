namespace Explain.Api.Infrastructure.Sql.Models;

/// <summary>
/// Free access that isn't paid for (Francis, 2026-09-21): STAFF, the one-off COMPLIMENTARY grant given to every account that
/// existed before the paywall, and individual COMPS (a friend, a demo, a journalist). One table so "who gets in free, and why"
/// is answered in one place, with an audit trail and the ability to switch a whole kind off later.
///
/// Grants follow the person's normalised email, not just a user id, so a grant made for someone who hasn't registered yet still
/// works the moment they do.
/// </summary>
public class AccessGrant
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;          // lower-case, trimmed
    public string? UserId { get; set; }                        // set when the account is known
    public string Kind { get; set; } = "comp";                 // staff | complimentary | comp
    public string Reason { get; set; } = string.Empty;
    public string GrantedBy { get; set; } = string.Empty;      // admin email, or "system"
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }                   // null = no expiry
    public DateTime? RevokedAt { get; set; }                   // null = still active
}
