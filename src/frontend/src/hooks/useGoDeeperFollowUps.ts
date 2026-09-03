import { useCallback, useRef } from 'react';
import type { InterviewQuestion } from '../api/explainApi';
import type { SessionAnswer } from '../pages/interview-room/types';

export const GO_DEEPER_LIMITS: Record<string, { max: number; chance: number }> = {
  Standard: { max: 1, chance: 0.15 },
  Pro: { max: 2, chance: 0.25 },
  Expert: { max: 3, chance: 0.40 },
};

const FOLLOWUP_TRANSITIONS = [
  'Mm, one more thing—',
  "Okay, good answer, but I was thinking—",
  "That's helpful — actually, one follow-up on that—",
  'Just before we move on—',
];

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export interface GoDeeperDecision {
  followUpQuestion: InterviewQuestion;
  followUpText: string;
  originalInterviewer: 'hr' | 'technical';
  doHandoff: boolean;
  /** Only set when doHandoff is false — the natural transition line prepended to the spoken
   * follow-up (askQuestion's spokenTextOverride), e.g. "Mm, one more thing— <followUpText>". */
  transition?: string;
}

/**
 * Pure decision function — no React, no side effects, no bgQuestions/interviewer-audio access.
 * scoreWithAI already decided, in the same call, whether this answer sounded shallow enough to
 * warrant a follow-up (score.needsFollowUp/followUpQuestion) — this just applies the session
 * cap + difficulty-scaled "does it actually fire" roll on top, so a genuinely vague answer
 * doesn't get probed every single time (keeps it feeling occasional, not like an
 * interrogation). `rng` defaults to Math.random but is injectable for deterministic tests.
 */
export function decideGoDeeperFollowUp(
  lastAnswer: SessionAnswer,
  opts: { goDeeperEnabled: boolean; difficulty: string; firedCount: number },
  rng: () => number = Math.random,
): GoDeeperDecision | null {
  const { goDeeperEnabled, difficulty, firedCount } = opts;
  if (!goDeeperEnabled) return null;
  if (lastAnswer.question.questionType === 'Follow-up') return null; // never chain a follow-up onto a follow-up
  if (!lastAnswer.score.needsFollowUp || !lastAnswer.score.followUpQuestion) return null;

  const limits = GO_DEEPER_LIMITS[difficulty] ?? GO_DEEPER_LIMITS.Standard;
  if (firedCount >= limits.max) return null;
  if (rng() > limits.chance) return null;

  const followUpText = lastAnswer.score.followUpQuestion;
  const originalInterviewer: 'hr' | 'technical' = lastAnswer.question.source === 'HR' ? 'hr' : 'technical';
  const followUpQuestion: InterviewQuestion = {
    ...lastAnswer.question,
    questionId: `${lastAnswer.question.questionId}-followup-${firedCount + 1}`,
    questionText: followUpText,
    questionType: 'Follow-up',
  };

  const doHandoff = rng() < 0.5;
  const transition = doHandoff ? undefined : pickRandom(FOLLOWUP_TRANSITIONS, rng);

  return { followUpQuestion, followUpText, originalInterviewer, doHandoff, transition };
}

export interface UseGoDeeperFollowUpsParams {
  goDeeperEnabled: boolean;
  selectedDifficulty: string;
}

export interface UseGoDeeperFollowUpsReturn {
  /** Still read directly by the orchestrator (submitAnswer's own eligibility check ahead of
   * the AI call — a different concern from the post-answer roll this hook decides). */
  goDeeperFiredRef: React.RefObject<number>;
  /** Rolls the decision and bumps goDeeperFiredRef if it fires. Does NOT splice bgQuestions or
   * call into interviewer-audio — those stay in the orchestrator, which already owns both. */
  evaluateGoDeeper: (lastAnswer: SessionAnswer) => GoDeeperDecision | null;
}

export function useGoDeeperFollowUps(params: UseGoDeeperFollowUpsParams): UseGoDeeperFollowUpsReturn {
  const { goDeeperEnabled, selectedDifficulty } = params;
  const goDeeperFiredRef = useRef(0);

  const evaluateGoDeeper = useCallback((lastAnswer: SessionAnswer): GoDeeperDecision | null => {
    const decision = decideGoDeeperFollowUp(
      lastAnswer,
      { goDeeperEnabled, difficulty: selectedDifficulty, firedCount: goDeeperFiredRef.current },
    );
    if (decision) goDeeperFiredRef.current += 1;
    return decision;
  }, [goDeeperEnabled, selectedDifficulty]);

  return { goDeeperFiredRef, evaluateGoDeeper };
}
