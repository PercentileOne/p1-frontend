namespace Explain.Api.Infrastructure.Sql.Models;

public class User
{
    public string Id           { get; init; }  = Guid.NewGuid().ToString();
    public string Email        { get; set; }   = string.Empty;
    public string PasswordHash { get; set; }   = string.Empty;
    public string FirstName    { get; set; }   = string.Empty;
    public string LastName     { get; set; }   = string.Empty;
    public string Role         { get; set; }   = "user";          // user | admin
    public DateTime CreatedAt  { get; init; }  = DateTime.UtcNow;
    public DateTime UpdatedAt  { get; set; }   = DateTime.UtcNow;

    // Admin-initiated lockout (Francis, 2026-09-16 — a suspicious account spotted live in the
    // Activity Log) — distinct from LoginCommandHandler's existing time-window brute-force
    // lockout (LoginHistory-derived, auto-expires after 15 minutes). This one is permanent until
    // an admin explicitly unlocks it. LockedReason is admin-only context, never shown to the
    // locked-out user themselves.
    public bool IsLocked       { get; set; }   = false;
    public DateTime? LockedAt  { get; set; }
    public string? LockedReason { get; set; }

    // Email verification (Francis, 2026-09-16 — same conversation: stop anyone getting a working
    // account from a fake/throwaway address). Every EXISTING user before this shipped is
    // backfilled to true (see the migration) so nobody already using the product gets locked out
    // by a feature that didn't exist when they registered.
    public bool EmailVerified  { get; set; }   = false;
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationSentAt { get; set; }

    // Navigation
    public List<Follow> Following { get; set; } = [];   // people this user follows
    public List<Follow> Followers { get; set; } = [];   // people who follow this user
}
