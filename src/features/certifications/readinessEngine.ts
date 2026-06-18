/* ══════════════════════════════════════════════════════════════
   READINESS ENGINE — Phase 7
   Computes certification readiness from mastery data across
   all linked cards, notes, and book chapters.
   ══════════════════════════════════════════════════════════════ */

import type { Certification, ChapterRef } from "./certificationsStore";
import type { CognitiveCardData, Concept } from "../cards/types";

// ── Output type ────────────────────────────────────────────────────

export interface ReadinessResult {
  readinessScore:       number;        // 0–100
  weakConcepts:         Concept[];
  strongConcepts:       Concept[];
  recommendedChapters:  ChapterRef[];
  recommendedCards:     string[];
  predictedExamScore:   number;        // 0–100
  sectionScores:        SectionScore[];
  totalConcepts:        number;
  testedConcepts:       number;
  masteredConcepts:     number;
}

export interface SectionScore {
  sectionId:    string;
  sectionTitle: string;
  score:        number;     // 0–100
  chapterCount: number;
  testedCount:  number;
}

// ── Constants ──────────────────────────────────────────────────────

const MASTERY_WEIGHT   = 0.50;
const RECENCY_WEIGHT   = 0.20;
const STREAK_WEIGHT    = 0.15;
const COVERAGE_WEIGHT  = 0.15;

const MASTERY_THRESHOLD_STRONG = 75;
const MASTERY_THRESHOLD_WEAK   = 45;
const DAYS_MS                  = 24 * 60 * 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────────

function recencyFactor(lastTested: Date | null): number {
  if (!lastTested) return 0;
  const daysSince = (Date.now() - lastTested.getTime()) / DAYS_MS;
  if (daysSince < 1)  return 1.0;
  if (daysSince < 3)  return 0.9;
  if (daysSince < 7)  return 0.75;
  if (daysSince < 14) return 0.55;
  if (daysSince < 30) return 0.35;
  return 0.15;
}

function streakFactor(streak: number): number {
  if (streak >= 7) return 1.0;
  if (streak >= 3) return 0.75;
  if (streak >= 1) return 0.5;
  return 0.2;
}

// ── Main engine ────────────────────────────────────────────────────

export function computeReadiness(
  cert: Certification,
  cards: CognitiveCardData[],
): ReadinessResult {
  // Index cards by id
  const cardMap = new Map<string, CognitiveCardData>(cards.map(c => [c.id, c]));

  // Collect all ChapterRefs that link to cards we have mastery data for
  const allRefs: ChapterRef[] = cert.syllabus.flatMap(s => s.chapters);
  const linkedCards: CognitiveCardData[] = [];

  for (const ref of allRefs) {
    // For card refs: direct lookup
    if (ref.sourceType === "card") {
      const c = cardMap.get(ref.sourceId);
      if (c) linkedCards.push(c);
    }
    // For book/note refs: look up by ai.generatedFrom pattern
    else {
      const source = ref.sourceType === "book"
        ? `${ref.sourceId}/${ref.chapterId}`
        : ref.sourceId;
      const c = cards.find(cd => cd.ai?.generatedFrom === source || cd.id === ref.sourceId);
      if (c) linkedCards.push(c);
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const uniqueCards = linkedCards.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  // Score per card
  type CardScore = { card: CognitiveCardData; composite: number };
  const cardScores: CardScore[] = uniqueCards.map(card => {
    const m = card.mastery;
    const masteryNorm = m.score / 100;
    const recency     = m.attempts > 0 ? recencyFactor(m.lastTested) : 0;
    const streak      = streakFactor(m.streak);
    const coverage    = m.attempts > 0 ? 1 : 0;

    const composite =
      masteryNorm * MASTERY_WEIGHT +
      recency     * RECENCY_WEIGHT +
      streak      * STREAK_WEIGHT  +
      coverage    * COVERAGE_WEIGHT;

    return { card, composite };
  });

  // If no cards linked yet, use a moderate mock baseline
  const rawReadiness = cardScores.length === 0
    ? 32   // some base score — nothing studied yet
    : Math.round(cardScores.reduce((s, cs) => s + cs.composite, 0) / cardScores.length * 100);

  const readinessScore = Math.min(100, Math.max(0, rawReadiness));

  // Concepts
  const allConcepts: Concept[] = uniqueCards.flatMap(c => c.concepts ?? []);
  const testedCards  = uniqueCards.filter(c => c.mastery.attempts > 0);

  const weakConcepts: Concept[]   = [];
  const strongConcepts: Concept[] = [];

  for (const cs of cardScores) {
    for (const concept of cs.card.concepts ?? []) {
      const mastery = cs.card.mastery.score;
      if (mastery < MASTERY_THRESHOLD_WEAK) {
        weakConcepts.push(concept);
      } else if (mastery >= MASTERY_THRESHOLD_STRONG) {
        strongConcepts.push(concept);
      }
    }
  }

  // Recommended chapters: sections/chapters with lowest per-card score
  const LOW_THRESHOLD = 0.45;
  const recommendedChapters: ChapterRef[] = allRefs.filter(ref => {
    if (ref.sourceType !== "card") return true; // unlinked = always recommend
    const card = cardMap.get(ref.sourceId);
    if (!card) return true;
    return (card.mastery.score / 100) < LOW_THRESHOLD;
  }).slice(0, 4);

  const recommendedCards = cardScores
    .filter(cs => cs.composite < 0.5)
    .sort((a, b) => a.composite - b.composite)
    .slice(0, 3)
    .map(cs => cs.card.id);

  // Predicted exam score: readiness × 0.9 (exam harder than self-test)
  const predictedExamScore = Math.round(readinessScore * 0.88);

  // Per-section scores
  const sectionScores: SectionScore[] = cert.syllabus.map(sec => {
    const secCards = sec.chapters
      .filter(ref => ref.sourceType === "card")
      .map(ref => cardMap.get(ref.sourceId))
      .filter(Boolean) as CognitiveCardData[];

    const secScore = secCards.length === 0
      ? 30
      : Math.round(secCards.reduce((s, c) => s + c.mastery.score, 0) / secCards.length);

    return {
      sectionId:    sec.id,
      sectionTitle: sec.title,
      score:        secScore,
      chapterCount: sec.chapters.length,
      testedCount:  sec.chapters.filter(ref => {
        const c = cardMap.get(ref.sourceId);
        return c && c.mastery.attempts > 0;
      }).length,
    };
  });

  return {
    readinessScore,
    weakConcepts:        weakConcepts.slice(0, 8),
    strongConcepts:      strongConcepts.slice(0, 6),
    recommendedChapters,
    recommendedCards,
    predictedExamScore,
    sectionScores,
    totalConcepts:     allConcepts.length,
    testedConcepts:    testedCards.flatMap(c => c.concepts).length,
    masteredConcepts:  strongConcepts.length,
  };
}
