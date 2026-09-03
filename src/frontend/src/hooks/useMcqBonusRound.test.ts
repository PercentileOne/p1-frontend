import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMcqBonusRound } from './useMcqBonusRound';
import type { MCQQuestion } from '../api/aiScoring';

vi.mock('../api/aiScoring', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/aiScoring')>();
  return { ...actual, generateMCQs: vi.fn() };
});

import { generateMCQs } from '../api/aiScoring';

const mcqA: MCQQuestion = { questionText: 'First bonus question?', options: ['A', 'B'], correctIndex: 0, explanation: '' };
const mcqB: MCQQuestion = { questionText: 'Second bonus question?', options: ['A', 'B'], correctIndex: 1, explanation: '' };

function setup(mcqQuestionsSeeded = true) {
  const cancelSpeakRef = { current: null as (() => void) | null };
  const chapterMarkersRef = { current: [] as never[] };
  const recordingStartTimeRef = { current: 0 };
  const hook = renderHook(() => useMcqBonusRound({
    cancelSpeakRef, chapterMarkersRef, recordingStartTimeRef,
    mcqGenParams: mcqQuestionsSeeded
      ? { jobSpec: 'Job Title: Engineer', jobTitle: 'Engineer', cvText: undefined, fallback: [] }
      : null,
  }));
  return { ...hook, cancelSpeakRef };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useMcqBonusRound — maybeFireMcq', () => {
  it('fires at the first real slot (Q3, index 2) and marks it "first"', async () => {
    vi.mocked(generateMCQs).mockResolvedValue([mcqA, mcqB]);
    const { result } = setup();
    await act(async () => { await Promise.resolve(); });

    let fired = false;
    act(() => { fired = result.current.maybeFireMcq(2); });

    expect(fired).toBe(true);
    expect(result.current.mcqActive).toBe(true);
    expect(result.current.activeMcqQuestion).toEqual(mcqA);
    expect(result.current.activeMcqOrdinal).toBe('first');
  });

  it('fires at the second real slot (Q7, index 6) and marks it "second", once the first has resolved', async () => {
    vi.mocked(generateMCQs).mockResolvedValue([mcqA, mcqB]);
    const { result } = setup();
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.maybeFireMcq(2); });
    act(() => { result.current.recordMcqResult(2, true, 0); }); // resolve the first before the second can fire

    let fired = false;
    act(() => { fired = result.current.maybeFireMcq(6); });

    expect(fired).toBe(true);
    expect(result.current.activeMcqQuestion).toEqual(mcqB);
    expect(result.current.activeMcqOrdinal).toBe('second');
  });

  it('does not fire at a question index that is not a configured slot', async () => {
    vi.mocked(generateMCQs).mockResolvedValue([mcqA, mcqB]);
    const { result } = setup();
    await act(async () => { await Promise.resolve(); });

    let fired = true;
    act(() => { fired = result.current.maybeFireMcq(3); });

    expect(fired).toBe(false);
    expect(result.current.mcqActive).toBe(false);
  });

  it('does not fire a second time while one is already active — the no-double-fire guard', async () => {
    vi.mocked(generateMCQs).mockResolvedValue([mcqA, mcqB]);
    const { result } = setup();
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.maybeFireMcq(2); });
    expect(result.current.mcqActive).toBe(true);

    // A stray re-entrant call at the same slot (e.g. nextQuestion and handlePass both firing
    // within the same tick) must not bump the ordinal or replace the active question.
    let firedAgain = true;
    act(() => { firedAgain = result.current.maybeFireMcq(2); });

    expect(firedAgain).toBe(false);
    expect(result.current.activeMcqQuestion).toEqual(mcqA);
  });

  it('cancels any live TTS before showing the overlay', async () => {
    vi.mocked(generateMCQs).mockResolvedValue([mcqA, mcqB]);
    const { result, cancelSpeakRef } = setup();
    await act(async () => { await Promise.resolve(); });

    const cancelFn = vi.fn();
    cancelSpeakRef.current = cancelFn;

    act(() => { result.current.maybeFireMcq(2); });

    expect(cancelFn).toHaveBeenCalledTimes(1);
  });
});

describe('useMcqBonusRound — recordMcqResult', () => {
  it('accumulates results and bonus points, and returns them synchronously', async () => {
    vi.mocked(generateMCQs).mockResolvedValue([mcqA, mcqB]);
    const { result } = setup();
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.maybeFireMcq(2); });

    let returned;
    act(() => { returned = result.current.recordMcqResult(2, true, 0); });

    expect(returned).toEqual({ newResults: [{ correct: true, selectedIndex: 0, questionIndex: 2 }], newBonusPoints: 10 });
    expect(result.current.mcqResults).toEqual([{ correct: true, selectedIndex: 0, questionIndex: 2 }]);
    expect(result.current.mcqBonusPoints).toBe(10);
    expect(result.current.mcqActive).toBe(false);
    expect(result.current.activeMcqQuestion).toBeNull();
  });

  it('awards no bonus points for a wrong answer', async () => {
    vi.mocked(generateMCQs).mockResolvedValue([mcqA, mcqB]);
    const { result } = setup();
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.maybeFireMcq(2); });

    let returned;
    act(() => { returned = result.current.recordMcqResult(2, false, 1); });

    expect(returned).toEqual({ newResults: [{ correct: false, selectedIndex: 1, questionIndex: 2 }], newBonusPoints: 0 });
    expect(result.current.mcqBonusPoints).toBe(0);
  });
});
