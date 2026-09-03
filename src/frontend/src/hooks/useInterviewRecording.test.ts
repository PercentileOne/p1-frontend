import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInterviewRecording } from './useInterviewRecording';

// Scoped deliberately narrow: jsdom implements neither MediaRecorder nor
// navigator.mediaDevices.getUserMedia/getDisplayMedia, so startRecording/uploadRecording's
// actual media-capture behavior isn't meaningfully unit-testable here — that's covered by
// manual QA per this refactor's plan. What IS real and worth locking in: the hook's initial
// shape, and buildPlaybackUrl's behavior before any recording has happened.

function setup() {
  return renderHook(() => useInterviewRecording({
    phase: 'intro',
    filterPreset: 'beauty',
    questionText: undefined,
    candidateId: 'candidate-123',
    authToken: 'fake-token',
    jobTitle: 'Software Engineer',
    company: 'Test Co',
    candidateName: 'Test Candidate',
  }));
}

describe('useInterviewRecording', () => {
  it('starts with idle/not-recording state', () => {
    const { result } = setup();
    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordingFailed).toBe(false);
    expect(result.current.uploadStatus).toBe('idle');
  });

  it('buildPlaybackUrl returns null before any recording has happened', () => {
    const { result } = setup();
    expect(result.current.buildPlaybackUrl()).toBeNull();
  });

  it('interviewIdRef is initialised to a stable, real UUID', () => {
    const { result } = setup();
    const id = result.current.interviewIdRef.current;
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('chapterMarkersRef starts empty', () => {
    const { result } = setup();
    expect(result.current.chapterMarkersRef.current).toEqual([]);
  });

  it('recordingStartTimeRef starts at 0 (not recording yet)', () => {
    const { result } = setup();
    expect(result.current.recordingStartTimeRef.current).toBe(0);
  });

  it('exposes stable function identities across re-renders with unchanged params (no unnecessary re-subscriptions downstream)', () => {
    const { result, rerender } = setup();
    const first = { startRecording: result.current.startRecording, uploadRecording: result.current.uploadRecording, buildPlaybackUrl: result.current.buildPlaybackUrl };
    rerender();
    expect(result.current.startRecording).toBe(first.startRecording);
    expect(result.current.uploadRecording).toBe(first.uploadRecording);
    expect(result.current.buildPlaybackUrl).toBe(first.buildPlaybackUrl);
  });
});
