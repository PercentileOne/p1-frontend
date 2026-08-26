using Microsoft.EntityFrameworkCore;
using Explain.Api.Common;
using Explain.Api.Infrastructure.Sql;
using Explain.Api.Infrastructure.Sql.Models;

namespace Explain.Api.Features.Organisations;

/// <summary>
/// Admin-facing CRUD over the Organisations/OrganisationMembers tables — real, previously
/// unwired multi-tenant groundwork (see docs/auth/multi-tenant-account-model.html). Orgs are
/// admin-provisioned only (via a sales call), never self-registered, so every route here is
/// gated on CAN_MANAGE_ORGANISATIONS. Member add/remove lives in Members/Endpoint.cs.
/// </summary>
public static class Endpoint
{
    public static void Map(WebApplication app)
    {
        app.MapGet("/api/admin/organisations", async (AppDbContext db, string? search, int page = 1, int size = 50) =>
        {
            var query = db.Organisations.AsQueryable();
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(o => o.Name.Contains(term) || o.ContactEmail.Contains(term));
            }

            var total = await query.CountAsync();
            var rows = await query
                .OrderBy(o => o.Name)
                .Skip((page - 1) * size)
                .Take(size)
                .Select(o => new
                {
                    o.Id, o.Name, o.Type, o.ContactEmail, o.ContactName, o.Phone, o.Website, o.Domain,
                    o.SeatCount, o.SeatMonthlyFeeGbp, o.PrepUnitPriceGbp,
                    o.PromoSeatFeeGbp, o.PromoExpiresAt,
                    EffectiveSeatMonthlyFeeGbp = o.PromoSeatFeeGbp != null && (o.PromoExpiresAt == null || o.PromoExpiresAt > DateTime.UtcNow)
                        ? o.PromoSeatFeeGbp.Value
                        : o.SeatMonthlyFeeGbp,
                    o.Status, o.CreatedAt,
                    MemberCount = o.Members.Count,
                })
                .ToListAsync();

            return Results.Ok(new { total, page, size, rows });
        })
        .WithName("ListOrganisations").WithTags("Organisations")
        .RequireAuthorization(Permissions.ManageOrganisations);

        app.MapGet("/api/admin/organisations/{id:int}", async (int id, AppDbContext db) =>
        {
            var org = await db.Organisations.FirstOrDefaultAsync(o => o.Id == id);
            if (org is null) return Results.NotFound(new { error = "Organisation not found." });

            var members = await db.OrganisationMembers
                .Where(m => m.OrganisationId == id)
                .Join(db.Users, m => m.UserId, u => u.Id, (m, u) => new
                {
                    m.Id, m.UserId, Name = (u.FirstName + " " + u.LastName).Trim(), u.Email, m.Role, m.JoinedAt,
                })
                .OrderBy(m => m.JoinedAt)
                .ToListAsync();

            return Results.Ok(new
            {
                org.Id, org.Name, org.Type, org.ContactEmail, org.ContactName, org.Phone, org.Website, org.Domain,
                org.SeatCount, org.SeatMonthlyFeeGbp, org.PrepUnitPriceGbp,
                org.PromoSeatFeeGbp, org.PromoExpiresAt, org.EffectiveSeatMonthlyFeeGbp,
                org.Status, org.CreatedAt,
                Members = members,
            });
        })
        .WithName("GetOrganisation").WithTags("Organisations")
        .RequireAuthorization(Permissions.ManageOrganisations);

        app.MapPost("/api/admin/organisations", async (CreateRequest req, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(req.Name))
                return Results.BadRequest(new { error = "Organisation name is required." });
            if (string.IsNullOrWhiteSpace(req.ContactEmail) || !req.ContactEmail.Contains('@'))
                return Results.BadRequest(new { error = "A valid contact email is required." });
            if (string.IsNullOrWhiteSpace(req.ContactName))
                return Results.BadRequest(new { error = "Contact name is required." });
            if (string.IsNullOrWhiteSpace(req.Phone))
                return Results.BadRequest(new { error = "Phone number is required." });

            var org = new Organisation
            {
                Name              = req.Name.Trim(),
                Type              = req.Type ?? "business",
                ContactEmail      = req.ContactEmail.Trim().ToLower(),
                ContactName       = req.ContactName.Trim(),
                Phone             = req.Phone.Trim(),
                Website           = req.Website?.Trim(),
                Domain            = req.Domain?.Trim().ToLower(),
                SeatCount         = req.SeatCount ?? 1,
                SeatMonthlyFeeGbp = req.SeatMonthlyFeeGbp ?? 299m,
                PrepUnitPriceGbp  = req.PrepUnitPriceGbp ?? 1m,
                PromoSeatFeeGbp   = req.PromoSeatFeeGbp,
                PromoExpiresAt    = req.PromoExpiresAt,
                Status            = req.Status ?? "active",
            };

            db.Organisations.Add(org);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/organisations/{org.Id}", new { org.Id });
        })
        .WithName("CreateOrganisation").WithTags("Organisations")
        .RequireAuthorization(Permissions.ManageOrganisations);

        app.MapPut("/api/admin/organisations/{id:int}", async (int id, UpdateRequest req, AppDbContext db) =>
        {
            var org = await db.Organisations.FindAsync(id);
            if (org is null) return Results.NotFound(new { error = "Organisation not found." });

            if (!string.IsNullOrWhiteSpace(req.Name)) org.Name = req.Name.Trim();
            if (req.Type is not null) org.Type = req.Type;
            if (!string.IsNullOrWhiteSpace(req.ContactEmail)) org.ContactEmail = req.ContactEmail.Trim().ToLower();
            if (!string.IsNullOrWhiteSpace(req.ContactName)) org.ContactName = req.ContactName.Trim();
            if (!string.IsNullOrWhiteSpace(req.Phone)) org.Phone = req.Phone.Trim();
            if (req.Website is not null) org.Website = req.Website.Trim();
            if (req.Domain is not null) org.Domain = req.Domain.Trim().ToLower();
            if (req.SeatCount is not null) org.SeatCount = req.SeatCount.Value;
            if (req.SeatMonthlyFeeGbp is not null) org.SeatMonthlyFeeGbp = req.SeatMonthlyFeeGbp.Value;
            if (req.PrepUnitPriceGbp is not null) org.PrepUnitPriceGbp = req.PrepUnitPriceGbp.Value;
            if (req.Status is not null) org.Status = req.Status;

            // Promo: ClearPromo wins outright (an explicit "end the promo now" action);
            // otherwise each field updates independently so you can set a fee without
            // touching the expiry, or vice versa.
            if (req.ClearPromo)
            {
                org.PromoSeatFeeGbp = null;
                org.PromoExpiresAt  = null;
            }
            else
            {
                if (req.PromoSeatFeeGbp is not null) org.PromoSeatFeeGbp = req.PromoSeatFeeGbp;
                if (req.PromoExpiresAt is not null) org.PromoExpiresAt = req.PromoExpiresAt;
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { org.Id });
        })
        .WithName("UpdateOrganisation").WithTags("Organisations")
        .RequireAuthorization(Permissions.ManageOrganisations);
    }

    public record CreateRequest(string Name, string ContactEmail, string ContactName, string Phone, string? Type,
        string? Website, string? Domain,
        int? SeatCount, decimal? SeatMonthlyFeeGbp, decimal? PrepUnitPriceGbp,
        decimal? PromoSeatFeeGbp, DateTime? PromoExpiresAt, string? Status);

    public record UpdateRequest(string? Name, string? Type, string? ContactEmail, string? ContactName,
        string? Phone, string? Website, string? Domain,
        int? SeatCount, decimal? SeatMonthlyFeeGbp, decimal? PrepUnitPriceGbp, string? Status,
        decimal? PromoSeatFeeGbp, DateTime? PromoExpiresAt, bool ClearPromo = false);
}
