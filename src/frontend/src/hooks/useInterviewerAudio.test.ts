import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInterviewerAudio, type UseInterviewerAudioParams } from './useInterviewerAudio';
import type { InterviewQuestion } from '../api/explainApi';

// Regression coverage for the "2-3 overlapping voices" bug: cancelSpeakRef alone did nothing
// when a video (Sarah's intro or James's Name Bank greeting) was the active audio source,
// since neither video path ever touched cancelSpeakRef — only live TTS did. Skip Intro (and
// every other interrupt point) must be able to silence whichever source is actually live.
vi.mock('../api/ttsApi', () => ({
  speak: vi.fn(() => vi.fn()),
  elevenLabsConfigured: true,
}));
vi.mock('../api/nameGreetingsApi', () => ({
  nameGreetingsApi: { get: vi.fn() },
}));
vi.mock('../api/flowLogger', () => ({ logFlowEvent: vi.fn() }));

import { nameGreetingsApi } from '../api/nameGreetingsApi';
import { speak } from '../api/ttsApi';

const mockQuestions: InterviewQuestion[] = [
  {
    questionId: 'q1',
    questionText: 'Tell me about yourself.',
    modelAnswer: '',
    questionType: 'Competency',
    difficulty: 'Medium',
    source: 'HR',
    competencyTags: [],
  },
];

const mixedQuestions: InterviewQuestion[] = [
  { questionId: 'hr1', questionText: 'HR question', modelAnswer: '', questionType: 'Competency', difficulty: 'Medium', source: 'HR', competencyTags: [] },
  { questionId: 'role1', questionText: 'Technical question', modelAnswer: '', questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: [] },
];

function baseParams(overrides: Partial<UseInterviewerAudioParams> = {}): UseInterviewerAudioParams {
  return {
    questions: mockQuestions,
    qIndex: 0,
    setPhase: vi.fn(),
    sessionLanguage: 'en',
    bgMikeScriptRef: { current: null },
    specialistTitle: 'Hiring Manager',
    resolvedPreferredName: 'Alex',
    authToken: 'fake-token',
    selectedDifficulty: 'Standard',
    aiQuestionsLoaded: true,
    chapterMarkersRef: { current: [] },
    recordingStartTimeRef: { current: 0 },
    phase2ReadyRef: { current: true },
    phase2WaitersRef: { current: [] },
    setHighlightRecord: vi.fn(),
    setAudioCheckState: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(nameGreetingsApi.get).mockResolvedValue(null);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useInterviewerAudio — stopAllInterviewerAudio', () => {
  it('cancels a live TTS source', () => {
    const { result } = renderHook(() => useInterviewerAudio(baseParams()));
    const cancelFn = vi.fn();
    act(() => { result.current.cancelSpeakRef.current = cancelFn; });

    act(() => { result.current.stopAllInterviewerAudio(); });

    expect(cancelFn).toHaveBeenCalledTimes(1);
    expect(result.current.cancelSpeakRef.current).toBeNull();
  });

  it("silences Sarah's intro video, even with a live TTS cancel fn also seeded", async () => {
    vi.mocked(nameGreetingsApi.get).mockResolvedValue(null);
    const { result } = renderHook(() => useInterviewerAudio(baseParams()));

    act(() => { result.current.beginInterviewIntroRef.current(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(result.current.sarahIntroVideoActive).toBe(true);

    const cancelFn = vi.fn();
    act(() => { result.current.cancelSpeakRef.current = cancelFn; });

    act(() => { result.current.stopAllInterviewerAudio(); });

    expect(cancelFn).toHaveBeenCalledTimes(1);
    expect(result.current.cancelSpeakRef.current).toBeNull();
    expect(result.current.sarahIntroVideoActive).toBe(false);
  });

  it("silences James's Name Bank greeting video, even with a live TTS cancel fn also seeded", async () => {
    vi.mocked(nameGreetingsApi.get).mockResolvedValue({ videoUrl: 'https://example.com/james-alex.mp4' });
    const { result } = renderHook(() => useInterviewerAudio(baseParams()));

    // Let the Name Bank lookup effect resolve before starting the intro.
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.beginInterviewIntroRef.current(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(result.current.sarahIntroVideoActive).toBe(true);

    // Sarah's video "ends" — hands off to James, whose personalised greeting video takes over.
    act(() => { result.current.handleSarahIntroVideoEnded(); });
    expect(result.current.jamesGreetingVideoActive).toBe(true);

    const cancelFn = vi.fn();
    act(() => { result.current.cancelSpeakRef.current = cancelFn; });

    act(() => { result.current.stopAllInterviewerAudio(); });

    expect(cancelFn).toHaveBeenCalledTimes(1);
    expect(result.current.cancelSpeakRef.current).toBeNull();
    expect(result.current.jamesGreetingVideoActive).toBe(false);
  });

  it("silences James's ambient idle loop (active alongside Sarah's intro video), even with a live TTS cancel fn also seeded", async () => {
    const { result } = renderHook(() => useInterviewerAudio(baseParams()));

    act(() => { result.current.beginInterviewIntroRef.current(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    // Both start together — James's ambient loop is meant to run for as long as Sarah's
    // intro video does, not just after it.
    expect(result.current.sarahIntroVideoActive).toBe(true);
    expect(result.current.jamesAmbientVideoActive).toBe(true);

    const cancelFn = vi.fn();
    act(() => { result.current.cancelSpeakRef.current = cancelFn; });

    act(() => { result.current.stopAllInterviewerAudio(); });

    expect(cancelFn).toHaveBeenCalledTimes(1);
    expect(result.current.cancelSpeakRef.current).toBeNull();
    expect(result.current.sarahIntroVideoActive).toBe(false);
    expect(result.current.jamesAmbientVideoActive).toBe(false);
  });

  it("silences James's generic intro video (no Name Bank hit), even with a live TTS cancel fn also seeded", async () => {
    vi.mocked(nameGreetingsApi.get).mockResolvedValue(null); // no personalised clip for this candidate
    const { result } = renderHook(() => useInterviewerAudio(baseParams()));

    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.beginInterviewIntroRef.current(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(result.current.sarahIntroVideoActive).toBe(true);

    // Sarah's video "ends" — falls through to james-intro-v1.mp4 since there's no Name Bank hit.
    act(() => { result.current.handleSarahIntroVideoEnded(); });
    expect(result.current.jamesIntroVideoActive).toBe(true);
    expect(result.current.jamesGreetingVideoActive).toBe(false);

    const cancelFn = vi.fn();
    act(() => { result.current.cancelSpeakRef.current = cancelFn; });

    act(() => { result.current.stopAllInterviewerAudio(); });

    expect(cancelFn).toHaveBeenCalledTimes(1);
    expect(result.current.cancelSpeakRef.current).toBeNull();
    expect(result.current.jamesIntroVideoActive).toBe(false);
  });
});

describe('useInterviewerAudio — sarahAmbientVideoActive', () => {
  it('is true only while James is actively asking a question, not while Sarah asks or the candidate answers', () => {
    const { result } = renderHook(() => useInterviewerAudio(baseParams({ questions: mixedQuestions })));

    expect(result.current.sarahAmbientVideoActive).toBe(false);

    // Sarah asks the HR question — James is listening, not the other way round.
    act(() => { result.current.askQuestion(0); });
    expect(result.current.sarahAmbientVideoActive).toBe(false);

    // Sarah's line finishes — phase moves to answering, both idle.
    const sarahOnDone = vi.mocked(speak).mock.calls[0][2];
    act(() => { sarahOnDone(); });
    expect(result.current.sarahAmbientVideoActive).toBe(false);

    // James asks the technical question — now Sarah should be "listening".
    act(() => { result.current.askQuestion(1); });
    expect(result.current.sarahAmbientVideoActive).toBe(true);

    // James's line finishes — candidate's turn to answer, both idle again.
    const jamesOnDone = vi.mocked(speak).mock.calls[1][2];
    act(() => { jamesOnDone(); });
    expect(result.current.sarahAmbientVideoActive).toBe(false);
  });

  it("is also true during James's own intro, right after Sarah's intro video ends", async () => {
    vi.mocked(nameGreetingsApi.get).mockResolvedValue(null);
    const { result } = renderHook(() => useInterviewerAudio(baseParams()));
    await act(async () => { await Promise.resolve(); });

    act(() => { result.current.beginInterviewIntroRef.current(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(result.current.sarahAmbientVideoActive).toBe(false); // Sarah's own video is playing, she's not "listening" yet

    // Sarah's intro video ends — hands off to James's intro (his generic clip, no Name Bank hit).
    act(() => { result.current.handleSarahIntroVideoEnded(); });
    expect(result.current.jamesIntroVideoActive).toBe(true);
    expect(result.current.sarahAmbientVideoActive).toBe(true);
  });
});
