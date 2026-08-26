using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Sql;

namespace Explain.Api.Features.Users.List;

/// <summary>
/// Admin-facing read-only user directory, filterable by role slug (candidate | recruiter |
/// client | admin | super-admin). Backs the Candidates/Employers screens in admin-portal —
/// "client" is what the Employer portal is being renamed from, see docs/domain rename notes,
/// so it's the role filter used for "Employers" until a distinct role slug exists.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/admin/users", async (AppDbContext db, string? role, string? search, int page = 1, int size = 50) =>
        {
            var query = db.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(role))
            {
                var roleSlug = role.Trim().ToLower();
                query = query.Where(u => db.UserRoles.Any(ur => ur.UserId == u.Id && ur.Role.Slug == roleSlug));
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(u => u.Email.Contains(term) || u.FirstName.Contains(term) || u.LastName.Contains(term));
            }

            var total = await query.CountAsync();
            var rows = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * size)
                .Take(size)
                .Select(u => new
                {
                    u.Id, u.Email, u.FirstName, u.LastName, u.CreatedAt,
                    Roles = db.UserRoles.Where(ur => ur.UserId == u.Id).Select(ur => ur.Role.Slug).ToList(),
                })
                .ToListAsync();

            return Results.Ok(new { total, page, size, rows });
        })
        .WithName("ListUsers").WithTags("Users")
        .RequireAuthorization(Permissions.ViewAdminPortal);
    }
}
