using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Explain.Api.Features.Users.DeleteAccount;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Tests;

// The SQL half of "Delete my account" (the Cosmos/Blob/Stripe halves need live services), run against in-memory SQLite.
public sealed class AccountDeletionServiceTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    public AccountDeletionServiceTests() { _conn.Open(); using var db = NewDb(); db.Database.EnsureCreated(); }
    public void Dispose() => _conn.Dispose();

    private AppDbContext NewDb() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options);
    private static AccountDeletionService Svc(AppDbContext db) =>
        new(db, cosmos: null!, new ConfigurationBuilder().Build(), NullLogger<AccountDeletionService>.Instance);

    private static User NewUser(string email) => new() { Email = email, FirstName = "T", LastName = "User", PasswordHash = "x" };

    [Fact]
    public async Task Deleting_an_account_removes_their_rows_and_leaves_everyone_elses()
    {
        using var db = NewDb();
        var me = NewUser("Me@Example.com"); var other = NewUser("other@example.com");
        db.Users.AddRange(me, other);
        await db.SaveChangesAsync();

        db.Follows.AddRange(new Follow { FollowerId = me.Id, FolloweeId = other.Id }, new Follow { FollowerId = other.Id, FolloweeId = me.Id });
        db.LoginHistories.AddRange(new LoginHistory { UserId = me.Id, Email = me.Email, Success = true }, new LoginHistory { UserId = other.Id, Email = other.Email, Success = true });
        db.InterviewUsages.AddRange(
            new InterviewUsage { UserId = me.Id, EmailKey = "me@example.com", Source = "taster" },
            new InterviewUsage { UserId = other.Id, EmailKey = "other@example.com", Source = "taster" });
        db.AccessGrants.Add(new AccessGrant { Email = "me@example.com", UserId = me.Id, Kind = "complimentary" });
        db.PasswordResetTokens.Add(new PasswordResetToken { UserId = me.Id, Token = "t", ExpiresAt = DateTime.UtcNow.AddHours(1) });
        await db.SaveChangesAsync();

        await Svc(db).PurgeSqlAsync(me);

        using var check = NewDb();
        Assert.False(await check.Users.AnyAsync(u => u.Id == me.Id));
        Assert.True(await check.Users.AnyAsync(u => u.Id == other.Id));
        Assert.Empty(await check.Follows.ToListAsync());
        Assert.Equal(other.Id, Assert.Single(await check.LoginHistories.ToListAsync()).UserId);
        Assert.Equal(other.Id, Assert.Single(await check.InterviewUsages.ToListAsync()).UserId);   // the free-interview record went with the account
        Assert.Empty(await check.AccessGrants.ToListAsync());
        Assert.Empty(await check.PasswordResetTokens.ToListAsync());
    }

    [Fact]
    public async Task Passes_are_anonymised_and_payment_records_are_kept()
    {
        using var db = NewDb();
        var me = NewUser("me@example.com");
        db.Users.Add(me);
        db.InterviewPasses.Add(new InterviewPass { Id = "p1", RecipientEmail = "me@example.com", RecipientName = "Me", TierId = "self", Source = "self", SenderEmail = "me@example.com", SenderName = "Me", RedeemedByUserId = me.Id });
        var sub = new Subscription { UserId = me.Id, Plan = "candidate", Status = "active", StripeSubscriptionId = "sub_1" };
        db.Subscriptions.Add(sub);
        await db.SaveChangesAsync();

        await Svc(db).PurgeSqlAsync(me);

        using var check = NewDb();
        var pass = Assert.Single(await check.InterviewPasses.ToListAsync());
        Assert.Equal("deleted-account", pass.RecipientEmail);
        Assert.Equal("Deleted account", pass.RecipientName);
        Assert.Null(pass.SenderEmail);
        Assert.Null(pass.RedeemedByUserId);
        Assert.Single(await check.Subscriptions.ToListAsync());   // kept for accounting
    }

    [Fact]
    public async Task Running_it_twice_is_harmless()
    {
        using var db = NewDb();
        var me = NewUser("me@example.com");
        db.Users.Add(me);
        await db.SaveChangesAsync();
        await Svc(db).PurgeSqlAsync(me);
        var again = await Svc(db).PurgeSqlAsync(me);   // already gone
        Assert.Equal(0, again);
    }
}
