/* ══════════════════════════════════════════════════════════════
   MOCK OCR + AI EXTRACTION — Phase 5
   All functions return Promises to simulate async AI calls.
   Swap for real API calls in a future phase.
   ══════════════════════════════════════════════════════════════ */

import type { Concept } from "../cards/types";

// ── Mock OCR ──────────────────────────────────────────────────────

const OCR_SAMPLES: Record<string, string> = {
  pdf: `[PDF extracted — page 1 of 3]

## Module Overview

This document covers core principles of the topic with worked examples.
Key terms are highlighted in bold throughout.

**Definition:** A reusable abstraction that encapsulates state and behaviour,
exposing a clean interface to the consumer.

Key points:
- Encapsulation hides implementation details
- Composition builds complex structures from simple parts
- Separation of concerns keeps modules focused and testable

See appendix A for worked examples and practice problems.`,

  image: `[Image scan — handwritten notes detected]

Key concepts from today's lecture:

1. Core abstraction — hide implementation,
   expose clean interface

2. Single responsibility — one module = one job
   (makes testing 10x easier)

3. Dependency injection → don't hardcode deps,
   pass them in → testable + swappable

4. Open/Closed principle:
   open for extension, closed for modification

TODO: review slides on composition vs inheritance`,

  default: `[Extracted text]

Study notes extracted from your document.

Key topics identified:
- Core concept definitions
- Implementation patterns
- Common mistakes to avoid
- Best practices and trade-offs

This content has been extracted and is ready for review.
Edit the text below before saving as a note.`,
};

export async function extractTextMock(fileName: string): Promise<string> {
  await new Promise(r => setTimeout(r, 1800 + Math.random() * 800));
  if (fileName.endsWith(".pdf"))   return OCR_SAMPLES.pdf;
  if (/\.(jpg|jpeg|png|webp)$/i.test(fileName)) return OCR_SAMPLES.image;
  return OCR_SAMPLES.default;
}

// ── Mock AI summary ───────────────────────────────────────────────

export async function generateSummaryMock(content: string): Promise<string> {
  await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));

  // Generate a plausible summary based on the first ~200 chars of content
  const firstLine = content.split("\n").find(l => l.trim().length > 20)?.trim() ?? "This topic";
  const wordCount = content.split(/\s+/).length;

  return `This note covers ${firstLine.replace(/^#+\s*/, "").toLowerCase()} and related concepts. ` +
    `The content (${wordCount} words) has been analysed by P1 Agent and summarised below.\n\n` +
    `**Key themes identified:** encapsulation, reusability, and separation of concerns. ` +
    `The notes follow a structured format with definitions, examples, and practical patterns. ` +
    `Review the Concepts tab to see extracted testable knowledge points, and use "Create Card" ` +
    `to convert this note into a Cognitive Card for active recall testing.`;
}

// ── Mock concept extraction ───────────────────────────────────────

export async function extractConceptsMock(content: string, noteId: string): Promise<Concept[]> {
  await new Promise(r => setTimeout(r, 1500 + Math.random() * 800));

  // Extract headings and bold text as concept seeds
  const headings = content.match(/^#{1,3}\s+(.+)$/mg)?.map(h => h.replace(/^#+\s*/, "")) ?? [];
  const bold     = content.match(/\*\*([^*]+)\*\*/g)?.map(b => b.replace(/\*\*/g, "")) ?? [];
  const bullets  = content.match(/^[-•]\s+(.{20,80})$/mg)?.map(b => b.replace(/^[-•]\s+/, "").trim()) ?? [];

  const seeds = [...headings, ...bold, ...bullets].filter(s => s.length > 10 && s.length < 120);
  const unique = [...new Set(seeds)].slice(0, 6);

  // Ensure we always return at least 3 concepts
  const fallbacks = [
    "Core abstraction hides implementation details behind a clean interface",
    "Encapsulation groups related state and behaviour into cohesive units",
    "Composition builds complex structures from simple, testable parts",
  ];

  const conceptSeeds = unique.length >= 3 ? unique : [...unique, ...fallbacks].slice(0, 4);

  return conceptSeeds.map((text, i) => ({
    id:          `${noteId}-ec-${i}`,
    text:        text.length > 100 ? text.slice(0, 97) + "…" : text,
    keywords:    text.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 4),
    difficulty:  (2 + (i % 2)) as 2 | 3,
    weight:      1 + (i === 0 ? 0.5 : 0),
    aiGenerated: true,
    order:       i + 1,
  }));
}
