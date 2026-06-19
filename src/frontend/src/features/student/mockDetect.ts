/* ══════════════════════════════════════════════════════════════
   MOCK DETECTION FUNCTIONS — Phase 9
   Simulates OCR, subject detection, topic detection, AI summary
   and concept extraction from student notes / homework photos.
   ══════════════════════════════════════════════════════════════ */

import type { Concept } from "../cards/types";

// ── Subject detection ──────────────────────────────────────────────

const SUBJECT_KEYWORDS: Record<string, string[]> = {
  "subj-maths":   ["quadratic", "algebra", "equation", "trigonometry", "probability", "statistics", "vector", "surd", "circle", "geometry", "gradient", "differentiation"],
  "subj-english": ["macbeth", "shakespeare", "poem", "poetry", "inspector", "priestly", "quote", "language", "literature", "theme", "character", "analysis", "metaphor"],
  "subj-biology": ["cell", "dna", "mitosis", "osmosis", "enzyme", "photosynthesis", "evolution", "genetics", "ecosystem", "organ", "tissue", "respiration"],
  "subj-cs":      ["algorithm", "function", "variable", "loop", "array", "binary", "network", "boolean", "programming", "python", "code", "database", "sorting"],
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  "maths-t1": ["algebra","quadratic","indices","surd","sequence","series","equation","expression"],
  "maths-t2": ["probability","statistics","data","mean","median","mode","distribution","histogram"],
  "maths-t3": ["geometry","trigonometry","circle","vector","angle","area","volume","theorem"],
  "eng-t1":   ["macbeth","lady macbeth","witches","ambition","power","shakespeare","act","scene"],
  "eng-t2":   ["poem","poetry","conflict","power","ozymandias","bayonet","comparison","quote"],
  "eng-t3":   ["inspector","goole","birling","sheila","eva smith","class","responsibility","priestly"],
  "bio-t1":   ["cell","mitosis","membrane","diffusion","osmosis","active transport","nucleus","organelle"],
  "bio-t2":   ["dna","gene","chromosome","inheritance","natural selection","mutation","evolution","genetic"],
  "bio-t3":   ["ecosystem","food chain","biodiversity","habitat","population","carbon cycle","ecology"],
  "cs-t1":    ["variable","function","loop","iteration","selection","subroutine","parameter","return"],
  "cs-t2":    ["algorithm","sort","search","bubble","binary","array","list","stack","queue"],
  "cs-t3":    ["binary","hexadecimal","logic gate","boolean","network","tcp","ip","protocol"],
};

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function ocrExtractMock(fileName: string): Promise<string> {
  await delay(1400 + Math.random() * 800);
  const templates = [
    `Class Notes — ${fileName.replace(/\.[^.]+$/, "")}\n\nKey terms from today's lesson:\n- Main concept explained with examples\n- Second important idea with diagram reference\n- Third concept linking to previous knowledge\n\nHomework: Complete questions 1–5 on page 47.`,
    `Homework Sheet — ${fileName.replace(/\.[^.]+$/, "")}\n\nAnswer all questions. Show all working.\n\n1. Explain the main concept in your own words.\n2. Give two examples of where this is applied.\n3. How does this relate to what we covered last week?\n4. Challenge: Can you think of an exception or limitation?`,
    `Revision Notes\n\nTopic: ${fileName.replace(/\.[^.]+$/, "")}\n\nDefinitions:\n- Term 1: the property by which...\n- Term 2: the process of...\n\nKey facts to remember:\n• Important point one — always applies when...\n• Important point two — except when...\n• Important point three — related to...`,
  ];
  const idx = Math.floor(Math.random() * templates.length);
  return templates[idx];
}

export async function detectSubjectMock(text: string): Promise<{ subjectId: string; confidence: number }> {
  await delay(600 + Math.random() * 400);
  const lower = text.toLowerCase();
  let best = { subjectId: "subj-maths", confidence: 30 };
  for (const [subjectId, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    const hits = keywords.filter(kw => lower.includes(kw)).length;
    const confidence = Math.min(95, 30 + hits * 15);
    if (confidence > best.confidence) best = { subjectId, confidence };
  }
  return best;
}

export async function detectTopicMock(text: string, subjectId: string): Promise<{ topicId: string; confidence: number }> {
  await delay(500 + Math.random() * 300);
  const lower = text.toLowerCase();
  const prefix = subjectId.replace("subj-", "");
  const relevantTopics = Object.entries(TOPIC_KEYWORDS).filter(([id]) => id.startsWith(prefix));
  let best = { topicId: relevantTopics[0]?.[0] ?? "", confidence: 30 };
  for (const [topicId, keywords] of relevantTopics) {
    const hits = keywords.filter(kw => lower.includes(kw)).length;
    const confidence = Math.min(95, 30 + hits * 18);
    if (confidence > best.confidence) best = { topicId, confidence };
  }
  return best;
}

export async function generateSummaryFromNotesMock(text: string, subjectName: string): Promise<string> {
  await delay(1100 + Math.random() * 700);
  const lines = text.split("\n").filter(l => l.trim().length > 10);
  const firstLine = lines[0]?.trim() ?? "class notes";
  const wordCount = text.split(/\s+/).length;
  return `**${subjectName} — ${firstLine}**\n\nThese notes cover the key ideas from today's lesson. ` +
    `The material (${wordCount} words) introduces the core concepts and their practical applications.\n\n` +
    `**Key takeaway:** Understanding these ideas deeply — not just remembering them — is what separates top grades. ` +
    `Use the Concepts tab to create a Cognitive Card and begin active recall practice.`;
}

export async function extractConceptsFromNotesMock(text: string, sourceId: string): Promise<Concept[]> {
  await delay(1000 + Math.random() * 600);
  const bold    = text.match(/\*\*([^*]{8,70})\*\*/g)?.map(b => b.replace(/\*\*/g, "")) ?? [];
  const bullets = text.match(/^[-•·]\s+(.{10,80})$/mg)?.map(b => b.replace(/^[-•·]\s+/, "").trim()) ?? [];
  const lines   = text.split(/\n+/).filter(l => l.length > 15 && l.length < 100 && /[A-Za-z]{4}/.test(l)).slice(0, 4);

  const seeds = [...new Set([...bold, ...bullets, ...lines])].filter(s => s.length > 10).slice(0, 5);

  const fallbacks = [
    "Core concept defines the fundamental relationship between cause and effect in this topic",
    "Key process follows a sequence of steps that can be applied systematically",
    "Important distinction between similar terms prevents common errors in exam answers",
    "Application to real-world contexts demonstrates deep understanding of the material",
  ];

  const final = seeds.length >= 2 ? seeds : [...seeds, ...fallbacks].slice(0, 4);

  return final.map((txt, i) => ({
    id:          `${sourceId}-nc-${i}`,
    text:        txt.length > 100 ? txt.slice(0, 97) + "…" : txt,
    keywords:    txt.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 4),
    difficulty:  (2 + (i % 3)) as 2 | 3 | 4,
    weight:      1 + (i === 0 ? 0.4 : 0),
    aiGenerated: true,
    order:       i + 1,
  }));
}
