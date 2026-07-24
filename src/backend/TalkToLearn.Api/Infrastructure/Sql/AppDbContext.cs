using Microsoft.EntityFrameworkCore;
using TalkToLearn.Api.Infrastructure.Sql.Models;

namespace TalkToLearn.Api.Infrastructure.Sql;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User>               Users               => Set<User>();
    public DbSet<Follow>             Follows             => Set<Follow>();
    public DbSet<Subscription>       Subscriptions       => Set<Subscription>();
    public DbSet<PaymentRecord>      PaymentRecords      => Set<PaymentRecord>();
    public DbSet<Organisation>       Organisations       => Set<Organisation>();
    public DbSet<OrganisationMember> OrganisationMembers => Set<OrganisationMember>();
    public DbSet<LoginHistory>       LoginHistories      => Set<LoginHistory>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();       // fast login lookup + duplicate prevention
            e.HasMany(x => x.Following)
             .WithOne(x => x.Follower)
             .HasForeignKey(x => x.FollowerId)
             .OnDelete(DeleteBehavior.Restrict);        // avoid cascade cycles
            e.HasMany(x => x.Followers)
             .WithOne(x => x.Followee)
             .HasForeignKey(x => x.FolloweeId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        model.Entity<Follow>(e =>
        {
            e.HasIndex(x => new { x.FollowerId, x.FolloweeId }).IsUnique(); // one follow per pair
            e.HasIndex(x => x.FolloweeId);                                   // fast "who follows me?" query
        });

        model.Entity<Subscription>(e =>
        {
            e.HasIndex(x => x.UserId);
            e.Property(x => x.PriceGbp).HasPrecision(10, 2);
            e.HasMany(x => x.Payments).WithOne(x => x.Subscription).HasForeignKey(x => x.SubscriptionId);
        });

        model.Entity<PaymentRecord>(e =>
        {
            e.HasIndex(x => x.UserId);
            e.Property(x => x.AmountGbp).HasPrecision(10, 2);
        });

        model.Entity<Organisation>(e =>
        {
            e.HasMany(x => x.Members).WithOne(x => x.Organisation).HasForeignKey(x => x.OrganisationId);
        });

        model.Entity<OrganisationMember>(e =>
        {
            e.HasIndex(x => new { x.OrganisationId, x.UserId }).IsUnique();
        });

        model.Entity<LoginHistory>(e =>
        {
            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.LoginAt);
        });
    }
}
