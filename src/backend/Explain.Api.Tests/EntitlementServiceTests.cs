using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Explain.Api.Features.Entitlements;
using Explain.Api.Features.SessionPasses;
using Explain.Api.Infrastructure.Email;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Tests;

// The whole access check end to end — facts gathered from real SQL tables, the rules applied, every start recorded — against an
// in-memory relational database. This is the paywall as it will actually behave once enforcement is switched on.
public sealed class EntitlementServiceTests : IDisposable
{
    private sealed class NoEmail : IEmailSender
    {
        public Task SendAsync(string toEmail, string subject, string htmlBody, string? replyToEmail = null, EmailAttachment? attachment = null, CancellationToken ct = default) => Task.CompletedTask;
    }

    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    public EntitlementServiceTests() { _conn.Open(); using var db = NewDb(); db.Database.EnsureCreated(); }
    public void Dispose() => _conn.Dispose();

    private AppDbContext NewDb() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options);

    private static EntitlementService Ent(AppDbContext db) =>
        new(db, new SessionPassService(db, new NoEmail(), NullLogger<SessionPassService>.Instance),
            new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Jwt:Secret"] = "test-secret" }).Build(),
            NullLogger<EntitlementService>.Instance);

    private async Task<string> User(string email, bool verified = true)
    {
        using var db = NewDb();
        var u = new Infrastructure.Sql.Models.User { Email = email, EmailVerified = verified, FirstName = "T", LastName = "T", PasswordHash = "x" };
        db.Users.Add(u); await db.SaveChangesAsync();
        return u.Id;
    }

    private async Task Enforce(bool on)
    {
        using var db = NewDb();
        await Ent(db).SaveSettingsAsync(new EntitlementSettings(on, 3, 10, true), "test");
    }

    private async Task<StartResult> Start(string userId, string email)
    {
        using var db = NewDb();
        return await Ent(db).StartInterviewAsync(userId, email);
    }

    private async Task Grant(string email, string kind)
    {
        using var db = NewDb();
        db.AccessGrants.Add(new AccessGrant { Email = email, Kind = kind, GrantedBy = "test" });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task A_newcomer_gets_one_free_interview_and_then_the_paywall()
    {
        await Enforce(true);
        var id = await User("new@example.com");
        var first = await Start(id, "new@example.com");
        Assert.True(first.Allowed); Assert.Equal("taster", first.Source); Assert.NotNull(first.Ticket);

        var second = await Start(id, "new@example.com");
        Assert.False(second.Allowed); Assert.Equal("taster-used", second.Code); Assert.Null(second.Ticket);
    }

    [Fact]
    public async Task The_same_mailbox_written_another_way_cannot_claim_a_second_free_interview()
    {
        await Enforce(true);
        var a = await User("someone@gmail.com");
        var b = await User("some.one+again@gmail.com");
        Assert.True((await Start(a, "someone@gmail.com")).Allowed);
        var second = await Start(b, "some.one+again@gmail.com");
        Assert.False(second.Allowed);
        Assert.Equal("taster-used", second.Code);
    }

    [Fact]
    public async Task An_unverified_email_must_verify_before_the_free_interview()
    {
        await Enforce(true);
        var id = await User("unverified@example.com", verified: false);
        var r = await Start(id, "unverified@example.com");
        Assert.False(r.Allowed); Assert.Equal("verify-email", r.Code);
    }

    [Fact]
    public async Task A_voided_start_gives_the_free_interview_back()
    {
        await Enforce(true);
        var id = await User("void@example.com");
        var first = await Start(id, "void@example.com");
        using (var db = NewDb()) await Ent(db).VoidAsync(id, first.UsageId!);
        Assert.True((await Start(id, "void@example.com")).Allowed);
    }

    [Fact]
    public async Task Complimentary_accounts_are_free_up_to_the_daily_limit()
    {
        await Enforce(true);
        var id = await User("early@example.com");
        await Grant("early@example.com", "complimentary");
        for (var i = 0; i < 3; i++) Assert.True((await Start(id, "early@example.com")).Allowed);
        var fourth = await Start(id, "early@example.com");
        Assert.False(fourth.Allowed); Assert.Equal("daily-cap", fourth.Code);
    }

    [Fact]
    public async Task Staff_are_never_limited()
    {
        await Enforce(true);
        var id = await User("staff@example.com");
        await Grant("staff@example.com", "staff");
        for (var i = 0; i < 8; i++) Assert.True((await Start(id, "staff@example.com")).Allowed);
    }

    [Fact]
    public async Task A_subscriber_gets_three_a_day()
    {
        await Enforce(true);
        var id = await User("sub@example.com");
        using (var db = NewDb())
        {
            db.Subscriptions.Add(new Subscription { UserId = id, Status = "active", StripeSubscriptionId = "sub_1", RenewsAt = DateTime.UtcNow.AddDays(20) });
            await db.SaveChangesAsync();
        }
        for (var i = 0; i < 3; i++) Assert.True((await Start(id, "sub@example.com")).Allowed);
        var r = await Start(id, "sub@example.com");
        Assert.False(r.Allowed); Assert.Equal("daily-cap", r.Code);
    }

    [Fact]
    public async Task A_subscription_cancelled_but_paid_up_still_works_until_the_period_ends()
    {
        await Enforce(true);
        var id = await User("leaving@example.com");
        using (var db = NewDb())
        {
            db.Subscriptions.Add(new Subscription { UserId = id, Status = "cancelled", StripeSubscriptionId = "sub_2", RenewsAt = DateTime.UtcNow.AddDays(5) });
            db.Subscriptions.Add(new Subscription { UserId = id, Status = "cancelled", StripeSubscriptionId = "sub_3", RenewsAt = DateTime.UtcNow.AddDays(-5) });
            await db.SaveChangesAsync();
        }
        Assert.Equal("subscription", (await Start(id, "leaving@example.com")).Source);
    }

    [Fact]
    public async Task A_pass_is_used_up_session_by_session_and_then_runs_out()
    {
        await Enforce(true);
        var id = await User("passholder@example.com");
        using (var db = NewDb())
        {
            var svc = new SessionPassService(db, new NoEmail(), NullLogger<SessionPassService>.Instance);
            var p = await svc.CreatePendingAsync("passholder@example.com", "P", null, "gift-3day", null, null);
            await svc.MarkPaidAsync(p.id, p.recipientEmail, "pi_x");
        }
        // The taster is also available to a passholder, but a pass comes first in the rules so it is used up before the taster.
        for (var i = 0; i < 3; i++) Assert.Equal("pass", (await Start(id, "passholder@example.com")).Source);
        Assert.Equal("taster", (await Start(id, "passholder@example.com")).Source);
        Assert.False((await Start(id, "passholder@example.com")).Allowed);
    }

    [Fact]
    public async Task With_enforcement_off_nobody_is_turned_away_but_the_start_is_still_recorded()
    {
        await Enforce(false);
        var id = await User("off@example.com");
        Assert.True((await Start(id, "off@example.com")).Allowed);      // taster
        var again = await Start(id, "off@example.com");                  // would be blocked if enforcing
        Assert.True(again.Allowed);
        using var db = NewDb();
        var rows = await db.InterviewUsages.Where(u => u.UserId == id).OrderBy(u => u.StartedAt).ToListAsync();
        Assert.Equal(2, rows.Count);
        Assert.False(rows[0].WouldBlock);
        Assert.True(rows[1].WouldBlock);
    }
}
