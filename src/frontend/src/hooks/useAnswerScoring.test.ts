import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAnswerScoring } from './useAnswerScoring';
import type { InterviewQuestion } from '../api/explainApi';

// The AI scoring/coaching calls are real network calls in production (aiScoringConfigured is
// hardcoded `true` — see src/api/aiScoring.ts — so the ONLY way this file's fallback-to-local
// path is ever exercised is via scoreWithAI/coachWithAI actually rejecting). That reject-then-
// fall-back-to-localScore/generateCoachingMessage path is a real, currently-live degradation
// path in production that had zero test coverage before this — a bad connection or a backend
// hiccup mid-interview silently downgrades scoring quality with no visible sign to the
// candidate. This test proves the fallback genuinely fires rather than the answer just failing.
vi.mock('../api/aiScoring', () => ({
  aiScoringConfigured: true,
  scoreWithAI: vi.fn(),
  coachWithAI: vi.fn(),
}));

import { scoreWithAI, coachWithAI } from '../api/aiScoring';

const mockQuestion: InterviewQuestion = {
  questionId: 'q1',
  questionText: 'Tell me about a time you led a difficult project.',
  modelAnswer: 'Cover context, actions, and outcome.',
  questionType: 'Competency',
  difficulty: 'Medium',
  source: 'Role',
  competencyTags: ['leadership'],
};

function setup() {
  return renderHook(() => useAnswerScoring({
    cvCtx: undefined,
    jobCtx: undefined,
    companyKeywords: [],
    sessionLanguage: 'en',
    selectedDifficulty: 'Standard',
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAnswerScoring — AI failure fallback', () => {
  it('falls back to localScore when scoreWithAI rejects, and the interview keeps moving', async () => {
    vi.mocked(scoreWithAI).mockRejectedValue(new Error('network error'));
    vi.mocked(coachWithAI).mockRejectedValue(new Error('network error'));

    const { result } = setup();
    await act(async () => {
      await result.current.submitAnswer(mockQuestion, 'I led a team of five engineers and delivered two weeks early.', { goDeeperEligible: false });
    });

    // localScore's real output shape — proves a real fallback score landed, not an empty/broken one
    await waitFor(() => expect(result.current.currentScore).not.toBeNull());
    expect(result.current.currentScore?.overallScore).toBeGreaterThan(0);
    expect(result.current.sessionAnswers).toHaveLength(1);
    expect(result.current.sessionAnswers[0].answerText).toBe('I led a team of five engineers and delivered two weeks early.');
  });

  it('falls back to the template coaching message when coachWithAI rejects but scoreWithAI succeeds', async () => {
    vi.mocked(scoreWithAI).mockResolvedValue({
      clarity: 0.8, relevance: 0.7, depth: 0.6, confidence: 0.7, overallScore: 0.7,
      feedback: [], suggestions: [],
    });
    vi.mocked(coachWithAI).mockRejectedValue(new Error('network error'));

    const { result } = setup();
    await act(async () => {
      await result.current.submitAnswer(mockQuestion, 'A real, substantive answer about leading a project.', { goDeeperEligible: false });
    });

    await waitFor(() => expect(result.current.coachingMessage).not.toBeNull());
  });

  it('uses the real AI results when both calls succeed (no fallback triggered)', async () => {
    vi.mocked(scoreWithAI).mockResolvedValue({
      clarity: 0.9, relevance: 0.9, depth: 0.9, confidence: 0.9, overallScore: 0.9,
      feedback: [], suggestions: [],
    });
    vi.mocked(coachWithAI).mockResolvedValue({
      lines: ['Great answer.', 'Well structured and specific.'],
      fullText: 'Great answer. Well structured and specific.',
      tone: 'strong',
    });

    const { result } = setup();
    await act(async () => {
      await result.current.submitAnswer(mockQuestion, 'A detailed answer.', { goDeeperEligible: false });
    });

    await waitFor(() => expect(result.current.currentScore?.overallScore).toBe(0.9));
    expect(scoreWithAI).toHaveBeenCalledTimes(1);
    expect(coachWithAI).toHaveBeenCalledTimes(1);
  });

  it('ignores an empty/whitespace-only answer without calling the AI at all', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.submitAnswer(mockQuestion, '   ', { goDeeperEligible: false });
    });
    expect(scoreWithAI).not.toHaveBeenCalled();
    expect(result.current.sessionAnswers).toHaveLength(0);
  });
});

describe('useAnswerScoring — recordPassedAnswer', () => {
  it('appends a zero-score entry and returns it synchronously', () => {
    const { result } = setup();
    let entry;
    act(() => {
      entry = result.current.recordPassedAnswer(mockQuestion, 1500);
    });
    expect(entry).toMatchObject({ question: mockQuestion, answerText: '', answeredByVoice: false, thinkTimeMs: 1500 });
    expect(entry!.score.overallScore).toBe(0);
    expect(result.current.sessionAnswers).toContainEqual(entry);
    expect(result.current.runningScores).toContain(0);
  });
});

describe('useAnswerScoring — resetForNextQuestion', () => {
  it('clears currentScore and coachingMessage but leaves sessionAnswers/runningScores intact', async () => {
    vi.mocked(scoreWithAI).mockResolvedValue({
      clarity: 0.8, relevance: 0.8, depth: 0.8, confidence: 0.8, overallScore: 0.8,
      feedback: [], suggestions: [],
    });
    vi.mocked(coachWithAI).mockResolvedValue({ lines: ['Nice work.'], fullText: 'Nice work.', tone: 'strong' });

    const { result } = setup();
    await act(async () => {
      await result.current.submitAnswer(mockQuestion, 'An answer.', { goDeeperEligible: false });
    });
    await waitFor(() => expect(result.current.currentScore).not.toBeNull());

    act(() => { result.current.resetForNextQuestion(); });

    expect(result.current.currentScore).toBeNull();
    expect(result.current.coachingMessage).toBeNull();
    expect(result.current.sessionAnswers).toHaveLength(1); // untouched
  });
});
