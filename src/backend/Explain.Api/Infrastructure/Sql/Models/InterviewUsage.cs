namespace Explain.Api.Infrastructure.Sql.Models;

/// <summary>
/// One row per interview a person STARTED (Francis, 2026-09-21). It is what the daily/monthly limits count, and what makes the
/// one-free-taster rule possible: the taster is a row with Source = "taster" keyed on the person's normalised email (so a new
/// account on the same address, or name+tag@gmail tricks, can't claim a second one).
///
/// Recorded even while enforcement is OFF, so when it is switched on the counts are already right and an admin can see who
/// WOULD have been blocked (WouldBlock) before anyone actually is.
/// </summary>
public class InterviewUsage
{
    public string Id { get; init; } = Guid.NewGuid().ToString();
    public string UserId { get; set; } = string.Empty;
    public string EmailKey { get; set; } = string.Empty;      // EmailNormaliser.Key(email)
    public string Source { get; set; } = "none";              // staff | complimentary | subscription | pass | taster | none
    public string? PassId { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public string UkDay { get; set; } = string.Empty;         // yyyy-MM-dd, UK time — the "3 a day" boundary
    public string UkMonth { get; set; } = string.Empty;       // yyyy-MM, UK time — the "10 a month" boundary
    public bool Enforced { get; set; }                        // was enforcement on when this was recorded
    public bool WouldBlock { get; set; }                      // the rules said no (only ever true while enforcement is off)
    public DateTime? VoidedAt { get; set; }                   // set when a start is refunded (e.g. the interview never began)
}
