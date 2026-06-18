/* ══════════════════════════════════════════════════════════════
   BOOK PIPELINE — Phase 6
   Mock async functions simulating PDF extraction + AI analysis.
   All return Promises; swap for real API calls in a future phase.
   ══════════════════════════════════════════════════════════════ */

import type { Concept } from "../cards/types";

// ── PDF metadata extraction ───────────────────────────────────────

export interface PdfMetadata {
  title:     string;
  author:    string;
  pageCount: number;
}

export async function extractPdfMetadataMock(fileName: string): Promise<PdfMetadata> {
  await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  return {
    title:     base || "Imported Book",
    author:    "Unknown Author",
    pageCount: 180 + Math.floor(Math.random() * 220),
  };
}

// ── Chapter extraction ────────────────────────────────────────────

export async function extractChaptersMock(
  _fileName: string,
  pageCount: number,
): Promise<Array<{ id: string; title: string; pageStart: number; pageEnd: number }>> {
  await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));

  const chapterTitles = [
    "Introduction",
    "Core Concepts",
    "Practical Patterns",
    "Advanced Techniques",
    "Performance & Optimisation",
    "Testing & Quality",
    "Architecture Decisions",
    "Conclusion",
  ];

  const count    = 4 + Math.floor(Math.random() * 4); // 4–7 chapters
  const perChapter = Math.floor(pageCount / count);

  return chapterTitles.slice(0, count).map((title, i) => ({
    id:        `imported-ch${i + 1}`,
    title,
    pageStart: i * perChapter + 1,
    pageEnd:   i === count - 1 ? pageCount : (i + 1) * perChapter,
  }));
}

// ── Chapter text extraction ───────────────────────────────────────

const TEXT_TEMPLATES: string[] = [
  `Chapter Overview

This chapter examines **{title}** in depth, covering both theory and practical application.

**Core principle:** Every complex system can be decomposed into a set of simpler, well-defined components that interact through clean interfaces.

Key ideas covered:
- The fundamental abstraction underlying the topic
- How components interact and depend on each other
- Common failure modes and how to avoid them
- Patterns that emerge repeatedly across different contexts

**Important distinction:** There is a significant difference between understanding a concept intellectually and being able to apply it under pressure. This chapter bridges that gap with worked examples.

The material here builds directly on the preceding chapter and forms the foundation for what follows. Pay special attention to the definitions — many errors in practice stem from imprecise understanding of the core terms.`,

  `Foundations and Definitions

Before we can apply **{title}** effectively, we need precise definitions.

**Definition 1:** [Core term] refers to the property by which a system component encapsulates its internal state, exposing only the operations that external actors need.

**Definition 2:** [Secondary term] is the mechanism by which two components can exchange information without either depending on the internal structure of the other.

Key principles:
- Separation of concerns: each component has one well-defined responsibility
- High cohesion: related behaviour stays together
- Low coupling: components depend on abstractions, not concrete implementations
- Explicit interfaces: all interaction happens through defined contracts

Common mistakes:
- Conflating interface with implementation
- Allowing state to leak across component boundaries
- Coupling concrete types when abstractions would suffice

The worked examples in section 3 demonstrate each principle in a realistic context.`,

  `Patterns and Practices

**{title}** gives rise to a set of recurring patterns that appear across different domains and languages.

**Pattern 1 — The Strategy Pattern**
Define a family of algorithms, encapsulate each, and make them interchangeable.
Use when: you need to swap behaviour at runtime without changing the client.

**Pattern 2 — The Observer Pattern**
Define a one-to-many dependency so that when one object changes state, all dependents are notified automatically.
Use when: changes in one component must automatically propagate to others.

**Pattern 3 — The Command Pattern**
Encapsulate a request as an object, allowing parameterisation, queuing, logging, and undoable operations.
Use when: you need to decouple the sender from the receiver.

Best practices:
- Favour composition over inheritance
- Program to interfaces, not concrete implementations
- Apply the Open/Closed Principle: open for extension, closed for modification
- Keep it simple — don't over-engineer with patterns where a simple function suffices`,
];

export async function extractChapterTextMock(
  bookId: string,
  chapterId: string,
  chapterTitle: string,
): Promise<string> {
  await new Promise(r => setTimeout(r, 1600 + Math.random() * 800));
  const idx  = (bookId.length + chapterId.length) % TEXT_TEMPLATES.length;
  return TEXT_TEMPLATES[idx].replace(/\{title\}/g, chapterTitle);
}

// ── Summary generation ────────────────────────────────────────────

export async function generateChapterSummaryMock(
  text: string,
  chapterTitle: string,
): Promise<string> {
  await new Promise(r => setTimeout(r, 1100 + Math.random() * 700));

  const wordCount  = text.split(/\s+/).length;
  const boldTerms  = text.match(/\*\*([^*]+)\*\*/g)?.map(b => b.replace(/\*\*/g, "")).slice(0, 3) ?? [];
  const termPhrase = boldTerms.length ? boldTerms.map(t => `**${t}**`).join(", ") : "the core concepts";

  return `**${chapterTitle}** presents a structured analysis of ${termPhrase} and their practical implications.\n\n` +
    `The chapter (${wordCount} words) opens by establishing precise definitions — a critical step, since many practitioner errors stem from imprecise terminology. It then moves through increasingly complex applications, each building on the last.\n\n` +
    `**Key takeaways:** The material emphasises that understanding a concept intellectually is not the same as being able to apply it under time pressure. Spaced repetition and active recall — exactly what Cognitive Cards are designed for — are the recommended study approach.\n\n` +
    `Use the Concepts tab to extract testable knowledge points, then create a Cognitive Card to begin active recall practice on this chapter.`;
}

// ── Concept extraction ────────────────────────────────────────────

export async function extractChapterConceptsMock(
  text: string,
  chapterId: string,
): Promise<Concept[]> {
  await new Promise(r => setTimeout(r, 1400 + Math.random() * 600));

  // Mine headings and bold terms as concept seeds
  const headings = text.match(/^#{1,3}\s+(.+)$/mg)?.map(h => h.replace(/^#+\s*/, "")) ?? [];
  const bold     = text.match(/\*\*([^*]{10,80})\*\*/g)?.map(b => b.replace(/\*\*/g, "")) ?? [];
  const bullets  = text.match(/^[-•]\s+(.{15,90})$/mg)?.map(b => b.replace(/^[-•]\s+/, "").trim()) ?? [];

  const seeds  = [...new Set([...bold, ...bullets, ...headings])].filter(s => s.length > 12 && s.length < 110);
  const picked = seeds.slice(0, 5);

  const fallbacks = [
    "Core abstraction encapsulates state and exposes only what external actors need",
    "Separation of concerns ensures each component has one well-defined responsibility",
    "Low coupling between components allows independent change and testing",
    "Programming to interfaces rather than concrete implementations improves flexibility",
  ];

  const final = picked.length >= 3 ? picked : [...picked, ...fallbacks].slice(0, 4);

  return final.map((text, i) => ({
    id:          `${chapterId}-bc-${i}`,
    text:        text.length > 100 ? text.slice(0, 97) + "…" : text,
    keywords:    text.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 4),
    difficulty:  (2 + (i % 2)) as 2 | 3,
    weight:      1 + (i < 2 ? 0.5 : 0),
    aiGenerated: true,
    order:       i + 1,
  }));
}