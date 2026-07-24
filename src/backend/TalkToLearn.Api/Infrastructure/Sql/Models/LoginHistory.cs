namespace TalkToLearn.Api.Infrastructure.Sql.Models;

public class LoginHistory
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Method { get; set; } = "password";        // password | magic-link | apple | google
    public bool Success { get; set; }
    public string? FailureReason { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }                  // device / browser info
    public DateTime LoginAt { get; set; } = DateTime.UtcNow;
}
