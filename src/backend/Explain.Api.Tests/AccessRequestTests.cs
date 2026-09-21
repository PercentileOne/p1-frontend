using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;
using AccessReq = Explain.Api.Features.AccessRequests.Endpoint;

namespace Explain.Api.Tests;

public class AccessRequestValidationTests
{
    private static AccessReq.CreateRequest Good(string? type = "recruiter") =>
        new("Jane Smith", "Acme Recruitment", "Jane@Acme.co.uk", "+44 7700 900123", type, 3, "We hire engineers.", null);

    [Fact]
    public void A_complete_request_is_accepted_and_normalised()
    {
        var (ok, _, r) = AccessReq.Validate(Good(), "203.0.113.7");
        Assert.True(ok);
        Assert.Equal("jane@acme.co.uk", r!.Email);
        Assert.Equal(3, r.Seats);
        Assert.Equal("new", r.Status);
        Assert.Equal("203.0.113.7", r.IpAddress);
    }

    [Theory]
    [InlineData("", "Acme", "a@b.co", "07700900123")]
    [InlineData("Jane", "", "a@b.co", "07700900123")]
    [InlineData("Jane", "Acme", "not-an-email", "07700900123")]
    [InlineData("Jane", "Acme", "a@b.co", "123")]       // needs a number we can actually call
    public void Missing_or_bad_fields_are_rejected(string name, string company, string email, string phone)
    {
        var (ok, error, _) = AccessReq.Validate(new(name, company, email, phone, "recruiter", 1, null, null), null);
        Assert.False(ok);
        Assert.False(string.IsNullOrWhiteSpace(error));
    }

    [Fact]
    public void Only_recruiter_or_employer_is_accepted()
    {
        Assert.True(AccessReq.Validate(Good("employer"), null).Ok);
        Assert.False(AccessReq.Validate(Good("admin"), null).Ok);
    }

    [Fact]
    public void Seats_and_message_are_clamped()
    {
        var (_, _, r) = AccessReq.Validate(new("Jane", "Acme", "a@b.co", "07700900123", "recruiter", 9999, new string('x', 5000), null), null);
        Assert.Equal(200, r!.Seats);
        Assert.Equal(2000, r.Message!.Length);
    }

    [Fact]
    public void Standard_fees_match_the_pricing_page()
    {
        Assert.Equal(299m, AccessReq.DefaultSeatFee("recruiter"));
        Assert.Equal(399m, AccessReq.DefaultSeatFee("employer"));
    }
}

public sealed class AccessRequestPaymentTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    public AccessRequestPaymentTests() { _conn.Open(); using var db = NewDb(); db.Database.EnsureCreated(); }
    public void Dispose() => _conn.Dispose();
    private AppDbContext NewDb() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options);

    [Fact]
    public async Task A_paid_checkout_marks_the_request_paid_and_activates_the_organisation()
    {
        using var db = NewDb();
        var org = new Organisation { Name = "Acme", Type = "recruitment", ContactEmail = "a@b.co", ContactName = "A", Phone = "0770", Status = "pending" };
        db.Organisations.Add(org);
        await db.SaveChangesAsync();
        var req = new AccessRequest { Name = "A", Company = "Acme", Email = "a@b.co", Phone = "07700900123", Status = "approved", OrganisationId = org.Id };
        db.AccessRequests.Add(req);
        await db.SaveChangesAsync();

        var session = new Stripe.Checkout.Session { SubscriptionId = "sub_123", Metadata = new Dictionary<string, string> { ["accessRequestId"] = req.Id } };
        var marked = await AccessReq.MarkPaidAsync(db, session);

        Assert.NotNull(marked);
        using var check = NewDb();
        var saved = await check.AccessRequests.SingleAsync();
        Assert.Equal("paid", saved.Status);
        Assert.Equal("sub_123", saved.StripeSubscriptionId);
        Assert.NotNull(saved.PaidAt);
        Assert.Equal("active", (await check.Organisations.SingleAsync()).Status);
    }

    [Fact]
    public async Task A_candidate_subscription_checkout_is_left_alone()
    {
        using var db = NewDb();
        var session = new Stripe.Checkout.Session { SubscriptionId = "sub_9", Metadata = new Dictionary<string, string> { ["userId"] = "u1" } };
        Assert.Null(await AccessReq.MarkPaidAsync(db, session));   // no accessRequestId -> not ours, the candidate path handles it
    }
}
