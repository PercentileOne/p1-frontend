using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Explain.Api.Features.Entitlements;
using Explain.Api.Features.SessionPasses;
using Explain.Api.Infrastructure.Email;
using Explain.Api.Infrastructure.Sql;
using Microsoft.Extensions.Configuration;

namespace Explain.Api.Tests;

// The interview-pass logic and paywall settings, run against a real (in-memory SQLite) relational database — the same EF model that
// production runs on Azure SQL — since they moved from Cosmos to SQL on 2026-09-21.
public sealed class SessionPassServiceTests : IDisposable
{
    private sealed class FakeEmail : IEmailSender
    {
        public List<string> Sent { get; } = new();
        public Task SendAsync(string toEmail, string subject, string htmlBody, string? replyToEmail = null, EmailAttachment? attachment = null, CancellationToken ct = default) { Sent.Add(toEmail); return Task.CompletedTask; }
    }

    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly FakeEmail _email = new();

    public SessionPassServiceTests() { _conn.Open(); using var db = NewDb(); db.Database.EnsureCreated(); }
    public void Dispose() => _conn.Dispose();

    private AppDbContext NewDb() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options);
    private SessionPassService Svc(AppDbContext db) => new(db, _email, NullLogger<SessionPassService>.Instance);

    private async Task<SessionPass> PaidPass(SessionPassService svc, string email = "Friend@Example.com", string tier = "gift-3day")
    {
        var p = await svc.CreatePendingAsync(email, "Friend Name", null, tier, "Sender", "sender@example.com");
        await svc.AttachCheckoutSessionAsync(p.id, p.recipientEmail, "cs_test_123");
        await svc.MarkPaidAsync(p.id, p.recipientEmail, "pi_123");
        return p;
    }

    [Fact]
    public async Task A_new_pass_is_pending_and_gives_no_access_until_paid()
    {
        using var db = NewDb(); var svc = Svc(db);
        var p = await svc.CreatePendingAsync("Friend@Example.com", "Friend", null, "gift-3day", "S", "s@example.com");
        Assert.Equal("pending", p.status);
        Assert.Equal("friend@example.com", p.recipientEmail);           // stored lower-case
        Assert.Empty(await svc.GetActiveForEmailAsync("friend@example.com"));
    }

    [Fact]
    public async Task Paying_activates_the_pass_with_the_tiers_window_and_sessions()
    {
        using var db = NewDb(); var svc = Svc(db);
        await PaidPass(svc);
        var active = await svc.GetActiveForEmailAsync("FRIEND@example.com");   // lookup is case-insensitive
        var pass = Assert.Single(active);
        Assert.Equal(3, pass.sessionsTotal);
        Assert.InRange((pass.expiresAt!.Value - DateTimeOffset.UtcNow).TotalDays, 2.9, 3.0);
    }

    [Fact]
    public async Task A_gift_sends_the_invite_email_once_even_if_stripe_redelivers_the_event()
    {
        using var db = NewDb(); var svc = Svc(db);
        var p = await PaidPass(svc);
        await svc.MarkPaidAsync(p.id, p.recipientEmail, "pi_123");      // Stripe redelivery
        Assert.Single(_email.Sent);
        Assert.Equal("friend@example.com", _email.Sent[0]);
    }

    [Fact]
    public async Task A_self_purchase_does_not_send_a_gift_email()
    {
        using var db = NewDb(); var svc = Svc(db);
        await PaidPass(svc, "me@example.com", "self");
        Assert.Empty(_email.Sent);
    }

    [Fact]
    public async Task Consuming_counts_down_and_stops_at_zero()
    {
        using var db = NewDb(); var svc = Svc(db);
        await PaidPass(svc);                                              // 3 sessions
        Assert.True(await svc.CheckAndConsumeAsync("friend@example.com"));
        Assert.True(await svc.CheckAndConsumeAsync("friend@example.com"));
        Assert.True(await svc.CheckAndConsumeAsync("friend@example.com"));
        Assert.False(await svc.CheckAndConsumeAsync("friend@example.com"));
        Assert.Empty(await svc.GetActiveForEmailAsync("friend@example.com"));   // exhausted passes drop out
    }

    [Fact]
    public async Task Consuming_drains_the_soonest_expiring_pass_first()
    {
        using var db = NewDb(); var svc = Svc(db);
        var three = await PaidPass(svc, "a@example.com", "gift-3day");     // expires in 3 days
        var week = await PaidPass(svc, "a@example.com", "gift-1week");     // expires in 7 days
        Assert.True(await svc.CheckAndConsumeAsync("a@example.com"));
        using var check = NewDb();
        Assert.Equal(1, (await check.InterviewPasses.FindAsync(three.id))!.SessionsUsed);
        Assert.Equal(0, (await check.InterviewPasses.FindAsync(week.id))!.SessionsUsed);
    }

    [Fact]
    public async Task A_refunded_pass_stops_working_and_other_passes_are_untouched()
    {
        using var db = NewDb(); var svc = Svc(db);
        await PaidPass(svc, "refund@example.com");
        var other = await svc.CreatePendingAsync("other@example.com", "O", null, "self", null, null);
        await svc.MarkPaidAsync(other.id, other.recipientEmail, "pi_other");
        await svc.MarkRefundedByPaymentIntentAsync("pi_123");
        Assert.Empty(await svc.GetActiveForEmailAsync("refund@example.com"));
        Assert.Single(await svc.GetActiveForEmailAsync("other@example.com"));
    }

    [Fact]
    public async Task The_success_page_can_find_a_pass_by_its_checkout_session()
    {
        using var db = NewDb(); var svc = Svc(db);
        var p = await PaidPass(svc);
        Assert.Equal(p.id, (await svc.GetByCheckoutSessionIdAsync("cs_test_123"))!.id);
        Assert.Null(await svc.GetByCheckoutSessionIdAsync("cs_unknown"));
    }

    [Fact]
    public async Task Paywall_settings_default_to_off_3_a_day_10_a_month_and_persist_when_saved()
    {
        using (var db = NewDb())
        {
            // The migration seeds this row in production; EnsureCreated seeds it via the model's HasData.
            var ent = new EntitlementService(db, Svc(db), new ConfigurationBuilder().Build(), NullLogger<EntitlementService>.Instance);
            var s = await ent.GetSettingsAsync();
            Assert.False(s.Enforce); Assert.Equal(3, s.DailyCap); Assert.Equal(10, s.MonthlyCap); Assert.True(s.TasterEnabled);
            await ent.SaveSettingsAsync(new EntitlementSettings(true, 2, 8, false), "francis@percentile.one");
        }
        using (var db = NewDb())
        {
            var saved = await db.EntitlementSettings.SingleAsync();
            Assert.True(saved.Enforce); Assert.Equal(2, saved.DailyCap); Assert.Equal(8, saved.MonthlyCap); Assert.False(saved.TasterEnabled);
            Assert.Equal("francis@percentile.one", saved.UpdatedBy);
        }
    }
}
