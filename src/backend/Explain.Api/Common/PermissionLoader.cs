using Microsoft.EntityFrameworkCore;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Common;

/// <summary>
/// Resolves the full permission set for a user based on their assigned roles.
/// Called once at login/register — results are embedded in the JWT so subsequent
/// requests don't need a DB round-trip.
/// </summary>
public class PermissionLoader(AppDbContext db)
{
    public async Task<List<string>> LoadAsync(string userId, CancellationToken ct = default)
    {
        return await db.UserRoles
            .Where(ur => ur.UserId == userId)
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToListAsync(ct);
    }
}
