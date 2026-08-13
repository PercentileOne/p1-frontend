using Microsoft.EntityFrameworkCore;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Infrastructure.Sql;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User>               Users               => Set<User>();
    public DbSet<Follow>             Follows             => Set<Follow>();
    public DbSet<Subscription>       Subscriptions       => Set<Subscription>();
    public DbSet<PaymentRecord>      PaymentRecords      => Set<PaymentRecord>();
    public DbSet<Organisation>       Organisations       => Set<Organisation>();
    public DbSet<OrganisationMember> OrganisationMembers => Set<OrganisationMember>();
    public DbSet<LoginHistory>       LoginHistories      => Set<LoginHistory>();
    public DbSet<PortalFeedback>      PortalFeedbacks      => Set<PortalFeedback>();
    public DbSet<PasswordResetToken>  PasswordResetTokens  => Set<PasswordResetToken>();

    // RBAC
    public DbSet<Role>           Roles           => Set<Role>();
    public DbSet<Permission>     Permissions     => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserRole>       UserRoles       => Set<UserRole>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.HasMany(x => x.Following)
             .WithOne(x => x.Follower)
             .HasForeignKey(x => x.FollowerId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Followers)
             .WithOne(x => x.Followee)
             .HasForeignKey(x => x.FolloweeId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        model.Entity<Role>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
        });

        model.Entity<Permission>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
        });

        model.Entity<RolePermission>(e =>
        {
            e.HasKey(x => new { x.RoleId, x.PermissionId });
            e.HasOne(x => x.Role)
             .WithMany(x => x.RolePermissions)
             .HasForeignKey(x => x.RoleId);
            e.HasOne(x => x.Permission)
             .WithMany(x => x.RolePermissions)
             .HasForeignKey(x => x.PermissionId);
        });

        model.Entity<UserRole>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.RoleId }).IsUnique();
            e.HasOne(x => x.User)
             .WithMany()
             .HasForeignKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Role)
             .WithMany(x => x.UserRoles)
             .HasForeignKey(x => x.RoleId);
        });

        // Seed system roles
        model.Entity<Role>().HasData(
            new Role { Id = 1, Slug = "candidate",   Name = "Candidate",   IsSystemRole = true },
            new Role { Id = 2, Slug = "recruiter",   Name = "Recruiter",   IsSystemRole = true },
            new Role { Id = 3, Slug = "client",      Name = "Client",      IsSystemRole = true },
            new Role { Id = 4, Slug = "admin",       Name = "Admin",       IsSystemRole = true },
            new Role { Id = 5, Slug = "super-admin", Name = "Super Admin", IsSystemRole = true }
        );

        // Seed permissions
        model.Entity<Permission>().HasData(
            new Permission { Id =  1, Code = "CAN_VIEW_CAREERS",             Category = "Public"     },
            new Permission { Id =  2, Code = "CAN_START_INTERVIEW",          Category = "Candidate"  },
            new Permission { Id =  3, Code = "CAN_PRACTICE_INTERVIEW",       Category = "Candidate"  },
            new Permission { Id =  4, Code = "CAN_VIEW_INTERVIEW_RESULTS",   Category = "Candidate"  },
            new Permission { Id =  5, Code = "CAN_MANAGE_INTERVIEWS",        Category = "Recruiter"  },
            new Permission { Id =  6, Code = "CAN_VIEW_CANDIDATE_PROFILE",   Category = "Recruiter"  },
            new Permission { Id =  7, Code = "CAN_VIEW_RECRUITER_PORTAL",    Category = "Recruiter"  },
            new Permission { Id =  8, Code = "CAN_VIEW_ANALYTICS",           Category = "Recruiter"  },
            new Permission { Id =  9, Code = "CAN_VIEW_CLIENT_PORTAL",       Category = "Client"     },
            new Permission { Id = 10, Code = "CAN_VIEW_ADMIN_PORTAL",        Category = "Admin"      },
            new Permission { Id = 11, Code = "CAN_EDIT_ROLES",               Category = "Admin"      },
            new Permission { Id = 12, Code = "CAN_EDIT_PERMISSIONS",         Category = "SuperAdmin" },
            new Permission { Id = 13, Code = "CAN_VIEW_SYSTEM_SETTINGS",     Category = "SuperAdmin" }
        );

        // Seed role→permission mappings (matching the permission matrix)
        model.Entity<RolePermission>().HasData(
            // Candidate
            new RolePermission { RoleId = 1, PermissionId =  1 },
            new RolePermission { RoleId = 1, PermissionId =  2 },
            new RolePermission { RoleId = 1, PermissionId =  3 },
            new RolePermission { RoleId = 1, PermissionId =  4 },
            // Recruiter
            new RolePermission { RoleId = 2, PermissionId =  1 },
            new RolePermission { RoleId = 2, PermissionId =  4 },
            new RolePermission { RoleId = 2, PermissionId =  5 },
            new RolePermission { RoleId = 2, PermissionId =  6 },
            new RolePermission { RoleId = 2, PermissionId =  7 },
            new RolePermission { RoleId = 2, PermissionId =  8 },
            // Client
            new RolePermission { RoleId = 3, PermissionId =  1 },
            new RolePermission { RoleId = 3, PermissionId =  4 },
            new RolePermission { RoleId = 3, PermissionId =  6 },
            new RolePermission { RoleId = 3, PermissionId =  9 },
            // Admin
            new RolePermission { RoleId = 4, PermissionId =  1 },
            new RolePermission { RoleId = 4, PermissionId =  4 },
            new RolePermission { RoleId = 4, PermissionId =  5 },
            new RolePermission { RoleId = 4, PermissionId =  6 },
            new RolePermission { RoleId = 4, PermissionId =  7 },
            new RolePermission { RoleId = 4, PermissionId =  8 },
            new RolePermission { RoleId = 4, PermissionId =  9 },
            new RolePermission { RoleId = 4, PermissionId = 10 },
            new RolePermission { RoleId = 4, PermissionId = 11 },
            // SuperAdmin — all permissions
            new RolePermission { RoleId = 5, PermissionId =  1 },
            new RolePermission { RoleId = 5, PermissionId =  2 },
            new RolePermission { RoleId = 5, PermissionId =  3 },
            new RolePermission { RoleId = 5, PermissionId =  4 },
            new RolePermission { RoleId = 5, PermissionId =  5 },
            new RolePermission { RoleId = 5, PermissionId =  6 },
            new RolePermission { RoleId = 5, PermissionId =  7 },
            new RolePermission { RoleId = 5, PermissionId =  8 },
            new RolePermission { RoleId = 5, PermissionId =  9 },
            new RolePermission { RoleId = 5, PermissionId = 10 },
            new RolePermission { RoleId = 5, PermissionId = 11 },
            new RolePermission { RoleId = 5, PermissionId = 12 },
            new RolePermission { RoleId = 5, PermissionId = 13 }
        );

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
