using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Features.Auth;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Tests;

// Which sign-ups the 7-day clean-up is allowed to remove, against in-memory SQLite.
public sealed class UnverifiedAccountCleanupTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    public UnverifiedAccountCleanupTests() { _conn.Open(); using var db = NewDb(); db.Database.EnsureCreated(); }
    public void Dispose() => _conn.Dispose();
    private AppDbContext NewDb() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options);
    private static User U(string email, bool verified, string? token, DateTime? sent, string role = "Candidate", bool locked = false) =>
        new() { Email = email, FirstName = "T", LastName = "U", PasswordHash = "x", Role = role, EmailVerified = verified, EmailVerificationToken = token, EmailVerificationSentAt = sent, IsLocked = locked };

    [Fact]
    public async Task Only_old_self_registered_unverified_accounts_are_selected()
    {
        var now = DateTime.UtcNow;
        using var db = NewDb();
        db.Users.AddRange(
            U("stale@fake.com", false, "tok", now.AddDays(-8)),                 // selected
            U("fresh@fake.com", false, "tok", now.AddDays(-2)),                 // still has time to verify
            U("verified@real.com", true, null, now.AddDays(-30)),               // verified
            U("invited@agency.com", false, null, null, "Recruiter"),            // admin-created invite: no verification link
            U("admin@us.com", false, "tok", now.AddDays(-30), "admin"),         // never an admin
            U("locked@fake.com", false, "tok", now.AddDays(-30), locked: true));// a security matter, left alone
        await db.SaveChangesAsync();

        var cutoff = now - UnverifiedAccountCleanupService.MaxAge;
        var picked = await UnverifiedAccountCleanupService.StaleUnverified(db, cutoff).Select(u => u.Email).ToListAsync();
        Assert.Equal(["stale@fake.com"], picked);
    }
}
