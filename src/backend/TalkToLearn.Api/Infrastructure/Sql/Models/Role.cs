namespace TalkToLearn.Api.Infrastructure.Sql.Models;

public class Role
{
    public int    Id          { get; set; }
    public string Slug        { get; set; } = string.Empty;  // candidate | recruiter | client | admin | super-admin
    public string Name        { get; set; } = string.Empty;  // Display name
    public bool   IsSystemRole{ get; set; } = true;

    public List<RolePermission> RolePermissions { get; set; } = [];
    public List<UserRole>       UserRoles       { get; set; } = [];
}

public class Permission
{
    public int    Id       { get; set; }
    public string Code     { get; set; } = string.Empty;  // CAN_START_INTERVIEW etc.
    public string Category { get; set; } = string.Empty;  // Candidate | Recruiter | Admin | SuperAdmin | Public

    public List<RolePermission> RolePermissions { get; set; } = [];
}

public class RolePermission
{
    public int RoleId       { get; set; }
    public int PermissionId { get; set; }

    public Role       Role       { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}

public class UserRole
{
    public int    Id        { get; set; }
    public string UserId    { get; set; } = string.Empty;
    public int    RoleId    { get; set; }
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Role Role { get; set; } = null!;
}
