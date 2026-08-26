namespace Explain.Api.Infrastructure.Sql.Models;

public class Organisation
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;        // e.g. "University of Westminster"
    public string Type { get; set; } = "business";          // business | university | jobcentre | recruitment
    public string ContactEmail { get; set; } = string.Empty;
    public string ContactName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Website { get; set; }
    public string? Domain { get; set; }                     // company email domain, e.g. "vallumassociates.com" — for matching future self-serve members to this org by their email
    public int SeatCount { get; set; } = 1;                 // number of licences purchased
    public decimal SeatMonthlyFeeGbp { get; set; } = 299m;  // normal flat monthly access fee — never mutated by a promo
    public decimal PrepUnitPriceGbp { get; set; } = 1m;     // metered usage — billed per interview prep sent
    public decimal? PromoSeatFeeGbp { get; set; }           // discounted seat fee (e.g. 0 for a free period) — layered on top, doesn't touch SeatMonthlyFeeGbp
    public DateTime? PromoExpiresAt { get; set; }           // when the promo ends; null = open-ended until cleared by hand
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public List<OrganisationMember> Members { get; set; } = [];

    // What's actually billed right now — falls back to the normal rate the moment the promo expires,
    // with no scheduled job or manual revert needed.
    public decimal EffectiveSeatMonthlyFeeGbp =>
        PromoSeatFeeGbp is not null && (PromoExpiresAt is null || PromoExpiresAt > DateTime.UtcNow)
            ? PromoSeatFeeGbp.Value
            : SeatMonthlyFeeGbp;
}
