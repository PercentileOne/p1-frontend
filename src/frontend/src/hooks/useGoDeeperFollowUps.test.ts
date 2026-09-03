import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { decideGoDeeperFollowUp, useGoDeeperFollowUps, GO_DEEPER_LIMITS } from './useGoDeeperFollowUps';
import type { SessionAnswer } from '../pages/interview-room/types';

function makeAnswer(overrides: Partial<SessionAnswer> = {}, questionOverrides: Partial<SessionAnswer['question']> = {}): SessionAnswer {
  return {
    question: {
      questionId: 'q1',
      questionText: 'Tell me about a challenge you overcame.',
      modelAnswer: '',
      questionType: 'Competency',
      difficulty: 'Medium',
      source: 'HR',
      competencyTags: [],
      ...questionOverrides,
    },
    answerText: 'A somewhat vague answer.',
    score: {
      clarity: 0.5, relevance: 0.5, depth: 0.4, confidence: 0.5, overallScore: 0.5,
      feedback: [], suggestions: [],
      needsFollowUp: true,
      followUpQuestion: 'Can you say more about the actual outcome?',
    },
    answeredByVoice: false,
    ...overrides,
  };
}

/** Returns values from `values` in order, one per call — lets a test control exactly which
 * rng() call (the chance roll, the handoff coin-flip, pickRandom's index) sees what. */
function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('decideGoDeeperFollowUp — gating', () => {
  it('returns null when Go Deeper is disabled, even on a favorable roll', () => {
    const decision = decideGoDeeperFollowUp(makeAnswer(), { goDeeperEnabled: false, difficulty: 'Expert', firedCount: 0 }, () => 0);
    expect(decision).toBeNull();
  });

  it('never chains a follow-up onto a follow-up', () => {
    const answer = makeAnswer({}, { questionType: 'Follow-up' });
    const decision = decideGoDeeperFollowUp(answer, { goDeeperEnabled: true, difficulty: 'Expert', firedCount: 0 }, () => 0);
    expect(decision).toBeNull();
  });

  it("returns null when the score didn't flag needsFollowUp", () => {
    const answer = makeAnswer({ score: { clarity: 0.5, relevance: 0.5, depth: 0.5, confidence: 0.5, overallScore: 0.5, feedback: [], suggestions: [], needsFollowUp: false, followUpQuestion: 'Elaborate?' } });
    const decision = decideGoDeeperFollowUp(answer, { goDeeperEnabled: true, difficulty: 'Expert', firedCount: 0 }, () => 0);
    expect(decision).toBeNull();
  });

  it('returns null when there is no follow-up question text', () => {
    const answer = makeAnswer({ score: { clarity: 0.5, relevance: 0.5, depth: 0.5, confidence: 0.5, overallScore: 0.5, feedback: [], suggestions: [], needsFollowUp: true, followUpQuestion: null } });
    const decision = decideGoDeeperFollowUp(answer, { goDeeperEnabled: true, difficulty: 'Expert', firedCount: 0 }, () => 0);
    expect(decision).toBeNull();
  });
});

describe.each([
  ['Standard', GO_DEEPER_LIMITS.Standard] as const,
  ['Pro', GO_DEEPER_LIMITS.Pro] as const,
  ['Expert', GO_DEEPER_LIMITS.Expert] as const,
])('decideGoDeeperFollowUp — %s tier (max %o)', (difficulty, limits) => {
  it(`caps at firedCount === max (${limits.max})`, () => {
    const decision = decideGoDeeperFollowUp(makeAnswer(), { goDeeperEnabled: true, difficulty, firedCount: limits.max }, () => 0);
    expect(decision).toBeNull();
  });

  it(`still fires at firedCount === max - 1 (${limits.max - 1}) on a favorable roll`, () => {
    if (limits.max - 1 < 0) return;
    const decision = decideGoDeeperFollowUp(makeAnswer(), { goDeeperEnabled: true, difficulty, firedCount: limits.max - 1 }, sequenceRng([0, 0, 0]));
    expect(decision).not.toBeNull();
  });

  it(`rolls above the ${difficulty} chance (${limits.chance}) and does not fire`, () => {
    const decision = decideGoDeeperFollowUp(makeAnswer(), { goDeeperEnabled: true, difficulty, firedCount: 0 }, sequenceRng([limits.chance + 0.001]));
    expect(decision).toBeNull();
  });

  it(`rolls at or below the ${difficulty} chance (${limits.chance}) and fires`, () => {
    const decision = decideGoDeeperFollowUp(makeAnswer(), { goDeeperEnabled: true, difficulty, firedCount: 0 }, sequenceRng([limits.chance, 0, 0]));
    expect(decision).not.toBeNull();
  });
});

describe('decideGoDeeperFollowUp — decision shape', () => {
  it('builds a Follow-up question tagged with the next ordinal and the raw follow-up text', () => {
    const answer = makeAnswer({}, { questionId: 'q7', source: 'HR' });
    const decision = decideGoDeeperFollowUp(answer, { goDeeperEnabled: true, difficulty: 'Expert', firedCount: 2 }, sequenceRng([0, 0]));

    expect(decision).not.toBeNull();
    expect(decision!.followUpQuestion.questionId).toBe('q7-followup-3');
    expect(decision!.followUpQuestion.questionType).toBe('Follow-up');
    expect(decision!.followUpQuestion.questionText).toBe(answer.score.followUpQuestion);
    expect(decision!.followUpText).toBe(answer.score.followUpQuestion);
  });

  it('maps an HR-sourced question to the "hr" interviewer', () => {
    const answer = makeAnswer({}, { source: 'HR' });
    const decision = decideGoDeeperFollowUp(answer, { goDeeperEnabled: true, difficulty: 'Expert', firedCount: 0 }, sequenceRng([0, 0]));
    expect(decision!.originalInterviewer).toBe('hr');
  });

  it('maps a non-HR-sourced question to the "technical" interviewer', () => {
    const answer = makeAnswer({}, { source: 'Role' });
    const decision = decideGoDeeperFollowUp(answer, { goDeeperEnabled: true, difficulty: 'Expert', firedCount: 0 }, sequenceRng([0, 0]));
    expect(decision!.originalInterviewer).toBe('technical');
  });

  it('does a handoff (and sets no transition) when the coin-flip rng is below 0.5', () => {
    const decision = decideGoDeeperFollowUp(makeAnswer(), { goDeeperEnabled: true, difficulty: 'Expert', firedCount: 0 }, sequenceRng([0, 0.2]));
    expect(decision!.doHandoff).toBe(true);
    expect(decision!.transition).toBeUndefined();
  });

  it('skips the handoff (and sets a transition line) when the coin-flip rng is 0.5 or above', () => {
    const decision = decideGoDeeperFollowUp(makeAnswer(), { goDeeperEnabled: true, difficulty: 'Expert', firedCount: 0 }, sequenceRng([0, 0.8, 0]));
    expect(decision!.doHandoff).toBe(false);
    expect(typeof decision!.transition).toBe('string');
    expect(decision!.transition!.length).toBeGreaterThan(0);
  });
});

describe('useGoDeeperFollowUps — hook', () => {
  it('bumps goDeeperFiredRef only when a decision actually fires', () => {
    const { result } = renderHook(() => useGoDeeperFollowUps({ goDeeperEnabled: true, selectedDifficulty: 'Standard' }));
    expect(result.current.goDeeperFiredRef.current).toBe(0);

    // Standard's chance is 0.15 — Math.random() itself decides here, so force a definite miss
    // via a firedCount already at the cap instead of relying on chance.
    let decision;
    act(() => { decision = result.current.evaluateGoDeeper(makeAnswer({}, { questionType: 'Follow-up' })); });
    expect(decision).toBeNull();
    expect(result.current.goDeeperFiredRef.current).toBe(0);
  });

  it('leaves goDeeperFiredRef at 0 when Go Deeper is disabled', () => {
    const { result } = renderHook(() => useGoDeeperFollowUps({ goDeeperEnabled: false, selectedDifficulty: 'Expert' }));
    act(() => { result.current.evaluateGoDeeper(makeAnswer()); });
    expect(result.current.goDeeperFiredRef.current).toBe(0);
  });
});
