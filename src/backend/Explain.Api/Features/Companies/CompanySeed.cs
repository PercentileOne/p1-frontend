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

        // ── Second wave (2026-09-19): "put all the popular ones in" ─────────────────────────────
        // Tech & internet
        E("TikTok", "Technology & Media", aliases: new[] { "ByteDance" }),
        E("Samsung", "Technology"),
        E("Intel", "Technology"),
        E("AMD", "Technology"),
        E("Adobe", "Technology"),
        E("Cisco", "Technology"),
        E("Dell Technologies", "Technology", aliases: new[] { "Dell" }),
        E("Qualcomm", "Technology"),
        E("Arm", "Technology", "uk", new[] { "Arm Holdings" }),
        E("Palantir", "Technology"),
        E("Snowflake", "Technology"),
        E("Databricks", "Technology"),
        E("Atlassian", "Technology"),
        E("Shopify", "Technology"),
        E("Zoom", "Technology"),
        E("Dropbox", "Technology"),
        E("Pinterest", "Technology & Media"),
        E("Snap", "Technology & Media", aliases: new[] { "Snapchat" }),
        E("Reddit", "Technology & Media"),
        E("Sony", "Technology & Media", aliases: new[] { "PlayStation" }),
        E("Nintendo", "Technology & Media"),
        E("Electronic Arts", "Technology & Media", aliases: new[] { "EA", "EA Sports" }),
        E("Booking.com", "Technology & Travel"),
        E("Expedia", "Technology & Travel"),
        E("Deliveroo", "Technology & Food", "uk"),
        E("Just Eat Takeaway", "Technology & Food", "uk", new[] { "Just Eat" }),
        E("Wise", "Fintech", "uk", new[] { "TransferWise" }),
        E("Starling Bank", "Fintech", "uk", new[] { "Starling" }),
        E("Octopus Energy", "Energy & Technology", "uk"),
        E("Ocado", "Retail & Technology", "uk"),
        E("Rightmove", "Technology", "uk"),
        E("Bloomberg", "Financial Data & Media"),

        // Finance, payments & insurance
        E("PayPal", "Fintech"),
        E("Stripe", "Fintech"),
        E("Visa", "Payments"),
        E("Mastercard", "Payments"),
        E("American Express", "Payments & Banking", aliases: new[] { "Amex" }),
        E("Bank of America", "Banking"),
        E("Wells Fargo", "Banking"),
        E("UBS", "Investment Banking"),
        E("Deutsche Bank", "Investment Banking"),
        E("BNP Paribas", "Banking"),
        E("Santander", "Banking", aliases: new[] { "Santander UK" }),
        E("Standard Chartered", "Banking", "uk"),
        E("Nationwide", "Banking", "uk", new[] { "Nationwide Building Society" }),
        E("Aviva", "Insurance", "uk"),
        E("Legal & General", "Insurance", "uk", new[] { "L&G" }),
        E("Prudential", "Insurance", "uk"),
        E("London Stock Exchange Group", "Financial Markets", "uk", new[] { "LSEG", "LSE" }),
        E("Fidelity Investments", "Asset Management", aliases: new[] { "Fidelity" }),
        E("Vanguard", "Asset Management"),
        E("Schroders", "Asset Management", "uk"),

        // Consulting & professional services
        E("Oliver Wyman", "Management Consulting"),
        E("Capgemini", "Consulting & Technology"),
        E("Cognizant", "Consulting & Technology"),
        E("Mercer", "Professional Services"),
        E("Arup", "Engineering & Infrastructure", "uk"),

        // Retail, consumer, food & fashion
        E("Walmart", "Retail"),
        E("Costco", "Retail"),
        E("Target", "Retail"),
        E("Asda", "Retail", "uk"),
        E("Aldi", "Retail"),
        E("Lidl", "Retail"),
        E("Boots", "Retail & Health", "uk", new[] { "Boots UK" }),
        E("Primark", "Retail", "uk"),
        E("Next", "Retail", "uk", new[] { "Next plc" }),
        E("ASOS", "Retail", "uk"),
        E("Zara", "Retail & Fashion", aliases: new[] { "Inditex" }),
        E("H&M", "Retail & Fashion", aliases: new[] { "Hennes & Mauritz" }),
        E("Adidas", "Consumer Brands"),
        E("LEGO", "Consumer Brands", aliases: new[] { "Lego Group" }),
        E("Red Bull", "Consumer Brands"),
        E("Dyson", "Consumer Brands & Engineering", "uk"),
        E("LVMH", "Luxury & Fashion", aliases: new[] { "Louis Vuitton", "Dior" }),
        E("L'Oréal", "Consumer Goods", aliases: new[] { "L'Oreal", "Loreal" }),
        E("Estée Lauder", "Consumer Goods", aliases: new[] { "Estee Lauder" }),
        E("Nestlé", "Consumer Goods", aliases: new[] { "Nestle", "Nespresso", "KitKat" }),
        E("PepsiCo", "Consumer Goods", aliases: new[] { "Pepsi", "Walkers" }),
        E("Mars", "Consumer Goods", aliases: new[] { "Mars Wrigley" }),
        E("Mondelez", "Consumer Goods", aliases: new[] { "Cadbury", "Oreo" }),
        E("Diageo", "Consumer Goods", "uk", new[] { "Guinness", "Johnnie Walker" }),
        E("Heineken", "Consumer Goods"),
        E("Reckitt", "Consumer Goods", "uk", new[] { "Dettol", "Durex" }),
        E("KFC", "Hospitality & Food", aliases: new[] { "Yum! Brands" }),
        E("Burger King", "Hospitality & Food"),
        E("Pret A Manger", "Hospitality & Food", "uk", new[] { "Pret" }),
        E("Costa Coffee", "Hospitality & Food", "uk", new[] { "Costa" }),
        E("Greggs", "Hospitality & Food", "uk"),
        E("Hilton", "Hotels & Travel"),
        E("Marriott", "Hotels & Travel", aliases: new[] { "Marriott International" }),

        // Media & entertainment
        E("Warner Bros. Discovery", "Media & Entertainment", aliases: new[] { "Warner Bros", "HBO" }),
        E("Paramount", "Media & Entertainment"),
        E("Universal Music Group", "Media & Entertainment", aliases: new[] { "UMG" }),
        E("ITV", "Media & Broadcasting", "uk"),
        E("Channel 4", "Media & Broadcasting", "uk"),
        E("Financial Times", "Media & Publishing", "uk", new[] { "FT" }),
        E("Virgin Media O2", "Media & Telecoms", "uk", new[] { "O2", "Virgin Media" }),

        // Health & pharma
        E("Johnson & Johnson", "Pharmaceuticals", aliases: new[] { "J&J" }),
        E("Roche", "Pharmaceuticals"),
        E("Novartis", "Pharmaceuticals"),
        E("Moderna", "Pharmaceuticals"),
        E("Bupa", "Healthcare", "uk"),

        // Auto, aerospace, energy & industry
        E("Ford", "Automotive"),
        E("BMW", "Automotive"),
        E("Mercedes-Benz", "Automotive", aliases: new[] { "Mercedes" }),
        E("Toyota", "Automotive"),
        E("Volkswagen", "Automotive", aliases: new[] { "VW", "Audi", "Porsche" }),
        E("Ferrari", "Automotive"),
        E("Aston Martin", "Automotive", "uk"),
        E("McLaren", "Automotive & Motorsport", "uk", new[] { "McLaren Racing" }),
        E("Lockheed Martin", "Aerospace & Defence"),
        E("Boeing", "Aerospace"),
        E("Siemens", "Engineering & Technology"),
        E("General Electric", "Engineering & Industry", aliases: new[] { "GE" }),
        E("Honeywell", "Engineering & Industry"),
        E("National Grid", "Energy", "uk"),
        E("Network Rail", "Engineering & Infrastructure", "uk"),

        // Travel
        E("Ryanair", "Airlines & Travel"),
        E("easyJet", "Airlines & Travel", "uk"),
        E("Qatar Airways", "Airlines & Travel"),
        E("TUI", "Airlines & Travel"),

        // Public service
        E("UK Civil Service", "Public Service", "uk", new[] { "Civil Service", "Fast Stream" }),
    };
}
