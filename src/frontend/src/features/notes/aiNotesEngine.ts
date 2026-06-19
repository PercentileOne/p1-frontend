/* ══════════════════════════════════════════════════════════════
   AI NOTES ENGINE — Phase 12
   Stateless transform functions. All async, all simulatable.
   Swap setTimeout bodies for real LLM calls in Phase 13+.
   ══════════════════════════════════════════════════════════════ */

import type { Note }    from "./notesStore";
import type { Concept } from "../cards/types";

// ── Subject detection ─────────────────────────────────────────────

const SUBJECT_KEYWORDS: Record<string, string[]> = {
  "Computer Science":     ["algorithm", "function", "variable", "loop", "array", "class", "typescript", "javascript", "react", "database", "binary", "sorting", "recursion"],
  "Mathematics":          ["equation", "derivative", "integral", "matrix", "proof", "theorem", "quadratic", "algebra", "calculus", "trigonometry", "polynomial"],
  "Biology":              ["cell", "dna", "protein", "organism", "evolution", "photosynthesis", "genetics", "mitosis", "enzyme", "chloroplast", "membrane"],
  "Chemistry":            ["element", "bond", "molecule", "reaction", "acid", "base", "electron", "ion", "oxidation", "reduction", "periodic"],
  "Physics":              ["force", "energy", "momentum", "velocity", "gravity", "wave", "electron", "quantum", "thermodynamics", "relativity"],
  "History":              ["century", "war", "revolution", "empire", "treaty", "political", "economic", "colonial", "parliament", "reformation"],
  "English Literature":   ["character", "theme", "metaphor", "protagonist", "narrative", "symbolism", "conflict", "analysis", "poet", "stanza"],
  "Economics":            ["supply", "demand", "market", "inflation", "gdp", "fiscal", "monetary", "elasticity", "equilibrium", "marginal"],
  "Psychology":           ["behaviour", "cognition", "memory", "learning", "perception", "emotion", "neuroscience", "stimulus", "response", "attachment"],
  "Frontend Engineering": ["component", "hook", "state", "render", "vite", "tailwind", "animation", "framer", "css", "html", "dom", "event"],
};

export function detectSubject(text: string): string {
  const lower = text.toLowerCase();
  let best = { subject: "General", score: 0 };
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > best.score) best = { subject, score };
  }
  return best.subject;
}

// ── Structured expansion ──────────────────────────────────────────

async function delay(ms: number) { await new Promise(r => setTimeout(r, ms)); }

function buildStructuredNote(opts: {
  title:   string;
  subject: string;
  content: string;
  voice?:  string;
  ocr?:    string;
  mode:    "standard" | "lecture";
}): string {
  const { title, subject, content, voice, ocr, mode } = opts;
  const combined = [content, voice && `[Voice] ${voice}`, ocr && `[OCR] ${ocr}`]
    .filter(Boolean).join("\n\n");

  // Derive key bullet points from input
  const lines = combined
    .split(/\n+/)
    .map(l => l.replace(/^[-•*]\s*/, "").replace(/^#+\s*/, "").trim())
    .filter(l => l.length > 8 && !l.startsWith("["))
    .slice(0, 10);

  const keyPoints = lines.length > 0 ? lines : [
    `Core principles of ${subject}`,
    `Key definitions and terminology`,
    `Practical applications and examples`,
  ];

  if (mode === "lecture") {
    return `# ${title}
**Subject:** ${subject}
*Reconstructed from your notes, voice, and captured content by P1 AI*

---

## Overview

This lecture covers the essential concepts of **${title}**. By the end of this session, you should be able to define the core terminology, explain the underlying mechanisms, and apply this knowledge to practical problems in ${subject}.

---

## Key Ideas

${keyPoints.map((p, i) => `**${i + 1}. ${p.charAt(0).toUpperCase() + p.slice(1)}**
Understanding this concept is fundamental to mastering ${subject}. It connects directly to the wider framework of knowledge in this area and frequently appears in examinations and applied scenarios.
`).join("\n")}

---

## Definitions

The following terms are central to this topic and must be understood precisely:

${keyPoints.slice(0, 4).map(p => {
  const term = p.split(" ").slice(0, 3).join(" ");
  return `- **${term}**: A core concept in ${subject} relating to ${p.toLowerCase()}.`;
}).join("\n")}

---

## Examples

${keyPoints.slice(0, 3).map((p, i) => `**Example ${i + 1}:** ${p}

In practice, this means that when we encounter ${p.toLowerCase()}, we apply the principles covered in this topic. Real-world scenarios include everything from academic assessments to professional practice in ${subject}.
`).join("\n")}

---

## Diagrams and Visual Aids

*Conceptual model: Input flows through the core process to produce Output. A feedback loop refines the input at each stage. Sketch your own diagram from class notes here.*

---

## Summary

**${title}** is a key topic in ${subject}. The main takeaways are:

${keyPoints.slice(0, 5).map(p => `- ${p}`).join("\n")}

Review these points before your next session. Connect them to previous topics and ensure you can explain each concept in your own words.`;
  }

  // Standard structured note
  return `# ${title}
**Subject:** ${subject}
*Enhanced by P1 AI Notes Engine*

---

## Overview

${keyPoints.slice(0, 2).map(p => p).join(". ")}. This forms the foundation of understanding in ${subject} for this topic area.

## Core Concepts

${keyPoints.slice(0, 6).map((p, i) => `### ${i + 1}. ${p.charAt(0).toUpperCase() + p.slice(1)}

${p} is an important aspect of this topic. When studying this area, pay particular attention to how it connects to the broader themes of **${subject}** and how it might be assessed or applied.
`).join("\n")}

## Key Definitions

${keyPoints.slice(0, 4).map(p => {
  const term = p.split(" ").slice(0, 3).join(" ");
  return `- **${term}** — ${p}`;
}).join("\n")}

## Examples and Applications

- ${keyPoints[0] ?? "Core example from the content"}: Applied in real-world ${subject} contexts
- ${keyPoints[1] ?? "Secondary example"}: Common exam question focus area

## Summary

The key points from this topic are:

${keyPoints.slice(0, 5).map(p => `✓ ${p}`).join("\n")}

*Tip: Review these concepts actively by testing yourself rather than re-reading passively.*`;
}

// ── Public API ────────────────────────────────────────────────────

export type GenerateMode = "title" | "subject" | "content" | "all" | "lecture";

export interface GenerateResult {
  aiGeneratedContent: string;
  detectedSubject:    string;
}

export async function generate(
  note: Pick<Note, "title" | "subject" | "content" | "voiceTranscript" | "ocrText">,
  mode: GenerateMode = "all",
): Promise<GenerateResult> {
  // Simulate LLM latency
  const stepDelays: Record<GenerateMode, number> = {
    title:   900,
    subject: 800,
    content: 1400,
    all:     1800,
    lecture: 2200,
  };
  await delay(stepDelays[mode]);

  const subject = note.subject || detectSubject(note.content + " " + note.title);

  const content = buildStructuredNote({
    title:   note.title || "Untitled Note",
    subject,
    content: note.content,
    voice:   note.voiceTranscript,
    ocr:     note.ocrText,
    mode:    mode === "lecture" ? "lecture" : "standard",
  });

  return { aiGeneratedContent: content, detectedSubject: subject };
}

export async function extractConcepts(aiGeneratedContent: string): Promise<Concept[]> {
  await delay(700);

  // Pull bold-wrapped terms from the content as concepts
  const boldMatches = [...aiGeneratedContent.matchAll(/\*\*([^*]{4,60})\*\*/g)].map(m => m[1]);
  const headingMatches = [...aiGeneratedContent.matchAll(/^#{2,3}\s+(.+)$/gm)].map(m => m[1].replace(/^\d+\.\s+/, ""));

  const rawConcepts = [...new Set([...headingMatches, ...boldMatches])].slice(0, 8);

  return rawConcepts.map((text, i) => ({
    id:          `ai-c-${Date.now()}-${i}`,
    text,
    keywords:    text.toLowerCase().split(/\s+/).filter(w => w.length > 3),
    difficulty:  Math.ceil(Math.random() * 3) + 1,
    weight:      1 + Math.random(),
    aiGenerated: true,
    order:       i + 1,
  }));
}

export async function generateCard(note: Pick<Note, "id" | "title" | "subject" | "aiGeneratedContent">): Promise<string> {
  await delay(500);
  // In prod: call cardsStore.addCard with concepts. Return mock id for now.
  return `card-ai-${note.id}-${Date.now()}`;
}

export async function generateLearnMode(aiGeneratedContent: string): Promise<{ sections: string[] }> {
  await delay(600);
  const sections = aiGeneratedContent
    .split(/^#{2}/m)
    .map(s => s.trim())
    .filter(s => s.length > 20)
    .slice(0, 6);
  return { sections };
}

export async function generateTest(concepts: Concept[]): Promise<{ questions: { q: string; answer: string }[] }> {
  await delay(800);
  const questions = concepts.slice(0, 5).map(c => ({
    q:      `Explain the concept: "${c.text}"`,
    answer: c.text,
  }));
  return { questions };
}

// ── Pipeline ──────────────────────────────────────────────────────

export type PipelineStep =
  | "detecting"
  | "expanding"
  | "structuring"
  | "concepts"
  | "card"
  | "done";

export const PIPELINE_LABELS: Record<PipelineStep, string> = {
  detecting:   "Detecting subject…",
  expanding:   "Expanding your notes…",
  structuring: "Structuring content…",
  concepts:    "Extracting concepts…",
  card:        "Generating card…",
  done:        "Done!",
};
