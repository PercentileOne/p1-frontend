import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import CinematicMCQ from './CinematicMCQ';

// A voice that never starts and never reports "finished" — the failure Francis hit on 2026-09-19 (no audio
// at the start of a bonus question, options dead, interview stuck on that screen).
vi.mock('../api/ttsApi', () => ({ speak: vi.fn(() => () => {}) }));

const mcq = {
  questionText: 'Your team\'s monthly cloud bill increases by 40% after pipeline changes. What is the best first step?',
  options: ['A. Hard-cap autoscaling', 'B. Buy reserved instances', 'C. Tag, alert and cache builds', 'D. Pause deployments'],
  correctIndex: 2,
  explanation: 'Visibility and waste reduction come first.',
};

describe('CinematicMCQ with a silent voice', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('accepts an answer immediately, without waiting for the intro voice to finish', async () => {
    const onComplete = vi.fn();
    render(<CinematicMCQ mcq={mcq} onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Tag, alert and cache builds'));
    // the answer voice is silent too — the safety timer must still complete the round
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(true, 2);
  });

  it('reports a wrong answer once, with the chosen index', async () => {
    const onComplete = vi.fn();
    render(<CinematicMCQ mcq={mcq} onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Pause deployments'));
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(false, 3);
  });

  it('shows each option text once (the A/B/C/D chip is separate from the text)', () => {
    render(<CinematicMCQ mcq={mcq} onComplete={vi.fn()} />);
    expect(screen.queryByText('A. Hard-cap autoscaling')).toBeNull();
    expect(screen.getByText('Hard-cap autoscaling')).toBeTruthy();
  });
});
