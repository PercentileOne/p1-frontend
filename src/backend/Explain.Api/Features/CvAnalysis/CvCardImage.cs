using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Explain.Api.Features.CvAnalysis;

/// <summary>
/// The picture on a shared CV analysis link (Francis, 2026-10-19): a 1200 x 630 card, the size LinkedIn, WhatsApp and Slack show, with the person's name, their top skills as bars
/// and the roles that fit. Drawn with QuestPDF (already used for the lesson PDFs, with its own built-in font, so it needs nothing installed on the server).
/// It is made only from the positives-only public view, so it can never show a weakness: it is given a SharedCvView and nothing else.
/// </summary>
public static class CvCardImage
{
    public const int Width = 1200;
    public const int Height = 630;
    public const int MaxSkills = 5;
    public const int MaxRoles = 3;

    private const string Bg = "#0b0f14";
    private const string Panel = "#131a24";
    private const string Track = "#243040";
    private const string Green = "#34D399";
    private const string Muted = "#8b98a8";

    /// <summary>The skills shown, strongest first (ties keep their order), at most five.</summary>
    public static List<SkillLevel> TopSkills(SharedCvView view) =>
        view.analysis.Skills.Select((s, i) => (s, i)).OrderByDescending(x => x.s.Level).ThenBy(x => x.i).Take(MaxSkills).Select(x => x.s).ToList();

    /// <summary>The role titles shown, in the order they were matched, at most three.</summary>
    public static List<string> TopRoles(SharedCvView view) =>
        view.roleMatches.Select(r => r.CareerTitle).Where(t => !string.IsNullOrWhiteSpace(t)).Take(MaxRoles).ToList();

    /// <summary>Cuts a long line to fit one row of the card, ending in an ellipsis.</summary>
    public static string Fit(string text, int max)
    {
        var t = (text ?? "").Trim();
        return t.Length <= max ? t : t[..Math.Max(1, max - 1)].TrimEnd() + "…";
    }

    /// <summary>A bar's length out of 10, kept inside the track whatever the model returned.</summary>
    public static int BarLevel(int level) => Math.Clamp(level, 1, 10);

    public static byte[] Build(SharedCvView view)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var skills = TopSkills(view);
        var roles = TopRoles(view);
        var name = string.IsNullOrWhiteSpace(view.candidateName) ? "A CV analysis" : Fit(view.candidateName!, 30);

        var document = Document.Create(container => container.Page(page =>
        {
            page.Size(new PageSize(Width, Height));
            page.Margin(0);
            page.PageColor(Bg);
            page.DefaultTextStyle(t => t.FontColor(Colors.White).FontSize(20));

            page.Content().PaddingHorizontal(48).PaddingTop(44).Column(col =>
            {
                col.Spacing(0);

                // Brand and label
                col.Item().Row(row =>
                {
                    row.RelativeItem().Text(t =>
                    {
                        t.DefaultTextStyle(x => x.FontSize(24).Bold());
                        t.Span("The").FontColor(Green);
                        t.Span("Interview").FontColor(Colors.White);
                        t.Span("Chair").FontColor(Green);
                        t.Span(".com").FontColor(Muted).NormalWeight();
                    });
                    row.AutoItem().Text("CV ANALYSIS").FontSize(16).Bold().FontColor(Green).LetterSpacing(0.12f);
                });

                // Name
                col.Item().PaddingTop(26).Text(name).FontSize(54).Bold().ClampLines(1);
                col.Item().PaddingTop(2).Text("What this CV shows").FontSize(20).FontColor(Muted);

                // Skills and roles
                col.Item().PaddingTop(30).Row(row =>
                {
                    row.RelativeItem(62).Column(left =>
                    {
                        left.Spacing(17);
                        foreach (var s in skills)
                        {
                            var level = BarLevel(s.Level);
                            left.Item().Column(one =>
                            {
                                one.Spacing(6);
                                one.Item().Text(Fit(s.Name, 56)).FontSize(22).SemiBold().ClampLines(1);
                                one.Item().Height(12).Row(bar =>
                                {
                                    bar.RelativeItem(level).Background(Green);
                                    if (level < 10) bar.RelativeItem(10 - level).Background(Track);
                                });
                            });
                        }
                    });

                    row.ConstantItem(40);

                    row.RelativeItem(38).Background(Panel).Padding(24).Column(right =>
                    {
                        right.Spacing(10);
                        right.Item().Text("ROLES THAT FIT").FontSize(15).Bold().FontColor(Muted).LetterSpacing(0.1f);
                        if (roles.Count > 0)
                        {
                            right.Item().Text($"{view.roleMatches.Count} {(view.roleMatches.Count == 1 ? "role" : "roles")}").FontSize(44).Bold().FontColor(Green);
                            foreach (var r in roles) right.Item().Text(Fit(r, 28)).FontSize(21).SemiBold().ClampLines(1);
                        }
                        else right.Item().Text("Skills laid out").FontSize(30).Bold().FontColor(Green);
                    });
                });

            });

            // Call to action. In the footer, not the column, so it can never be pushed off the card by what is above it.
            page.Footer().PaddingHorizontal(48).PaddingBottom(36).Text("Get your free CV analysis at TheInterviewChair.com").FontSize(24).Bold().FontColor(Green);
        }));

        var images = document.GenerateImages(new ImageGenerationSettings { ImageFormat = ImageFormat.Png, RasterDpi = 72 });
        return images.First();
    }
}
