namespace Explain.Api.Features.NameGreetings;

public enum NameGreetingOutcome
{
    Hit,
    MissSwitchOff,
    MissClaim,
    MissAlreadyPending,
}

/// <summary>
/// Pure decision logic for a name-greeting lookup — no I/O, directly unit-testable. The kill
/// switch is a hard global override: when off, EVERYONE gets the generic path, even for a
/// name that's already generated and cached — Francis's explicit ask ("everyone goes back to
/// generic mode until I switch it back on"), not just "stop generating new ones."
/// </summary>
public static class NameGreetingDecider
{
    private static readonly TimeSpan PendingStaleAfter = TimeSpan.FromMinutes(3);

    public static NameGreetingOutcome Decide(NameGreeting? existing, bool autoGenerateEnabled, DateTimeOffset now)
    {
        if (!autoGenerateEnabled) return NameGreetingOutcome.MissSwitchOff;
        if (existing is null) return NameGreetingOutcome.MissClaim;

        var status = string.IsNullOrEmpty(existing.status) ? "ready" : existing.status;
        return status switch
        {
            "ready" => NameGreetingOutcome.Hit,
            "pending" => existing.startedAt is not null && now - existing.startedAt.Value < PendingStaleAfter
                ? NameGreetingOutcome.MissAlreadyPending
                : NameGreetingOutcome.MissClaim,
            "failed" => NameGreetingOutcome.MissClaim,
            _ => NameGreetingOutcome.Hit,
        };
    }
}
