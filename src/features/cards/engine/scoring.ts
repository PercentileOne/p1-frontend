/* ══════════════════════════════════════════════════════════════
   SCORING ENGINE — Document 4 §3
   Score = (WeightedHits/TotalWeight × 100) × DiffMulti
           × SpeedBonus × AccuracyBonus × StreakBonus
           − MisconceptionPenalty
   ══════════════════════════════════════════════════════════════ */

import type { Concept, ScoreBreakdown } from "../types";

const DIFF_MULTIPLIERS = [0, 1.0, 1.1, 1.25, 1.4, 1.6] as const;

function grade(score: number): ScoreBreakdown["grade"] {
  if (score >= 95) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

function gradeAccent(g: ScoreBreakdown["grade"]): string {
  return { S: "text-amber-400", A: "text-emerald-400", B: "text-sky-400", C: "text-violet-400", D: "text-rose-400" }[g];
}

function verdict(score: number): string {
  if (score >= 95) return "Perfect recall — flawless";
  if (score >= 80) return "Strong — mastery confirmed";
  if (score >= 65) return "Good — a few gaps remain";
  if (score >= 50) return "Developing — keep going";
  return "Needs work — review and retry";
}

export function timerPressureColor(timeLeft: number, total: number): string {
  const pct = timeLeft / total;
  if (pct > 0.5) return "text-emerald-400";
  if (pct > 0.25) return "text-amber-400";
  return "text-rose-400";
}

export function computeScore(params: {
  concepts: Concept[];
  hitIds: Set<string>;
  misconceptions: string[];
  timeLeft: number;
  totalTime: number;
  cardDifficulty: number;
  streak: number;
}): ScoreBreakdown {
  const { concepts, hitIds, misconceptions, timeLeft, totalTime, cardDifficulty, streak } = params;

  const totalWeight = concepts.reduce((s, c) => s + c.weight, 0) || 1;
  const weightedHits = concepts
    .filter(c => hitIds.has(c.id))
    .reduce((s, c) => s + c.weight, 0);

  const rawPct = (weightedHits / totalWeight) * 100;
  const diffMultiplier = DIFF_MULTIPLIERS[Math.min(cardDifficulty, 5) as 0|1|2|3|4|5];

  const speedRatio = timeLeft / totalTime;
  const speedBonus = speedRatio > 0.5 ? 1.15 : speedRatio > 0.25 ? 1.05 : 1.0;

  const accuracy = hitIds.size > 0 ? hitIds.size / (hitIds.size + misconceptions.length) : 1;
  const accuracyBonus = accuracy >= 1.0 ? 1.1 : accuracy >= 0.8 ? 1.05 : 1.0;

  const streakBonus = streak >= 5 ? 1.2 : streak >= 3 ? 1.1 : streak >= 1 ? 1.05 : 1.0;
  const misconceptionPenalty = misconceptions.length * 8;

  const raw = rawPct * diffMultiplier * speedBonus * accuracyBonus * streakBonus - misconceptionPenalty;
  const finalScore = Math.max(0, Math.min(100, Math.round(raw)));

  const g = grade(finalScore);
  return {
    weightedHits,
    totalWeight,
    rawPct: Math.round(rawPct),
    diffMultiplier,
    speedBonus,
    accuracyBonus,
    streakBonus,
    misconceptionPenalty,
    finalScore,
    grade: g,
    gradeAccent: gradeAccent(g),
    verdict: verdict(finalScore),
  };
}
