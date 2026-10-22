namespace Explain.Api.Infrastructure.Sql.Models;

/// <summary>
/// The single row of paywall settings (Id is always 1): the enforcement switch, the daily and monthly interview limits and the
/// free-taster switch. Edited from the admin Access page. Moved from a Cosmos platformSettings document to SQL on 2026-09-21.
/// </summary>
public class EntitlementSettingsRow
{
    public int Id { get; set; } = 1;
    public bool Enforce { get; set; }
    public int DailyCap { get; set; } = 3;
    public int MonthlyCap { get; set; } = 10;
    public bool TasterEnabled { get; set; } = true;
    // Free period (Francis, 2026-10-22): every new account is free for this many months from sign-up (0 = no free period), with a
    // lower monthly cap while it lasts. Recruiters get the same months and a cap on prep links a month.
    public int FreePeriodMonths { get; set; } = 3;
    public int FreePeriodMonthlyCap { get; set; } = 3;
    public int RecruiterPrepCap { get; set; } = 10;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string UpdatedBy { get; set; } = "system";
}
