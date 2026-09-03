import { useCallback, useState } from 'react';
import type { TranscriptMeta } from '../components/VoiceInput';
import type { InterviewQuestion, ScoreResponse } from '../api/explainApi';
import { scoreWithAI, coachWithAI, aiScoringConfigured } from '../api/aiScoring';
import { generateCoachingMessage, type CoachingMessage } from '../utils/coachingEngine';
import type { CVContext, JobSpecContext } from '../utils/contextBuilder';
import { localScore } from '../pages/interview-room/localScoring';
import type { SessionAnswer } from '../pages/interview-room/types';

export interface SubmitAnswerOptions {
  meta?: TranscriptMeta;
  byVoice?: boolean;
  /** Computed by the caller from whatever ref/clock tracks think-time — this hook doesn't
   * own that clock, since it starts ticking the moment a question is asked (interviewer-audio
   * territory), not when scoring begins. */
  thinkTimeMs?: number;
  /** Whether a Go Deeper follow-up is currently allowed (difficulty-tier cap, not already at
   * the session limit) — computed by the caller so this hook doesn't need to know Go Deeper's
   * own difficulty/limit table. */
  goDeeperEligible: boolean;
}

export interface UseAnswerScoringParams {
  cvCtx?: CVContext;
  jobCtx?: JobSpecContext;
  companyKeywords: string[];
  sessionLanguage: string;
  selectedDifficulty: string;
}

export interface UseAnswerScoringReturn {
  currentScore: ScoreResponse | null;
  sessionAnswers: SessionAnswer[];
  runningScores: number[];
  coachingMessage: CoachingMessage | null;
  submitAnswer: (q: InterviewQuestion, text: string, options: SubmitAnswerOptions) => Promise<void>;
  /** Pass's own path — a zero-score "no answer given" entry, no AI call. Appends to
   * sessionAnswers/runningScores state (async) AND returns the entry synchronously, since the
   * caller (handlePass) needs the up-to-date answers list in the SAME tick to upload/close the
   * interview on the final question — it can't wait for a re-render to see the new state. */
  recordPassedAnswer: (q: InterviewQuestion, thinkTimeMs?: number) => SessionAnswer;
  /** Clears currentScore/coachingMessage ahead of the next question — collapses what used to
   * be duplicated inline in nextQuestion and handlePass into one place. */
  resetForNextQuestion: () => void;
}

export function useAnswerScoring(params: UseAnswerScoringParams): UseAnswerScoringReturn {
  const { cvCtx, jobCtx, companyKeywords, sessionLanguage, selectedDifficulty } = params;

  const [currentScore, setCurrentScore] = useState<ScoreResponse | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [runningScores, setRunningScores] = useState<number[]>([]);
  const [coachingMessage, setCoachingMessage] = useState<CoachingMessage | null>(null);

  const submitAnswer = useCallback(async (q: InterviewQuestion, text: string, options: SubmitAnswerOptions) => {
    if (!text.trim()) return;
    const { meta, byVoice = false, thinkTimeMs, goDeeperEligible } = options;

    let score: ScoreResponse;
    try {
      score = aiScoringConfigured
        ? await scoreWithAI(q, text, cvCtx, jobCtx, { enabled: goDeeperEligible, difficulty: selectedDifficulty }, sessionLanguage)
        : localScore(q, text, companyKeywords);
    } catch {
      score = localScore(q, text, companyKeywords);
    }

    setCurrentScore(score);
    setRunningScores(prev => [...prev, score.overallScore]);
    setSessionAnswers(prev => [...prev, { question: q, answerText: text, meta, score, answeredByVoice: byVoice, thinkTimeMs }]);

    let coaching: CoachingMessage;
    try {
      coaching = aiScoringConfigured
        ? await coachWithAI(q, text, score, cvCtx, jobCtx, thinkTimeMs, sessionLanguage)
        : generateCoachingMessage(score, q, text, cvCtx, jobCtx);
    } catch (err) {
      console.error('[InterviewRoom] AI coaching failed — using template fallback:', err);
      coaching = generateCoachingMessage(score, q, text, cvCtx, jobCtx);
    }

    setCoachingMessage(coaching);
  }, [cvCtx, jobCtx, companyKeywords, sessionLanguage, selectedDifficulty]);

  const recordPassedAnswer = useCallback((q: InterviewQuestion, thinkTimeMs?: number): SessionAnswer => {
    const passScore: ScoreResponse = {
      clarity: 0, relevance: 0, depth: 0, confidence: 0, overallScore: 0,
      feedback: [{ dimension: 'overall', message: 'Question passed — no answer given.', severity: 'high' }],
      suggestions: ['Attempt all questions in a real interview.'],
    };
    const entry: SessionAnswer = { question: q, answerText: '', score: passScore, answeredByVoice: false, thinkTimeMs };
    setRunningScores(prev => [...prev, 0]);
    setSessionAnswers(prev => [...prev, entry]);
    return entry;
  }, []);

  const resetForNextQuestion = useCallback(() => {
    setCurrentScore(null);
    setCoachingMessage(null);
  }, []);

  return { currentScore, sessionAnswers, runningScores, coachingMessage, submitAnswer, recordPassedAnswer, resetForNextQuestion };
}
