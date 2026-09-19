namespace Explain.Api.Features.Companies;

/// <summary>
/// The curated launch list for Company Specific interviews (Francis, 2026-09-19: "just popular well known
/// companies" — deliberately NOT the FTSE 100, which doesn't even contain Google/Microsoft/Meta). Order is
/// display order for the picker's "popular" section. Mixed on purpose: tech is only part of the story —
/// retail, banks, consultancies, FMCG, media, health and industry are here because plenty of candidates
/// dream of a marketing role at M&amp;S or a graduate scheme at Unilever, not just an engineering job at Google.
///
/// `Sources` are best-effort official pages the profile draft may read for grounding; a page that doesn't
/// load or has too little text is silently skipped, and a profile with no source is labelled "ai-draft".
/// </summary>
internal static class CompanySeed
{
    internal sealed record Entry(string Name, string Sector, string Region, string[] Aliases, string[] Sources);

    private static Entry E(string name, string sector, string region = "global", string[]? aliases = null, string[]? sources = null)
        => new(name, sector, region, aliases ?? Array.Empty<string>(), sources ?? Array.Empty<string>());

    public static readonly IReadOnlyList<Entry> All = new List<Entry>
    {
        // ── Big tech & the dream tech employers ─────────────────────────────────────────────────
        E("Google", "Technology", aliases: new[] { "Alphabet", "YouTube", "DeepMind" }, sources: new[] { "https://www.google.com/about/careers/applications/how-we-hire/", "https://careers.google.com/how-we-hire/" }),
        E("Microsoft", "Technology", aliases: new[] { "LinkedIn", "GitHub", "Xbox" }),
        E("Amazon", "Technology & Retail", aliases: new[] { "AWS", "Amazon Web Services" }, sources: new[] { "https://www.amazon.jobs/content/en/our-workplace/leadership-principles" }),
        E("Apple", "Technology"),
        E("Meta", "Technology", aliases: new[] { "Facebook", "Instagram", "WhatsApp" }),
        E("Netflix", "Technology & Media"),
        E("Tesla", "Automotive & Technology"),
        E("NVIDIA", "Technology"),
        E("X", "Technology & Media", aliases: new[] { "Twitter" }),
        E("Spotify", "Technology & Media", "global"),
        E("Uber", "Technology"),
        E("Airbnb", "Technology & Travel"),
        E("OpenAI", "Technology"),
        E("Anthropic", "Technology"),
        E("Salesforce", "Technology"),
        E("IBM", "Technology"),
        E("Oracle", "Technology"),
        E("SAP", "Technology"),

        // ── Finance ─────────────────────────────────────────────────────────────────────────────
        E("Goldman Sachs", "Investment Banking", aliases: new[] { "Goldman" }),
        E("JPMorgan Chase", "Investment Banking", aliases: new[] { "JP Morgan", "JPMorgan" }),
        E("Morgan Stanley", "Investment Banking"),
        E("Citi", "Banking", aliases: new[] { "Citibank", "Citigroup" }),
        E("Barclays", "Banking", "uk"),
        E("HSBC", "Banking", "uk"),
        E("Lloyds Banking Group", "Banking", "uk", new[] { "Lloyds", "Halifax", "Bank of Scotland" }),
        E("NatWest Group", "Banking", "uk", new[] { "NatWest", "RBS" }),
        E("BlackRock", "Asset Management"),
        E("Revolut", "Fintech", "uk"),
        E("Monzo", "Fintech", "uk"),

        // ── Consulting & professional services ─────────────────────────────────────────────────
        E("McKinsey & Company", "Management Consulting", aliases: new[] { "McKinsey" }),
        E("Boston Consulting Group", "Management Consulting", aliases: new[] { "BCG" }),
        E("Bain & Company", "Management Consulting", aliases: new[] { "Bain" }),
        E("Deloitte", "Professional Services"),
        E("PwC", "Professional Services", aliases: new[] { "PricewaterhouseCoopers" }),
        E("EY", "Professional Services", aliases: new[] { "Ernst & Young" }),
        E("KPMG", "Professional Services"),
        E("Accenture", "Consulting & Technology"),

        // ── Retail, consumer & hospitality ─────────────────────────────────────────────────────
        E("Marks & Spencer", "Retail", "uk", new[] { "M&S", "Marks and Spencer" }),
        E("Tesco", "Retail", "uk"),
        E("Sainsbury's", "Retail", "uk", new[] { "Sainsburys", "Argos" }),
        E("John Lewis Partnership", "Retail", "uk", new[] { "John Lewis", "Waitrose" }),
        E("Nike", "Consumer Brands"),
        E("IKEA", "Retail"),
        E("Unilever", "Consumer Goods", aliases: new[] { "Dove", "Persil" }),
        E("Procter & Gamble", "Consumer Goods", aliases: new[] { "P&G" }),
        E("Coca-Cola", "Consumer Goods", aliases: new[] { "Coke" }),
        E("Burberry", "Luxury & Fashion", "uk"),
        E("McDonald's", "Hospitality & Food"),
        E("Starbucks", "Hospitality & Food"),

        // ── Media & entertainment ───────────────────────────────────────────────────────────────
        E("Disney", "Media & Entertainment", aliases: new[] { "The Walt Disney Company", "Pixar" }),
        E("BBC", "Media & Broadcasting", "uk"),
        E("Sky", "Media & Telecoms", "uk"),

        // ── Health, pharma & public service ────────────────────────────────────────────────────
        E("NHS", "Healthcare & Public Service", "uk", new[] { "National Health Service" }),
        E("AstraZeneca", "Pharmaceuticals", "uk"),
        E("GSK", "Pharmaceuticals", "uk", new[] { "GlaxoSmithKline" }),
        E("Pfizer", "Pharmaceuticals"),

        // ── Energy, aerospace, automotive & industry ───────────────────────────────────────────
        E("Shell", "Energy", "uk"),
        E("BP", "Energy", "uk"),
        E("Rolls-Royce", "Aerospace & Engineering", "uk"),
        E("BAE Systems", "Aerospace & Defence", "uk"),
        E("Airbus", "Aerospace"),
        E("SpaceX", "Aerospace & Technology"),
        E("Jaguar Land Rover", "Automotive", "uk", new[] { "JLR" }),

        // ── Travel & telecoms ───────────────────────────────────────────────────────────────────
        E("British Airways", "Airlines & Travel", "uk"),
        E("Virgin Atlantic", "Airlines & Travel", "uk"),
        E("Emirates", "Airlines & Travel"),
        E("Vodafone", "Telecoms", "uk"),
        E("BT Group", "Telecoms", "uk", new[] { "BT", "EE" }),
    };
}
