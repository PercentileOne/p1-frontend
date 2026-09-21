using Explain.Api.Features.Entitlements;

namespace Explain.Api.Tests;

// Francis, 2026-09-21: subscribers get 3 interviews a day and 10 a month, everyone else gets ONE free taster per email, staff and
// complimentary accounts are free, passes count down their own sessions. These tests pin every branch of that.
public class EntitlementRulesTests
{
    private static readonly EntitlementSettings S = new(Enforce: true, DailyCap: 3, MonthlyCap: 10, TasterEnabled: true);

    private static EntitlementFacts Facts(
        bool staff = false, bool comp = false, bool sub = false, int pass = 0, int daily = 0, int monthly = 0,
        bool tasterUsed = false, bool verified = true, bool disposable = false)
        => new(staff, comp, sub, pass, daily, monthly, tasterUsed, verified, disposable);

    [Fact]
    public void Staff_are_always_let_in_even_far_past_every_limit()
    {
        var d = EntitlementRules.Decide(Facts(staff: true, daily: 50, monthly: 500), S);
        Assert.True(d.Allowed);
        Assert.Equal("staff", d.Source);
    }

    [Fact]
    public void Subscriber_within_limits_is_let_in()
    {
        var d = EntitlementRules.Decide(Facts(sub: true, daily: 2, monthly: 9), S);
        Assert.True(d.Allowed);
        Assert.Equal("subscription", d.Source);
    }

    [Fact]
    public void Subscriber_is_stopped_at_the_daily_limit()
    {
        var d = EntitlementRules.Decide(Facts(sub: true, daily: 3, monthly: 3), S);
        Assert.False(d.Allowed);
        Assert.Equal("daily-cap", d.Code);
    }

    [Fact]
    public void Subscriber_is_stopped_at_the_monthly_limit_even_with_a_fresh_day()
    {
        var d = EntitlementRules.Decide(Facts(sub: true, daily: 0, monthly: 10), S);
        Assert.False(d.Allowed);
        Assert.Equal("monthly-cap", d.Code);
    }

    [Fact]
    public void Subscriber_at_a_limit_can_still_use_a_pass()
    {
        var d = EntitlementRules.Decide(Facts(sub: true, daily: 3, pass: 2), S);
        Assert.True(d.Allowed);
        Assert.Equal("pass", d.Source);
    }

    [Fact]
    public void Subscriber_at_a_limit_does_not_burn_the_free_taster()
    {
        var d = EntitlementRules.Decide(Facts(sub: true, daily: 3, tasterUsed: false), S);
        Assert.False(d.Allowed);
        Assert.NotEqual("taster", d.Source);
    }

    [Fact]
    public void Complimentary_account_is_free_but_still_has_the_daily_limit()
    {
        Assert.True(EntitlementRules.Decide(Facts(comp: true, daily: 2), S).Allowed);
        var blocked = EntitlementRules.Decide(Facts(comp: true, daily: 3), S);
        Assert.False(blocked.Allowed);
        Assert.Equal("daily-cap", blocked.Code);
    }

    [Fact]
    public void Complimentary_account_has_no_monthly_limit()
    {
        Assert.True(EntitlementRules.Decide(Facts(comp: true, daily: 0, monthly: 40), S).Allowed);
    }

    [Fact]
    public void Complimentary_account_at_the_daily_limit_does_not_burn_the_taster()
    {
        var d = EntitlementRules.Decide(Facts(comp: true, daily: 3), S);
        Assert.False(d.Allowed);
        Assert.NotEqual("taster", d.Source);
    }

    [Fact]
    public void Pass_with_sessions_left_lets_you_in_and_ignores_the_daily_limit()
    {
        var d = EntitlementRules.Decide(Facts(pass: 3, daily: 9), S);
        Assert.True(d.Allowed);
        Assert.Equal("pass", d.Source);
    }

    [Fact]
    public void Newcomer_gets_exactly_one_free_taster()
    {
        var first = EntitlementRules.Decide(Facts(), S);
        Assert.True(first.Allowed);
        Assert.Equal("taster", first.Source);

        var second = EntitlementRules.Decide(Facts(tasterUsed: true), S);
        Assert.False(second.Allowed);
        Assert.Equal("taster-used", second.Code);
    }

    [Fact]
    public void Taster_needs_a_verified_email()
    {
        var d = EntitlementRules.Decide(Facts(verified: false), S);
        Assert.False(d.Allowed);
        Assert.Equal("verify-email", d.Code);
    }

    [Fact]
    public void Taster_refuses_disposable_email_addresses()
    {
        var d = EntitlementRules.Decide(Facts(disposable: true), S);
        Assert.False(d.Allowed);
        Assert.Equal("email-not-eligible", d.Code);
    }

    [Fact]
    public void Taster_can_be_switched_off()
    {
        var d = EntitlementRules.Decide(Facts(), S with { TasterEnabled = false });
        Assert.False(d.Allowed);
        Assert.Equal("no-access", d.Code);
    }

    [Fact]
    public void Someone_with_nothing_is_told_how_to_get_access()
    {
        var d = EntitlementRules.Decide(Facts(tasterUsed: true), S);
        Assert.False(d.Allowed);
        Assert.Contains("£4.99", d.Message);
    }

    [Fact]
    public void Caps_come_from_the_settings_not_hard_coded()
    {
        var s = S with { DailyCap = 1, MonthlyCap = 2 };
        Assert.False(EntitlementRules.Decide(Facts(sub: true, daily: 1), s).Allowed);
        Assert.False(EntitlementRules.Decide(Facts(sub: true, monthly: 2), s).Allowed);
        Assert.True(EntitlementRules.Decide(Facts(sub: true, daily: 0, monthly: 1), s).Allowed);
    }
}

public class EmailNormaliserTests
{
    [Theory]
    [InlineData("Francis@Percentile.One", "francis@percentile.one")]
    [InlineData("  a@b.com ", "a@b.com")]
    [InlineData("name+taster1@gmail.com", "name@gmail.com")]
    [InlineData("n.a.m.e@gmail.com", "name@gmail.com")]
    [InlineData("n.a.m.e+x@googlemail.com", "name@gmail.com")]
    [InlineData("name+tag@outlook.com", "name@outlook.com")]
    [InlineData("first.last@company.co.uk", "first.last@company.co.uk")]
    public void Same_mailbox_written_different_ways_gets_one_key(string input, string expected)
        => Assert.Equal(expected, EmailNormaliser.Key(input));

    [Fact]
    public void Dots_only_matter_to_gmail()
        => Assert.NotEqual(EmailNormaliser.Key("a.b@company.com"), EmailNormaliser.Key("ab@company.com"));

    [Theory]
    [InlineData("x@mailinator.com", true)]
    [InlineData("x@YOPMAIL.com", true)]
    [InlineData("x@gmail.com", false)]
    [InlineData("francis@percentile.one", false)]
    public void Disposable_domains_are_recognised(string email, bool expected)
        => Assert.Equal(expected, EmailNormaliser.IsDisposable(email));
}

public class SubscriptionStatusTests
{
    [Theory]
    [InlineData("active", "active")]
    [InlineData("trialing", "active")]
    [InlineData("past_due", "past_due")]     // Stripe is retrying the card — access continues meanwhile
    [InlineData("unpaid", "cancelled")]
    [InlineData("canceled", "cancelled")]
    [InlineData("incomplete", "incomplete")]
    [InlineData("incomplete_expired", "incomplete")]
    [InlineData(null, "incomplete")]
    public void Stripe_status_maps_to_ours(string? stripe, string ours)
        => Assert.Equal(ours, Explain.Api.Features.Subscriptions.CandidateSubscriptionService.MapStatus(stripe));
}

public class InterviewTicketTests
{
    private const string Secret = "unit-test-secret";
    private static readonly DateTimeOffset Now = new(2026, 9, 21, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void A_fresh_ticket_is_valid()
        => Assert.True(InterviewTicket.IsValid(Secret, InterviewTicket.Create(Secret, "user-1", Now), Now.AddMinutes(5)));

    [Fact]
    public void A_ticket_lasts_the_whole_interview_but_not_forever()
    {
        var t = InterviewTicket.Create(Secret, "user-1", Now);
        Assert.True(InterviewTicket.IsValid(Secret, t, Now.AddMinutes(89)));
        Assert.False(InterviewTicket.IsValid(Secret, t, Now.AddMinutes(91)));
    }

    [Fact]
    public void A_tampered_or_wrong_key_ticket_is_rejected()
    {
        var t = InterviewTicket.Create(Secret, "user-1", Now);
        Assert.False(InterviewTicket.IsValid("another-secret", t, Now));
        Assert.False(InterviewTicket.IsValid(Secret, t.Replace("user-1", "user-2"), Now));
        Assert.False(InterviewTicket.IsValid(Secret, t + "x", Now));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("garbage")]
    [InlineData("a.b.c")]
    public void Missing_or_malformed_tickets_are_rejected(string? ticket)
        => Assert.False(InterviewTicket.IsValid(Secret, ticket, Now));
}
