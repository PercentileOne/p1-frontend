import { useCallback, useEffect, useRef, useState } from 'react';
import { generateMCQs, type MCQQuestion } from '../api/aiScoring';
import type { ChapterMarker, McqResult } from '../pages/interview-room/types';

// Fixed slots — the bonus round fires after Q3 (index 2) and Q7 (index 6), 0-based.
const MCQ_SLOTS = [2, 6];

export interface McqGenParams {
  jobSpec: string;
  jobTitle?: string;
  cvText?: string;
  /** sessionPrepareClient's own mcqQuestions, used only if the dedicated generateMCQs call
   * (more variety, not anchored to the main questions) comes back empty or rejects. */
  fallback: MCQQuestion[];
}

export interface UseMcqBonusRoundParams {
  /** Still read/written directly by maybeFireMcq — this is the one place outside
   * useInterviewerAudio that needs to interrupt a live source (an MCQ firing mid-question
   * shouldn't leave the previous question's audio running underneath the overlay). */
  cancelSpeakRef: React.RefObject<(() => void) | null>;
  chapterMarkersRef: React.RefObject<ChapterMarker[]>;
  recordingStartTimeRef: React.RefObject<number>;
  /** Set once (non-null) by the orchestrator after Phase 2's real AI result lands — the same
   * "session prep succeeded" signal generateMCQs used to fire on inline. Null on demo-fallback
   * (AI prep failed entirely) or before Phase 2 resolves, matching the pre-extraction behavior
   * of never generating a bonus round without a real job spec to generate it from. */
  mcqGenParams: McqGenParams | null;
}

export interface UseMcqBonusRoundReturn {
  mcqQuestions: MCQQuestion[];
  mcqActive: boolean;
  mcqBonusPoints: number;
  mcqResults: McqResult[];
  activeMcqQuestion: MCQQuestion | null;
  activeMcqOrdinal: 'first' | 'second';
  /** Fires the next MCQ slot if `atQIndex` matches one and it hasn't already fired — returns
   * true if it fired (caller should skip its normal advance-to-next-question logic), false
   * otherwise. Collapses the identical block previously duplicated in nextQuestion/handlePass. */
  maybeFireMcq: (atQIndex: number) => boolean;
  /** CinematicMCQ's onComplete path — records the result, returns the updated results/bonus
   * synchronously (same reason recordPassedAnswer does: the caller's own advance-or-close
   * logic needs the up-to-date values in the SAME tick, before a re-render). */
  recordMcqResult: (atQIndex: number, correct: boolean, selectedIndex: number) => { newResults: McqResult[]; newBonusPoints: number };
}

export function useMcqBonusRound(params: UseMcqBonusRoundParams): UseMcqBonusRoundReturn {
  const { cancelSpeakRef, chapterMarkersRef, recordingStartTimeRef, mcqGenParams } = params;

  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [mcqActive, setMcqActive] = useState(false);
  const [mcqBonusPoints, setMcqBonusPoints] = useState(0);
  const [mcqResults, setMcqResults] = useState<McqResult[]>([]);
  const [activeMcqQuestion, setActiveMcqQuestion] = useState<MCQQuestion | null>(null);
  const [activeMcqOrdinal, setActiveMcqOrdinal] = useState<'first' | 'second'>('first');

  const mcqFiredCountRef = useRef(0); // how many MCQs have fired so far
  // Synchronous guard against mcqFiredCountRef double-incrementing — nextQuestion and
  // handlePass both gate MCQ-firing on the `mcqActive` *state*, but state commits are
  // async, so if either could re-enter within the same tick (e.g. a stray double-call),
  // both would see mcqActive still false and each bump the ref-counted ordinal, causing
  // the first bonus question to announce itself as "second". A ref updates immediately,
  // so this closes the race the state check alone couldn't.
  const mcqFiringRef = useRef(false);

  // Generated once Phase 2 hands us a real job spec — a dedicated call (more variety, not
  // anchored to the main interview questions), falling back to sessionPrepareClient's own
  // mcqQuestions if this call comes back empty or rejects.
  useEffect(() => {
    if (!mcqGenParams) return;
    generateMCQs(mcqGenParams.jobSpec, mcqGenParams.jobTitle, mcqGenParams.cvText).then(mcqs => {
      if (mcqs.length) setMcqQuestions(mcqs);
      else if (mcqGenParams.fallback.length) setMcqQuestions(mcqGenParams.fallback);
    }).catch(() => {
      if (mcqGenParams.fallback.length) setMcqQuestions(mcqGenParams.fallback);
    });
  }, [mcqGenParams]);

  const maybeFireMcq = useCallback((atQIndex: number): boolean => {
    const nextMcqIdx = mcqFiredCountRef.current;
    if (mcqActive || mcqFiringRef.current || MCQ_SLOTS[nextMcqIdx] !== atQIndex || !mcqQuestions[nextMcqIdx]) return false;

    mcqFiringRef.current = true;
    mcqFiredCountRef.current += 1;
    cancelSpeakRef.current?.();
    if (recordingStartTimeRef.current > 0) {
      chapterMarkersRef.current.push({
        questionIndex: -1,
        questionText: mcqQuestions[nextMcqIdx].questionText,
        competency: 'bonus',
        offsetSeconds: Math.round((Date.now() - recordingStartTimeRef.current) / 1000),
        isMcq: true,
        mcqOrdinal: nextMcqIdx + 1,
      });
    }
    setActiveMcqOrdinal(nextMcqIdx === 0 ? 'first' : 'second');
    setActiveMcqQuestion(mcqQuestions[nextMcqIdx]);
    setMcqActive(true);
    return true;
  }, [mcqActive, mcqQuestions, cancelSpeakRef, chapterMarkersRef, recordingStartTimeRef]);

  const recordMcqResult = useCallback((atQIndex: number, correct: boolean, selectedIndex: number) => {
    mcqFiringRef.current = false;
    setMcqActive(false);
    setActiveMcqQuestion(null);
    const newResult: McqResult = { correct, selectedIndex, questionIndex: atQIndex };
    const newResults = [...mcqResults, newResult];
    const newBonusPoints = mcqBonusPoints + (correct ? 10 : 0);
    setMcqResults(newResults);
    if (correct) setMcqBonusPoints(newBonusPoints);
    return { newResults, newBonusPoints };
  }, [mcqResults, mcqBonusPoints]);

  return {
    mcqQuestions, mcqActive, mcqBonusPoints, mcqResults,
    activeMcqQuestion, activeMcqOrdinal,
    maybeFireMcq, recordMcqResult,
  };
}
