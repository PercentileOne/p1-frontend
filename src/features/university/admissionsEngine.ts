/* ══════════════════════════════════════════════════════════════
   ADMISSIONS ENGINE — Phase 11
   Composite applicant strength score for university insights.
   ══════════════════════════════════════════════════════════════ */

import { getCognitiveProfile } from "./cognitiveProfileStore";
import type { CognitiveProfile } from "./cognitiveProfileStore";
import type { Programme }        from "./universityStore";

// ── Weights ────────────────────────────────────────────────────────

const CONSISTENCY_W  = 0.30;
const IMPROVEMENT_W  = 0.25;
const DEEP_WORK_W    = 0.20;
const MOCK_EXAM_W    = 0.15;
const MASTERY_W      = 0.10;

// ── Types ──────────────────────────────────────────────────────────

export interface ApplicantStrength {
  studentId:                  string;
  strengthScore:              number;   // 0–100
  ranking:                    number;   // relative to cohort (set by caller)
  componentScores: {
    consistency:   number;
    improvement:   number;
    deepWork:      number;
    mockExam:      number;
    mastery:       number;
  };
  recommendedProgrammeMatches: Programme[];
  tier: "exceptional" | "strong" | "developing" | "emerging";
}

// ── Normalisation helpers ────────────────────────────────────────

function normImprovement(rate: number): number {
  // rate in %/week; -0.5 → 0 pts, +3.5 → 100 pts
  return Math.max(0, Math.min(100, ((rate + 0.5) / 4.0) * 100));
}

function normDeepWork(sessions: number): number {
  // 0–80 sessions → 0–100
  return Math.min(100, (sessions / 80) * 100);
}

function avgMockScore(profile: CognitiveProfile): number {
  if (profile.mockExamScores.length === 0) return 0;
  return profile.mockExamScores.reduce((s, m) => s + m.score, 0) / profile.mockExamScores.length;
}

function avgMastery(profile: CognitiveProfile): number {
  if (profile.conceptMastery.length === 0) return 0;
  return profile.conceptMastery.reduce((s, m) => s + m.mastery, 0) / profile.conceptMastery.length;
}

// ── Main compute ────────────────────────────────────────────────

export function computeApplicantStrength(
  studentId:   string,
  programmes:  Programme[],
): ApplicantStrength {
  const profile = getCognitiveProfile(studentId);

  const consistency = profile.consistencyScore;
  const improvement = normImprovement(profile.improvementRate);
  const deepWork    = normDeepWork(profile.deepWorkSessions);
  const mockExam    = avgMockScore(profile);
  const mastery     = avgMastery(profile);

  const strengthScore = Math.round(
    consistency * CONSISTENCY_W +
    improvement * IMPROVEMENT_W +
    deepWork    * DEEP_WORK_W   +
    mockExam    * MOCK_EXAM_W   +
    mastery     * MASTERY_W
  );

  // Programme matching — simple keyword-in-requirement heuristic
  const recommendedProgrammeMatches = programmes.filter(_prog => {
    // If mock exam score is high enough for programme requirements
    const avgMock = avgMockScore(profile);
    return avgMock >= 55 && strengthScore >= 50;
  }).slice(0, 2);

  const tier: ApplicantStrength["tier"] =
    strengthScore >= 82 ? "exceptional" :
    strengthScore >= 65 ? "strong"      :
    strengthScore >= 48 ? "developing"  : "emerging";

  return {
    studentId,
    strengthScore,
    ranking: 0, // set by caller after sorting
    componentScores: { consistency, improvement, deepWork, mockExam, mastery },
    recommendedProgrammeMatches,
    tier,
  };
}

// ── Rank cohort ────────────────────────────────────────────────

export function rankCohort(
  studentIds: string[],
  programmes: Programme[],
): ApplicantStrength[] {
  const results = studentIds.map(id => computeApplicantStrength(id, programmes));
  results.sort((a, b) => b.strengthScore - a.strengthScore);
  results.forEach((r, i) => { r.ranking = i + 1; });
  return results;
}

export const TIER_COLOR: Record<ApplicantStrength["tier"], string> = {
  exceptional: "text-emerald-400",
  strong:      "text-sky-400",
  developing:  "text-amber-400",
  emerging:    "text-slate-400",
};

export const TIER_BG: Record<ApplicantStrength["tier"], string> = {
  exceptional: "bg-emerald-500/10 border-emerald-500/25",
  strong:      "bg-sky-500/10 border-sky-500/25",
  developing:  "bg-amber-500/10 border-amber-500/25",
  emerging:    "bg-white/[0.04] border-white/[0.07]",
};