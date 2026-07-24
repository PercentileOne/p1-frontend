using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using TalkToLearn.Api.Features.Lessons.Generate;

namespace TalkToLearn.Api.Features.Lessons.Export;

public static class LessonPdfBuilder
{
    // ── Palette ───────────────────────────────────────────────────────────────
    private static readonly string Dark        = "#0F172A";
    private static readonly string Indigo      = "#6366F1";
    private static readonly string IndigoLight = "#A5B4FC";
    private static readonly string Blue        = "#3B82F6";
    private static readonly string Cyan        = "#0891B2";
    private static readonly string Green       = "#10B981";
    private static readonly string Red         = "#EF4444";
    private static readonly string Amber       = "#D97706";
    private static readonly string White       = "#FFFFFF";
    private static readonly string Slate200    = "#E2E8F0";
    private static readonly string Slate400    = "#94A3B8";
    private static readonly string Slate500    = "#64748B";
    private static readonly string Slate700    = "#334155";
    private static readonly string Slate800    = "#1E293B";

    public static byte[] Build(LessonDto lesson, string recipientName)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(0);
                page.DefaultTextStyle(x => x.FontFamily("Arial").FontSize(10).FontColor(Slate700));

                page.Content().Column(col =>
                {
                    // ── Cover ─────────────────────────────────────────────────
                    col.Item().Height(280).Background(Dark).Padding(40).Column(cover =>
                    {
                        cover.Item().Text("TALKTOLEARN")
                            .FontSize(11).FontColor(Indigo).Bold().LetterSpacing(3);

                        cover.Item().PaddingTop(16).Background(IndigoWithAlpha()).Border(1)
                            .BorderColor(IndigoLight).Padding(6).Text(lesson.Category.ToUpperInvariant())
                            .FontSize(10).FontColor(IndigoLight).Bold().LetterSpacing(1);

                        cover.Item().PaddingTop(20).Text(lesson.Title)
                            .FontSize(26).FontColor(White).Bold();

                        cover.Item().PaddingTop(16).BorderLeft(3).BorderColor(Indigo).PaddingLeft(12)
                            .Text($"“{lesson.Hook}”")
                            .FontSize(12).FontColor("#A0AEC0").Italic();

                        cover.Item().PaddingTop(24).Text($"Generated for {recipientName}")
                            .FontSize(11).FontColor(Slate400);
                    });

                    // ── Body pages ────────────────────────────────────────────
                    col.Item().Padding(40).Column(body =>
                    {
                        // Greeting
                        body.Item().Background("#F8FAFC").Border(1).BorderColor(Slate200)
                            .Padding(16).Column(g =>
                            {
                                g.Item().Text(t =>
                                {
                                    t.Span($"Hi {recipientName} 👋  ").Bold().FontColor(Slate800);
                                    t.Span("Here is your lesson on ");
                                    t.Span(lesson.Title).Bold().FontColor(Slate800);
                                    t.Span(". Study it, talk about it, and use the exam questions at the end to test yourself.");
                                });
                            });

                        // ── Key Concepts ──────────────────────────────────────
                        SectionHeader(body, $"Key Concepts ({lesson.KeyConcepts.Count})");
                        foreach (var c in lesson.KeyConcepts)
                            ConceptCard(body, c);

                        // ── Glossary ──────────────────────────────────────────
                        SectionHeader(body, "Key Terms");
                        body.Item().Border(1).BorderColor(Slate200).Column(tbl =>
                        {
                            foreach (var g in lesson.Glossary ?? [])
                            {
                                tbl.Item().BorderBottom(1).BorderColor(Slate200).Row(row =>
                                {
                                    row.ConstantItem(140).Background("#F8FAFC").Padding(10)
                                        .Text(g.Term).Bold().FontColor(Blue).FontSize(10);
                                    row.RelativeItem().Padding(10)
                                        .Text(g.Def).FontSize(10).FontColor(Slate700);
                                });
                            }
                        });

                        // ── Misconceptions ────────────────────────────────────
                        SectionHeader(body, "Common Misconceptions");
                        foreach (var m in lesson.Misconceptions ?? [])
                        {
                            body.Item().PaddingBottom(8).Border(1).BorderColor(Slate200)
                                .Background(White).Padding(14).Column(mc =>
                                {
                                    mc.Item().Text($"✕  {m.Wrong}")
                                        .FontColor(Red).FontSize(10).Underline();
                                    mc.Item().PaddingTop(6).Text($"✓  {m.Right}")
                                        .FontColor(Green).FontSize(10).Bold();
                                });
                        }

                        // ── Speak-aloud banner ────────────────────────────────
                        SectionHeader(body, $"Spoken Questions — {(lesson.ExamQuestions ?? []).Count} Questions · Say Answers Out Loud");
                        body.Item().PaddingBottom(16).Background("#FEF3C7").Border(1)
                            .BorderColor("#FCD34D").Padding(16).Row(banner =>
                            {
                                banner.ConstantItem(32).Text("🎤").FontSize(22);
                                banner.RelativeItem().PaddingLeft(8).Column(b =>
                                {
                                    b.Item().Text("The TalkToLearn Method: speak before you peek.")
                                        .Bold().FontColor("#78350F").FontSize(11);
                                    b.Item().PaddingTop(4).Text(
                                        "For each question below, say your answer out loud — in full sentences, " +
                                        "as if explaining to someone else. Only read the model answers at the bottom " +
                                        "after you’ve spoken yours. Talking about it is how you actually learn it.")
                                        .FontColor("#92400E").FontSize(10);
                                });
                            });

                        // Spoken questions
                        foreach (var (q, i) in (lesson.ExamQuestions ?? []).Select((q, i) => (q, i)))
                            QuestionRow(body, $"Q{i + 1}", q, "#7C3AED", "#EDE9FE", isSpoken: true);

                        // ── MC Questions ──────────────────────────────────────
                        SectionHeader(body, $"Multiple Choice — {(lesson.McQuestions ?? []).Count} Questions");
                        body.Item().PaddingBottom(12).Text(
                            "Circle or highlight your answer. Correct answers are shown in green.")
                            .FontSize(10).FontColor(Slate400);

                        foreach (var (q, i) in (lesson.McQuestions ?? []).Select((q, i) => (q, i)))
                        {
                            body.Item().PaddingBottom(8).Border(1).BorderColor(Slate200)
                                .Background(White).Padding(14).Column(mc =>
                                {
                                    mc.Item().Row(r =>
                                    {
                                        r.ConstantItem(42).Background("#FEF3C7").Border(1)
                                            .BorderColor("#FCD34D").Padding(6).AlignCenter()
                                            .Text($"MC{i + 1}").Bold().FontColor(Amber).FontSize(9);
                                        r.RelativeItem().PaddingLeft(10)
                                            .Text(q.Q).FontSize(10).FontColor(Slate700);
                                    });
                                    mc.Item().PaddingTop(8).PaddingLeft(48).Column(opts =>
                                    {
                                        for (int oi = 0; oi < q.Options.Count; oi++)
                                        {
                                            var label = (char)('A' + oi);
                                            opts.Item().Text($"{label})  {q.Options[oi]}")
                                                .FontSize(10).FontColor(Slate500);
                                        }
                                    });
                                });
                        }

                        // ── Answer Key ────────────────────────────────────────
                        body.Item().PaddingTop(32).BorderTop(2).BorderColor(Slate200).PaddingTop(24)
                            .Column(ans =>
                            {
                                ans.Item().Text("Model Answers — Spoken Question Answers")
                                    .FontSize(11).Bold().FontColor(Slate500).LetterSpacing(1);

                                ans.Item().PaddingTop(12).Background("#F1F5F9").Border(1)
                                    .BorderColor(Slate200).Padding(14).Column(warn =>
                                    {
                                        warn.Item().Text("⚠️  Only read these after you’ve answered out loud.")
                                            .Bold().FontColor(Slate500).FontSize(10);
                                        warn.Item().PaddingTop(4).Text(
                                            "These are model answers — not scripts. Your spoken answer doesn’t " +
                                            "have to be word-for-word, but it should cover the same key points. " +
                                            "If you missed something, say the answer out loud again now.")
                                            .FontColor(Slate400).FontSize(9);
                                    });

                                foreach (var (a, i) in (lesson.ExamAnswers ?? []).Select((a, i) => (a, i)))
                                {
                                    ans.Item().PaddingTop(10).BorderBottom(1).BorderColor("#F1F5F9")
                                        .PaddingBottom(10).Row(row =>
                                        {
                                            row.ConstantItem(42).Background("#ECFDF5").Border(1)
                                                .BorderColor("#A7F3D0").Padding(6).AlignCenter()
                                                .Text($"A{i + 1}").Bold().FontColor(Green).FontSize(9);
                                            row.RelativeItem().PaddingLeft(10)
                                                .Text(a).FontColor(Slate400).FontSize(9);
                                        });
                                }

                                // MC answer key
                                ans.Item().PaddingTop(24).Text("Multiple Choice — Answer Key")
                                    .FontSize(10).Bold().FontColor(Slate400);
                                ans.Item().PaddingTop(8).Background("#F1F5F9").Border(1)
                                    .BorderColor(Slate200).Padding(14).Column(mcKey =>
                                    {
                                        mcKey.Item().Text("⚠️  Only check these after you've circled your answers.")
                                            .Bold().FontColor(Slate500).FontSize(10);
                                        var mcList = lesson.McQuestions ?? [];
                                        var keyText = string.Join("   ",
                                            mcList.Select((q, mi) => $"MC{mi + 1}: {(char)('A' + q.Answer)}"));
                                        mcKey.Item().PaddingTop(8).Text(keyText)
                                            .FontSize(10).FontColor(Green).Bold();
                                    });
                            });

                        // ── Footer ────────────────────────────────────────────
                        body.Item().PaddingTop(40).BorderTop(1).BorderColor(Slate200).PaddingTop(20)
                            .AlignCenter().Column(footer =>
                            {
                                footer.Item().AlignCenter().Text("Talk About It. To Understand It.")
                                    .Bold().FontSize(13).FontColor(Slate800);
                                footer.Item().PaddingTop(6).AlignCenter()
                                    .Text("Generated by TalkToLearn — talktolearn.app")
                                    .FontSize(10).FontColor(Slate400);
                                footer.Item().PaddingTop(4).AlignCenter()
                                    .Text("Open the app to talk through this lesson and get scored by AI.")
                                    .FontSize(9).FontColor(Slate400);
                            });
                    });
                });
            });
        }).GeneratePdf();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static void SectionHeader(ColumnDescriptor col, string title) =>
        col.Item().PaddingTop(28).PaddingBottom(12).Text(title.ToUpperInvariant())
            .FontSize(10).Bold().FontColor(Slate400).LetterSpacing(2);

    private static void ConceptCard(ColumnDescriptor col, KeyConceptDto c)
    {
        col.Item().PaddingBottom(10).Border(1).BorderColor(Slate200).Background(White)
            .Padding(18).Column(card =>
            {
                // Header
                card.Item().Row(r =>
                {
                    r.ConstantItem(36).Text(c.Icon).FontSize(22);
                    r.RelativeItem().PaddingLeft(8).AlignMiddle()
                        .Text(c.Title).Bold().FontSize(13).FontColor(Slate800);
                });

                card.Item().PaddingTop(8).Text(c.Body).FontSize(10).FontColor(Slate700);

                if (!string.IsNullOrEmpty(c.DeepDive))
                {
                    card.Item().PaddingTop(12).BorderTop(1).BorderColor("#F1F5F9").PaddingTop(10)
                        .Column(dd =>
                        {
                            dd.Item().Text("DEEP DIVE").FontSize(8).Bold().FontColor(Indigo).LetterSpacing(1);
                            dd.Item().PaddingTop(4).Text(c.DeepDive).FontSize(10).FontColor(Slate700);
                        });
                }

                if (!string.IsNullOrEmpty(c.Example))
                {
                    card.Item().PaddingTop(10).Background("#F8FAFC").Padding(10).Column(ex =>
                    {
                        ex.Item().Text("REAL-WORLD EXAMPLE").FontSize(8).Bold().FontColor(Cyan).LetterSpacing(1);
                        ex.Item().PaddingTop(4).Text(c.Example).FontSize(10).FontColor(Slate700);
                    });
                }

                if (!string.IsNullOrEmpty(c.CodeSnippet))
                {
                    card.Item().PaddingTop(10).Background(Dark).Padding(12).Column(code =>
                    {
                        code.Item().Text("CODE EXAMPLE").FontSize(8).Bold().FontColor(Slate400).LetterSpacing(1);
                        code.Item().PaddingTop(6).Text(c.CodeSnippet)
                            .FontFamily("Courier New").FontSize(8).FontColor("#A8D8A8");
                    });
                }

                if (!string.IsNullOrEmpty(c.MemoryHook))
                {
                    card.Item().PaddingTop(10).Background("#EEF2FF").Border(1)
                        .BorderColor("#C7D2FE").Padding(10).Column(mh =>
                        {
                            mh.Item().Text("MEMORY HOOK").FontSize(8).Bold().FontColor(Indigo).LetterSpacing(1);
                            mh.Item().PaddingTop(4).Text(c.MemoryHook)
                                .FontSize(10).Bold().FontColor("#4F46E5");
                        });
                }

                if (!string.IsNullOrEmpty(c.ExamTrap))
                {
                    card.Item().PaddingTop(10).Background("#FFF5F5").Border(1)
                        .BorderColor("#FED7D7").Padding(10).Column(et =>
                        {
                            et.Item().Text("EXAM TRAP").FontSize(8).Bold().FontColor(Red).LetterSpacing(1);
                            et.Item().PaddingTop(4).Text(c.ExamTrap).FontSize(10).FontColor(Slate700);
                        });
                }
            });
    }

    private static void QuestionRow(ColumnDescriptor col, string label, string text,
        string badgeColor, string badgeBg, bool isSpoken = false)
    {
        col.Item().PaddingBottom(8).Border(1).BorderColor(Slate200).Background(White)
            .Padding(14).Row(row =>
            {
                row.ConstantItem(42).Background(badgeBg).Border(1).BorderColor(badgeColor)
                    .Padding(6).AlignCenter()
                    .Text(label).Bold().FontColor(badgeColor).FontSize(9);
                row.RelativeItem().PaddingLeft(10).Column(q =>
                {
                    q.Item().Text(text).FontSize(10).FontColor(Slate700);
                    if (isSpoken)
                        q.Item().PaddingTop(4).Text("Say your answer out loud before reading the model answer.")
                            .FontSize(9).FontColor(Indigo).Italic();
                });
            });
    }

    // QuestPDF doesn't support rgba — approximate with a near-match solid
    private static string IndigoWithAlpha() => "#1E1B4B";
}
