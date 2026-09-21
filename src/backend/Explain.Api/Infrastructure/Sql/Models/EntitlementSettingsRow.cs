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
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string UpdatedBy { get; set; } = "system";
}
