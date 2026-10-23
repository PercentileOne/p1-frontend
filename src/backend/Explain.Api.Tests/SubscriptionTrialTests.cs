using Explain.Api.Features.Subscriptions;

namespace Explain.Api.Tests;

// Subscribing during the free months must not charge for time that was free (Francis, 2026-10-23): the first payment is on the day the free months end.
public class SubscriptionTrialTests
{
    private static readonly DateTime Now = new(2026, 11, 1, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void A_subscriber_inside_the_free_months_is_first_charged_when_they_end()
    {
        var end = Now.AddDays(40);
        Assert.Equal(end, CandidateSubscriptionService.TrialEndFor(end, Now));
    }

    [Fact]
    public void No_free_months_left_means_charge_at_once()
    {
        Assert.Null(CandidateSubscriptionService.TrialEndFor(null, Now));
        Assert.Null(CandidateSubscriptionService.TrialEndFor(Now.AddDays(-3), Now));
    }

    [Fact]
    public void Less_than_two_days_left_is_charged_at_once_because_the_checkout_cannot_start_a_shorter_trial()
    {
        Assert.Null(CandidateSubscriptionService.TrialEndFor(Now.AddHours(30), Now));
        Assert.NotNull(CandidateSubscriptionService.TrialEndFor(Now.AddHours(60), Now));
    }

    [Fact]
    public void The_price_is_3_99()
    {
        Assert.Equal(3.99m, CandidateSubscriptionService.PriceGbp);
    }
}
