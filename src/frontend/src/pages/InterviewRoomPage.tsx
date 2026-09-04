import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewerAvatar } from '../components/InterviewerAvatar';
import { MouthOverlay, MOUTH_POSITIONS, MOUTH_OVERLAY_ENABLED } from '../components/MouthOverlay';
import { YouCamera } from '../components/YouCamera';
import { VoiceInput, type TranscriptMeta } from '../components/VoiceInput';
import type { InterviewQuestion } from '../api/explainApi';
import { speak, elevenLabsConfigured } from '../api/ttsApi';
import { type CVContext, type JobSpecContext } from '../utils/contextBuilder';
import { CoachingOverlay } from '../components/CoachingOverlay';
import { sessionPrepareClient, generateMikeScriptOnly } from '../api/aiScoring';
import { ChairSpinner } from '../components/ChairSpinner';
import CinematicMCQ from '../components/CinematicMCQ';
import { pickRandomCompany } from '../data/companyBank';
import { logFlowEvent } from '../api/flowLogger';
import { useAuthStore } from '../auth/authStore';
import { FILTER_CSS, FILTER_LABELS, FILTER_PRESETS, type FilterPreset } from '../hooks/useVideoFilter';
import { buildDemoQuestions } from './interview-room/demoQuestions';
import type { RoomPhase, SessionAnswer } from './interview-room/types';
import { useInterviewRecording } from '../hooks/useInterviewRecording';
import { useAnswerScoring } from '../hooks/useAnswerScoring';
import { useInterviewerAudio } from '../hooks/useInterviewerAudio';
import { useMcqBonusRound, type McqGenParams } from '../hooks/useMcqBonusRound';
import { useGoDeeperFollowUps, GO_DEEPER_LIMITS } from '../hooks/useGoDeeperFollowUps';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoomState {
  cvCtx?: CVContext;
  jobCtx?: JobSpecContext;
  questions?: InterviewQuestion[];
  sarahIntro?: string;
  jamesIntro?: string;
  specialistTitle?: string;
  mikeScript?: string | null;
  companyFacts?: string[];
  jobSpecText?: string;
  cvText?: string;
  jobTitle?: string;
  autoStart?: boolean;
  selectedLanguage?: string;
  selectedDifficulty?: string;
  questionCount?: number;
  preferredName?: string;
  company?: string;
  consentToRecord?: boolean;
  goDeeperEnabled?: boolean;
}

// ── Coaching cues — rotate during answering phase ────────────────────────────

const COACHING_CUES = [
  "Stay calm — you've got this 💪",
  "Take a breath before you start",
  "Use a real example from your past",
  "STAR: Situation, Task, Action, Result",
  "Don't worry about being perfect",
  "Speak slowly and clearly",
  "It's okay to pause and think",
  "Be specific — avoid vague answers",
  "Show your thinking, not just the outcome",
  "Confidence is half the answer 😊",
  "One clear example beats three weak ones",
  "They want you to succeed — back yourself",
];

function useCoachingCue(active: boolean) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * COACHING_CUES.length));
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setIndex(i => (i + 1) % COACHING_CUES.length), 5000);
    return () => clearInterval(id);
  }, [active]);
  return COACHING_CUES[index];
}

// ── Typewriter hook — reveals words at TTS speaking pace ─────────────────────

function useTypewriter(text: string, active: boolean, wordsPerMin = 215) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!active) { setDisplayed(text); return; }
    setDisplayed('');
    const words = text.split(' ');
    const intervalMs = 60000 / wordsPerMin;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(words.slice(0, i).join(' '));
      if (i >= words.length) clearInterval(id);
    }, intervalMs);
    return () => clearInterval(id);
  }, [text, active, wordsPerMin]);

  return displayed;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InterviewRoomPage() {
  useParams<{ packId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = (location.state ?? {}) as RoomState;
  const cvCtx = ctx.cvCtx;
  const jobCtx = ctx.jobCtx;

  // The tab title otherwise stays the generic app name for the whole session — no way to
  // tell at a glance (browser tab, screen-share thumbnail, demo recording) which interview
  // is actually running. Restores whatever was there before on unmount/navigate-away.
  useEffect(() => {
    const previousTitle = document.title;
    const jobTitle = ctx.jobTitle?.trim();
    if (jobTitle) document.title = `${jobTitle} — Interview | InterviewMe.global`;
    return () => { document.title = previousTitle; };
  }, [ctx.jobTitle]);
  const authUser = useAuthStore(s => s.user);
  // Resolve candidate name: explicit "Known As" override wins, then the logged-in
  // account's own name, then undefined. Was CV-extracted firstName as the fallback
  // instead of the account name — but a CV can belong to anyone (a candidate testing
  // with someone else's CV, a recruiter previewing a role), while the account name is
  // always genuinely who's sitting in the interview. Found live: logging in as one
  // account but uploading a different person's CV made Sarah/James/Mike address the
  // CV's name, not the actual candidate's.
  const resolvedPreferredName = ctx.preferredName?.trim() || authUser?.firstName?.trim() || undefined;

  const demoCompany = useMemo(() => pickRandomCompany(), []);

  // Background AI session prep results
  const [bgQuestions, setBgQuestions] = useState<InterviewQuestion[] | null>(null);
  const [bgSarahIntro, setBgSarahIntro] = useState<string | null>(null);
  const [bgJamesIntro, setBgJamesIntro] = useState<string | null>(null);
  const bgMikeScriptRef = useRef<string | null>(null); // sync ref — always current when startMike fires
  const [bgCompanyFacts, setBgCompanyFacts] = useState<string[]>([]);
  const [bgSpecialistTitle, setBgSpecialistTitle] = useState<string | null>(null);
  const bgLoadRef = useRef(false);
  const bgLoadedRef = useRef(false); // true once AI results arrive

  // MCQ bonus round generation params — set once Phase 2 hands back a real job spec; see
  // useMcqBonusRound's own doc comment for why this is the "session prep succeeded" signal.
  const [mcqGenParams, setMcqGenParams] = useState<McqGenParams | null>(null);

  const passInProgressRef = useRef(false); // prevents double-firing Pass button

  // Session-prep readiness — Mike waits for AI to return (max 8 s) before speaking
  const sessionReadyRef = useRef(false);
  const sessionWaitersRef = useRef<Array<() => void>>([]);

  // Phase-2 readiness — Sarah/James wait for their real AI intros the same way Mike waits
  // for his above. Without this, Phase 2 (now up to 3 sequential calls plus a top-up, see
  // sessionPrepareClient's question-count retry loop) can still be in flight when Mike
  // finishes speaking, and Sarah/James silently fall back to the static, name-less lines
  // below instead of the real AI-generated ones with the candidate's name. The cap has to
  // be generous — Mike's own script typically takes 45-60s to speak, and Phase 2's retry
  // chain can legitimately take 20-30s+ — a short cap (10s tried first) just resolves the
  // wait early and reproduces the exact bug it was meant to fix.
  const phase2ReadyRef = useRef(false);
  const phase2WaitersRef = useRef<Array<() => void>>([]);

  // Derived values — fresh AI results ALWAYS win over anything pre-passed via route state
  const questions = bgQuestions ?? buildDemoQuestions(demoCompany, ctx.questionCount);
  const companyKeywords = bgCompanyFacts.length ? bgCompanyFacts : demoCompany.companyKnowledgeKeywords;
  const specialistTitle = bgSpecialistTitle ?? 'Hiring Manager';
  const effectiveSarahIntro = bgSarahIntro ?? undefined;
  const effectiveJamesIntro = bgJamesIntro ?? undefined;

  const authToken = useAuthStore(s => s.token);

  const getCandidateId = () => {
    if (authUser?.id) return authUser.id;
    // Not logged in (shouldn't happen — this route requires CAN_START_INTERVIEW) — fall
    // back to a per-browser anonymous id so recording upload doesn't hard-fail.
    const key = 'explain_candidate_id';
    let id = localStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
    return id;
  };

  const consentToRecord = ctx.consentToRecord !== false;
  const [cameraOn, setCameraOn] = useState(true);
  // Appearance filter — same presets as the Profile Video recorder (useVideoFilter.ts),
  // applied here as a plain CSS filter on the self-view rather than that hook's own
  // independent getUserMedia+canvas pipeline, since YouCamera already owns the camera
  // stream here. Desktop recording is a tab-capture (getDisplayMedia), so this filter is
  // automatically included in the saved video for free; the mobile recording path draws
  // its own canvas frame-by-frame (see startRecording below) and needs it applied there too.
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('beauty');

  const [phase, setPhase] = useState<RoomPhase>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [useVoice, setUseVoice] = useState(true);
  const [goDeeperEnabled, setGoDeeperEnabled] = useState(ctx.goDeeperEnabled ?? false);
  const [highlightRecord, setHighlightRecord] = useState(false);
  const [sessionLanguage, setSessionLanguage] = useState(ctx.selectedLanguage ?? 'en');
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  // Fixed at intake — no setter. Questions/scoring/Go Deeper limits are all built around
  // whatever difficulty was chosen before the room ever loaded; there's no legitimate way to
  // change it mid-session, so nothing in this file should be able to either.
  const [selectedDifficulty] = useState<string>(ctx.selectedDifficulty ?? 'Standard');
  const [audioCheckState, setAudioCheckState] = useState<'idle' | 'playing' | 'done'>('idle');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedPhaseRef = useRef<RoomPhase>('answering');
  // Mike's English pre-rendered video has no other stop mechanism — unlike Sarah/James's
  // clips, it isn't routed through InterviewerAvatar's videoUrl prop, so Skip Intro needs a
  // direct ref to actually pause it rather than just changing state around it.
  const mikeVideoRef = useRef<HTMLVideoElement>(null);

  const q = questions[qIndex];
  const isHrQuestion = q?.source === 'HR';

  const {
    isRecording, recordingFailed, uploadStatus,
    startRecording, uploadRecording, buildPlaybackUrl,
    chapterMarkersRef, interviewIdRef, recordingStartTimeRef,
    videoElRef: recordVideoElRef, canvasElRef: recordCanvasElRef,
  } = useInterviewRecording({
    phase,
    filterPreset,
    questionText: q?.questionText,
    candidateId: getCandidateId(),
    authToken,
    jobTitle: ctx.jobTitle,
    company: ctx.company,
    candidateName: authUser?.name,
  });

  const {
    currentScore, sessionAnswers, runningScores, coachingMessage,
    submitAnswer: scoreAnswer, recordPassedAnswer, resetForNextQuestion,
  } = useAnswerScoring({ cvCtx, jobCtx, companyKeywords, sessionLanguage, selectedDifficulty });

  const {
    hrState, techState, hrAnalyser, techAnalyser,
    sarahIntroVideoActive, jamesGreetingVideoActive, jamesGreetingUrl, jamesIntroVideoActive, jamesAmbientVideoActive, sarahAmbientVideoActive, awaitingHandoff,
    handleSarahVideoAnalyser, handleJamesVideoAnalyser,
    handleSarahIntroVideoEnded, handleJamesGreetingVideoEnded, handleJamesIntroVideoEnded,
    stopAllInterviewerAudio,
    askQuestion, repeatQuestion, testAudio, startMike, handleMikeIntroDone,
    askFollowUpWithHandoff,
    cancelSpeakRef, thinkStartRef, onDoneRef,
    setHrState, setTechState,
  } = useInterviewerAudio({
    questions, qIndex, setPhase, sessionLanguage,
    effectiveSarahIntro, effectiveJamesIntro, bgMikeScriptRef, specialistTitle,
    resolvedPreferredName, authToken, selectedDifficulty,
    aiQuestionsLoaded: bgLoadedRef.current,
    chapterMarkersRef, recordingStartTimeRef,
    phase2ReadyRef, phase2WaitersRef,
    jobSpecText: ctx.jobSpecText, cvText: ctx.cvText, ctxSelectedLanguage: ctx.selectedLanguage,
    setHighlightRecord, setAudioCheckState,
  });

  const {
    mcqQuestions, mcqActive, mcqBonusPoints, mcqResults,
    activeMcqQuestion, activeMcqOrdinal,
    maybeFireMcq, recordMcqResult,
  } = useMcqBonusRound({ cancelSpeakRef, chapterMarkersRef, recordingStartTimeRef, mcqGenParams });

  const { goDeeperFiredRef, evaluateGoDeeper } = useGoDeeperFollowUps({ goDeeperEnabled, selectedDifficulty });

  const avgScore = runningScores.length > 0
    ? Math.round(runningScores.reduce((s, v) => s + v, 0) / runningScores.length * 100)
    : null;

  // Timer
  useEffect(() => {
    if (phase === 'answering' && !paused) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, paused]);

  const startInterview = useCallback(async () => {
    if (consentToRecord) {
      await startRecording(); // wait for browser share dialog before Mike speaks
    }
    startMike();
  }, [startMike, startRecording, consentToRecord]);

  // ── Two-phase AI loading ──────────────────────────────────────────────────────
  // Phase 1 (fast ~2s): Mike's script only — unblocks Mike immediately
  // Phase 2 (while Mike speaks ~8s): full interview — questions, intros, facts
  useEffect(() => {
    if (bgLoadRef.current) return;
    bgLoadRef.current = true;

    const resolvedJobTitle = ctx.jobTitle || 'Senior Professional';
    const jobSpec = ctx.jobSpecText || `Job Title: ${resolvedJobTitle}
Company: ${demoCompany.name}
Industry: ${'sector' in demoCompany ? demoCompany.sector : 'Professional Services'}
Location: United Kingdom

We are looking for an experienced ${resolvedJobTitle} to join our team. The successful candidate will bring strong problem-solving ability, excellent communication skills, and a track record of delivering results under pressure. This role requires collaboration across teams, sound judgement, adaptability to change, and the ability to manage competing priorities effectively. The candidate should demonstrate initiative, professional integrity, and a commitment to continuous improvement.`;

    // 5s fallback — Mike never waits longer than this even if Phase 1 is slow
    const mikeTimeout = setTimeout(() => {
      if (!sessionReadyRef.current) {
        sessionReadyRef.current = true;
        sessionWaitersRef.current.forEach(cb => cb());
        sessionWaitersRef.current = [];
      }
    }, 5000);

    // 35s fallback for Phase 2 (Sarah/James) — started once Phase 2 actually begins, below.
    // Generous on purpose: see the phase2ReadyRef comment for why a short cap defeats itself.
    let phase2Timeout: ReturnType<typeof setTimeout> | undefined;
    const resolvePhase2 = () => {
      if (phase2Timeout) clearTimeout(phase2Timeout);
      if (phase2ReadyRef.current) return;
      phase2ReadyRef.current = true;
      // setTimeout(0) gives React one tick to flush the setBgSarahIntro/setBgJamesIntro
      // calls that precede this so beginInterviewIntroRef.current (only updated by its own
      // effect after a render commits) has already picked up the fresh text — same pattern,
      // same reason, as Mike's own sessionReadyRef resolution above. Without this, a waiter
      // queued because Mike finished speaking before Phase 2 resolved fires synchronously in
      // the same tick as the state update, reading the closure from BEFORE it — so the wait
      // itself worked, but the content it unblocked was still last render's stale, name-less
      // one, reproducing the exact bug this whole gate exists to prevent.
      setTimeout(() => {
        phase2WaitersRef.current.forEach(cb => cb());
        phase2WaitersRef.current = [];
      }, 0);
    };

    // Phase 1: Mike's script only — fast
    generateMikeScriptOnly({
      jobTitle: ctx.jobTitle,
      companyName: ctx.company || undefined,
      jobSpecText: ctx.jobSpecText,
      cvText: ctx.cvText,
      selectedDifficulty: ctx.selectedDifficulty,
      selectedLanguage: ctx.selectedLanguage,
      preferredName: resolvedPreferredName,
    }).then(script => {
      clearTimeout(mikeTimeout);
      if (script) bgMikeScriptRef.current = script;
      logFlowEvent('MIKE_SCRIPT_READY', { chars: script?.length ?? 0 });

      // setTimeout(0) gives React one tick to flush setBgMikeScript so that
      // startMikeRef.current captures the updated script before Mike speaks
      setTimeout(() => {
        if (!sessionReadyRef.current) {
          sessionReadyRef.current = true;
          sessionWaitersRef.current.forEach(cb => cb());
          sessionWaitersRef.current = [];
        }
      }, 0);

      // Phase 2: fires in parallel — doesn't wait for the setTimeout above. Widened from 35s
      // to 55s — sessionPrepareClient's question-count retry/top-up loop (now actually
      // enforcing the configured count, see its own comments) can legitimately need up to 3
      // full generation calls plus a top-up call to land on an exact count, which pushed real
      // Phase 2 completions closer to or past the old 35s cap more often than before. When
      // this fallback fires before the real data arrives, Sarah/James silently fall back to
      // their generic, name-less lines — that's what "James stopped saying my name" was.
      phase2Timeout = setTimeout(resolvePhase2, 55000);
      return sessionPrepareClient(jobSpec, ctx.cvText, ctx.selectedLanguage, ctx.jobTitle, ctx.selectedDifficulty, resolvedPreferredName, ctx.questionCount);

    }).then(result => {
      bgLoadedRef.current = true;
      if (!result) { resolvePhase2(); return; }
      setBgQuestions(result.questions);
      if (result.sarahIntro) setBgSarahIntro(result.sarahIntro);
      if (result.jamesIntro) setBgJamesIntro(result.jamesIntro);
      if (result.companyFacts?.length) setBgCompanyFacts(result.companyFacts);
      if (result.specialistTitle) setBgSpecialistTitle(result.specialistTitle);
      resolvePhase2();
      setMcqGenParams({ jobSpec, jobTitle: ctx.jobTitle, cvText: ctx.cvText, fallback: result.mcqQuestions ?? [] });
      logFlowEvent('QUESTION_GENERATED', { count: result.questions.length, specialistTitle: result.specialistTitle });

    }).catch(err => {
      clearTimeout(mikeTimeout);
      bgLoadedRef.current = true;
      console.error('[InterviewRoom] AI prep failed — using demo fallback:', err);
      if (!sessionReadyRef.current) {
        sessionReadyRef.current = true;
        sessionWaitersRef.current.forEach(cb => cb());
        sessionWaitersRef.current = [];
      }
      resolvePhase2();
    });

    return () => { clearTimeout(mikeTimeout); if (phase2Timeout) clearTimeout(phase2Timeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start — wait for AI session prep (max 8 s via prepTimeout), then start Mike
  // This ensures Mike always uses AI-generated script when the key is valid
  // autoStart only means the setup page was skipped — the chair screen
  // always waits for the user to click "Begin Interview →"

  const handlePause = useCallback(() => {
    pausedPhaseRef.current = phase;
    cancelSpeakRef.current?.();
    if (timerRef.current) clearInterval(timerRef.current);
    setPaused(true);
  }, [phase]);

  const handleResume = useCallback(() => {
    setPaused(false);
    if (pausedPhaseRef.current === 'asking' || pausedPhaseRef.current === 'interviewer-intro') {
      setTimeout(() => askQuestion(qIndex), 200);
    }
  }, [askQuestion, qIndex]);

  // Decides (via useGoDeeperFollowUps) whether to fire a Go Deeper probing follow-up after the
  // answer that was just scored/coached, then — if it fires — splices the synthetic question
  // into bgQuestions right after the current index so the entire existing ask/answer/score/coach
  // pipeline handles it for free, and calls into interviewer-audio to actually ask it. Both the
  // splice and the interviewer-audio call stay here rather than in the hook, since this is the
  // one place that already owns bgQuestions and askQuestion/askFollowUpWithHandoff. Returns true
  // if fired (caller should skip its normal advance-to-next-question logic).
  const maybeGoDeeper = useCallback((lastAnswer: SessionAnswer): boolean => {
    const decision = evaluateGoDeeper(lastAnswer);
    if (!decision) return false;

    const insertIndex = qIndex + 1;
    setBgQuestions(prev => {
      const arr = [...(prev ?? questions)];
      arr.splice(insertIndex, 0, decision.followUpQuestion);
      return arr;
    });
    setQIndex(insertIndex);

    if (decision.doHandoff) {
      askFollowUpWithHandoff(insertIndex, decision.followUpQuestion, decision.followUpText, decision.originalInterviewer);
    } else {
      askQuestion(insertIndex, `${decision.transition} ${decision.followUpText}`, decision.originalInterviewer, decision.followUpQuestion);
    }
    return true;
  }, [evaluateGoDeeper, qIndex, questions, askQuestion, askFollowUpWithHandoff]);

  const closeInterview = useCallback((answers: SessionAnswer[], mcqRes: typeof mcqResults, bonusPts: number) => {
    const name = resolvedPreferredName ? `, ${resolvedPreferredName}` : '';
    const closingLine = `Well${name}, that brings us to the end of your interview — thank you so much for your time today. I'm going to have a quick word with James, and then your agent Mike will be in touch shortly with some feedback. In the meantime, you can watch your full interview replay on the next screen, and retake it anytime you like. Best of luck!`;
    cancelSpeakRef.current?.();
    // Whichever path got us here (normal coaching flow, Pass, or an MCQ finish),
    // leave 'done' so the answer/coaching panels can't stay mounted and clickable
    // underneath Sarah's goodbye speech.
    setPhase('done');
    resetForNextQuestion();
    setHrState('speaking');
    cancelSpeakRef.current = speak(closingLine, 'hr', () => {
      setHrState('idle');
      navigate(`/interview-summary/${interviewIdRef.current}`, {
        state: {
          answers, cvCtx, jobCtx, mcqResults: mcqRes, mcqQuestions, mcqBonusPoints: bonusPts,
          playbackUrl: buildPlaybackUrl(), chapters: chapterMarkersRef.current,
          interviewId: interviewIdRef.current, candidateId: getCandidateId(),
        },
      });
    }, handleSarahVideoAnalyser);
  }, [resolvedPreferredName, navigate, cvCtx, jobCtx, mcqQuestions, buildPlaybackUrl, resetForNextQuestion, handleSarahVideoAnalyser, setHrState]);

  // Shared tail for every "this question is over, move on" path (a normal next-question click,
  // resuming after an MCQ bonus round, or a Pass) — previously reimplemented three times with
  // only the answers/mcq-results/bonus-points arguments actually differing between them.
  const advanceOrClose = useCallback((answers: SessionAnswer[], results: typeof mcqResults, bonusPoints: number) => {
    const next = qIndex + 1;
    if (next >= questions.length) {
      uploadRecording(answers, { mcqQuestions, mcqResults: results, mcqBonusPoints: bonusPoints, cvCtx, jobCtx });
      closeInterview(answers, results, bonusPoints);
    } else {
      setQIndex(next);
      askQuestion(next);
    }
  }, [qIndex, questions.length, mcqQuestions, cvCtx, jobCtx, uploadRecording, closeInterview, askQuestion]);

  const nextQuestion = useCallback(() => {
    resetForNextQuestion();
    setTypedAnswer('');
    logFlowEvent('QUESTION_COMPLETED', { questionId: q?.questionId, index: qIndex });

    if (maybeFireMcq(qIndex)) return;

    const lastAnswer = sessionAnswers[sessionAnswers.length - 1];
    if (lastAnswer && maybeGoDeeper(lastAnswer)) return;
    advanceOrClose(sessionAnswers, mcqResults, mcqBonusPoints);
  }, [qIndex, sessionAnswers, q, mcqResults, mcqBonusPoints, maybeFireMcq, maybeGoDeeper, resetForNextQuestion, advanceOrClose]);

  const resumeAfterMCQ = useCallback((bonusEarned: boolean, selectedIndex: number) => {
    const { newResults, newBonusPoints } = recordMcqResult(qIndex, bonusEarned, selectedIndex);

    const lastAnswer = sessionAnswers[sessionAnswers.length - 1];
    if (lastAnswer && maybeGoDeeper(lastAnswer)) return;
    advanceOrClose(sessionAnswers, newResults, newBonusPoints);
  }, [qIndex, sessionAnswers, recordMcqResult, maybeGoDeeper, advanceOrClose]);

  const handlePass = useCallback(() => {
    if (passInProgressRef.current) return;
    passInProgressRef.current = true;
    setTimeout(() => { passInProgressRef.current = false; }, 800);
    const thinkTimeMs = thinkStartRef.current > 0 ? Date.now() - thinkStartRef.current : undefined;
    thinkStartRef.current = 0;
    const passedEntry = recordPassedAnswer(q, thinkTimeMs);
    resetForNextQuestion();
    setTypedAnswer('');
    logFlowEvent('QUESTION_COMPLETED', { questionId: q?.questionId, index: qIndex, passed: true });

    if (maybeFireMcq(qIndex)) return;

    // Passing never triggers a Go Deeper follow-up — there's no answer to probe.
    advanceOrClose([...sessionAnswers, passedEntry], mcqResults, mcqBonusPoints);
  }, [q, qIndex, sessionAnswers, mcqResults, mcqBonusPoints, maybeFireMcq, recordPassedAnswer, resetForNextQuestion, advanceOrClose]);

  // Thin wrapper: phase/avatar-state transitions stay here (orchestrator territory, same as
  // askQuestion/beginInterviewIntro's setPhase calls), scoring itself is useAnswerScoring's job.
  const submitAnswer = useCallback(async (text: string, meta?: TranscriptMeta, byVoice = false) => {
    if (!text.trim()) return;
    const thinkTimeMs = thinkStartRef.current > 0 ? Date.now() - thinkStartRef.current : undefined;
    thinkStartRef.current = 0;
    setPhase('scoring');
    setHrState('thinking'); setTechState('thinking');
    logFlowEvent('ANSWER_RECEIVED', { questionId: q?.questionId, wordCount: text.trim().split(/\s+/).length, byVoice });

    const goDeeperLimits = GO_DEEPER_LIMITS[selectedDifficulty] ?? GO_DEEPER_LIMITS.Standard;
    const goDeeperEligible = goDeeperEnabled && q?.questionType !== 'Follow-up' && goDeeperFiredRef.current < goDeeperLimits.max;

    await scoreAnswer(q, text, { meta, byVoice, thinkTimeMs, goDeeperEligible });

    setHrState('idle'); setTechState('idle');
    setPhase('coaching');
  }, [q, scoreAnswer, goDeeperEnabled, selectedDifficulty]);

  const displayedQuestion = useTypewriter(q?.questionText ?? '', phase === 'asking');
  const coachingCue = useCoachingCue(phase === 'answering');

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const progress = (qIndex + (phase === 'scoring' ? 1 : 0)) / questions.length;

  const scoreColor = avgScore === null ? 'var(--text-3)'
    : avgScore >= 70 ? '#34D399'
    : avgScore >= 50 ? '#F59E0B'
    : '#EF4444';

  // Show Sarah + James only after Mike has finished
  const showInterviewers = phase !== 'intro' && phase !== 'mike';

  const roomRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) roomRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  return (
    <div ref={roomRef} style={{
      minHeight: '100vh', background: 'var(--bg)',
      fontFamily: '-apple-system,"Segoe UI",sans-serif',
      display: 'flex', flexDirection: 'column',
      userSelect: 'none',
    }}>
      {/* Hidden elements for the mobile-path recording (canvas-composited webcam + caption) —
          never visible, but must be real DOM elements for captureStream() to work reliably */}
      <video ref={recordVideoElRef} playsInline muted style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />
      <canvas ref={recordCanvasElRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} />

      {/* Cinematic MCQ overlay */}
      {mcqActive && activeMcqQuestion && (
        <CinematicMCQ
          mcq={activeMcqQuestion}
          candidateName={resolvedPreferredName}
          questionOrdinal={activeMcqOrdinal}
          onComplete={resumeAfterMCQ}
        />
      )}
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--blue)' }}>
            InterviewMe · Interview Room
          </div>
          {phase !== 'intro' && phase !== 'mike' && (
            <>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', background: 'var(--bg3)', borderRadius: '6px', padding: '3px 10px' }}>
                Q{Math.min(qIndex + 1, questions.length)} of {questions.length}
              </div>
              {avgScore !== null && (
                <div style={{
                  fontSize: '12px', fontWeight: 800, color: scoreColor,
                  background: `${scoreColor}18`, border: `1px solid ${scoreColor}44`,
                  borderRadius: '6px', padding: '3px 10px',
                }}>
                  {avgScore}%
                </div>
              )}
              {mcqBonusPoints > 0 && (
                <div style={{
                  fontSize: '12px', fontWeight: 800, color: '#34D399',
                  background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)',
                  borderRadius: '6px', padding: '3px 10px',
                }}>
                  +{mcqBonusPoints} bonus
                </div>
              )}
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language switcher — always visible so candidates can switch any time */}
          <select
            value={sessionLanguage}
            onChange={e => setSessionLanguage(e.target.value)}
            title="Switch language"
            style={{
              fontSize: '11px', fontWeight: 600, padding: '5px 8px', borderRadius: '7px',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="en">🇬🇧 English (EN)</option>
            <option value="fr">🇫🇷 French (FR)</option>
            <option value="es">🇪🇸 Spanish (ES)</option>
            <option value="de">🇩🇪 German (DE)</option>
            <option value="pt">🇵🇹 Portuguese (PT)</option>
            <option value="pl">🇵🇱 Polish (PL)</option>
            <option value="nl">🇳🇱 Dutch (NL)</option>
            <option value="it">🇮🇹 Italian (IT)</option>
            <option value="tr">🇹🇷 Turkish (TR)</option>
            <option value="ar">🇸🇦 Arabic (AR)</option>
            <option value="zh">🇨🇳 Chinese (ZH)</option>
            <option value="hi">🇮🇳 Hindi (HI)</option>
          </select>
          {phase === 'answering' && (
            <div style={{ fontSize: '13px', fontWeight: 700, color: elapsed > 120 ? 'var(--amber)' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</div>
          )}
          {/* Camera toggle */}
          {phase !== 'intro' && (
            <button
              onClick={() => setCameraOn(v => !v)}
              title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
              style={{
                background: cameraOn ? 'none' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${cameraOn ? 'var(--border)' : 'rgba(239,68,68,0.5)'}`,
                borderRadius: '8px', padding: '7px 10px',
                color: cameraOn ? 'var(--text-3)' : '#EF4444',
                fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              {cameraOn ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 10l4.553-2.069A1 1 0 0121 8.876v6.248a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/>
                  <line x1="3" y1="3" x2="21" y2="21"/>
                </svg>
              )}
              {cameraOn ? 'Camera' : 'Cam Off'}
            </button>
          )}

          {/* Recording status indicator */}
          {phase !== 'intro' && phase !== 'mike' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', cursor: 'default', userSelect: 'none' }}>
              {uploadStatus === 'uploading' ? (
                <><motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />Saving…</>
              ) : uploadStatus === 'done' ? (
                <><span style={{ color: '#34D399', userSelect: 'none' }}>✓</span><span style={{ color: '#34D399', userSelect: 'none' }}>Saved</span></>
              ) : uploadStatus === 'error' ? (
                <><span style={{ userSelect: 'none' }}>⚠</span>Save failed</>
              ) : isRecording ? (
                <><motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />Recording</>
              ) : recordingFailed ? (
                <><span style={{ userSelect: 'none' }}>⚠</span><span style={{ userSelect: 'none' }}>No video — camera/mic denied</span></>
              ) : (
                <><span style={{ color: 'var(--text-3)', userSelect: 'none' }}>⏺</span><span style={{ color: 'var(--text-3)', userSelect: 'none' }}>Standby</span></>
              )}
            </div>
          )}

          {phase !== 'intro' && phase !== 'done' && (
            <button
              onClick={handlePause}
              style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '8px', padding: '7px 12px', color: '#34D399', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              ⏸ Pause
            </button>
          )}
          {/* Fullscreen toggle */}
          <button onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Go fullscreen'}
            style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.18), rgba(124,58,237,0.14))', border: '1px solid rgba(167,139,250,0.45)', borderRadius: '8px', padding: '7px 14px', color: '#c4b5fd', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', transition: 'all 0.2s', letterSpacing: '0.01em' }}>
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
              </svg>
            )}
            {isFullscreen ? 'Exit Full' : 'Full Screen'}
          </button>
          <button onClick={() => {
            uploadRecording(sessionAnswers, { mcqQuestions, mcqResults, mcqBonusPoints, cvCtx, jobCtx });
            closeInterview(sessionAnswers, mcqResults, mcqBonusPoints);
          }}
            style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.35)', borderRadius: '8px', padding: '7px 14px', color: '#34D399', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
            End Session
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', background: 'var(--bg3)' }}>
        <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.5 }}
          style={{ height: '100%', background: 'var(--blue)' }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '960px', width: '100%', margin: '0 auto', padding: '24px 24px 32px', gap: '20px' }}>

        {/* Sarah + James — hidden while Mike is speaking, fade in after */}
        <AnimatePresence>
          {showInterviewers && (
            <motion.div
              key="interviewers"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              style={{ display: 'flex', gap: '16px' }}
            >
              <InterviewerAvatar
                role="hr" state={hrState} active={hrState === 'speaking'} analyserNode={hrAnalyser}
                videoUrl={sarahIntroVideoActive ? '/images/sarah-intro-v1.mp4' : sarahAmbientVideoActive ? '/images/sarah-idle-v1.mp4' : null}
                onVideoEnded={sarahIntroVideoActive ? handleSarahIntroVideoEnded : () => onDoneRef.current?.()}
                onVideoAnalyser={sarahAmbientVideoActive ? undefined : handleSarahVideoAnalyser}
                loop={sarahAmbientVideoActive}
                muted={sarahAmbientVideoActive}
              />
              <InterviewerAvatar
                role="technical" state={techState} active={techState === 'speaking'} specialistTitle={specialistTitle} analyserNode={techAnalyser}
                videoUrl={jamesGreetingVideoActive ? jamesGreetingUrl : jamesIntroVideoActive ? '/images/james-intro-v1.mp4' : jamesAmbientVideoActive ? '/images/james-idle-v1.mp4' : null}
                onVideoEnded={jamesGreetingVideoActive ? handleJamesGreetingVideoEnded : jamesIntroVideoActive ? handleJamesIntroVideoEnded : () => onDoneRef.current?.()}
                onVideoAnalyser={jamesAmbientVideoActive ? undefined : handleJamesVideoAnalyser}
                loop={jamesAmbientVideoActive}
                muted={jamesAmbientVideoActive}
              />
              <YouCamera cameraOn={cameraOn} speaking={phase === 'answering'} onToggle={() => setCameraOn(v => !v)} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="sync">

          {/* ── INTRO — only shown when NOT autoStart ─────────────────────── */}
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.8 }}
              style={{ borderRadius: '20px', overflow: 'hidden', minHeight: '480px', display: 'flex', flexWrap: 'wrap', background: 'var(--bg2)', border: '1px solid var(--border)' }}>

              {/* Chair — image lives in its own column now, not behind the text */}
              <div style={{ position: 'relative', flex: '1 1 320px', minHeight: '320px', overflow: 'hidden', background: '#000' }}>
                <motion.img
                  src="/images/mastermind-chair.png"
                  alt=""
                  initial={{ scale: 1.08, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 3.5, ease: 'easeOut' }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                />
                {/* Light edge gradient only, purely decorative — the panel side no longer
                    needs to fight the photo for text legibility */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(0,0,0,0.25) 100%)' }} />
              </div>

              {/* Content — solid panel, left-aligned, no longer competing with the photo */}
              <div style={{ flex: '1 1 340px', padding: '40px 36px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '20px' }}>
                {/* Eyebrow */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
                  style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--purple, #a78bfa)' }}>
                  Your interview awaits
                </motion.div>

                {/* Headline */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.7 }}
                  style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', textAlign: 'left', lineHeight: 1.3, letterSpacing: '-0.01em', userSelect: 'none' }}>
                  The seat is yours.<br />
                  <span style={{ color: '#a78bfa', userSelect: 'none' }}>Make every answer count.</span>
                </motion.div>

                {/* Meta row */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.6 }}
                  style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '20px', padding: '5px 14px' }}>
                    {questions.length} questions · Sarah &amp; James
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: elevenLabsConfigured ? 'rgba(52,211,153,0.1)' : 'var(--bg3)', border: `1px solid ${elevenLabsConfigured ? 'rgba(52,211,153,0.25)' : 'var(--border)'}`, borderRadius: '20px', padding: '5px 14px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: elevenLabsConfigured ? '#34D399' : 'var(--amber)' }} />
                    <span style={{ fontSize: '12px', color: elevenLabsConfigured ? '#34D399' : 'var(--amber)', userSelect: 'none' }}>
                      {elevenLabsConfigured ? 'Neural voices ready' : 'Browser voices'}
                    </span>
                  </div>
                </motion.div>

                {/* Answer mode + audio test */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.5 }}
                  style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="radio" checked={useVoice} onChange={() => setUseVoice(true)} style={{ accentColor: '#a78bfa' }} />
                    Speak my answers
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer', userSelect: 'none' }}>
                    <input type="radio" checked={!useVoice} onChange={() => setUseVoice(false)} style={{ accentColor: '#a78bfa' }} />
                    Type my answers
                  </label>
                  <button onClick={testAudio} disabled={audioCheckState === 'playing'}
                    style={{ background: 'transparent', border: `1px solid ${audioCheckState === 'done' ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`, borderRadius: '8px', padding: '6px 16px', fontSize: '12px', fontWeight: 600, cursor: audioCheckState === 'playing' ? 'default' : 'pointer', color: audioCheckState === 'done' ? '#34D399' : 'var(--text-2)' }}>
                    {audioCheckState === 'done' ? '✓ Audio OK' : audioCheckState === 'playing' ? 'Playing…' : '🔊 Test audio'}
                  </button>
                </motion.div>

                {/* Go Deeper toggle */}
                <motion.label initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15, duration: 0.5 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', maxWidth: '380px', textAlign: 'left', cursor: 'pointer', background: goDeeperEnabled ? 'rgba(167,139,250,0.08)' : 'var(--bg3)', border: `1px solid ${goDeeperEnabled ? 'rgba(167,139,250,0.3)' : 'var(--border)'}`, borderRadius: '10px', padding: '10px 14px', userSelect: 'none' }}>
                  <input type="checkbox" checked={goDeeperEnabled} onChange={(e) => setGoDeeperEnabled(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#a78bfa' }} />
                  <span style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--text-2)', userSelect: 'none' }}>
                    <strong style={{ color: 'var(--text)' }}>🔍 Go Deeper</strong> — occasional real follow-up questions that test genuine depth of experience{selectedDifficulty === 'Expert' ? ' (recommended for Expert)' : ''}.
                  </span>
                </motion.label>

                {/* CTA */}
                <motion.button onClick={startInterview}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.3, duration: 0.5 }}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none', borderRadius: '13px', padding: '15px 48px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.01em', boxShadow: '0 0 40px rgba(167,139,250,0.35)' }}>
                  Begin Interview →
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── MIKE PHASE — ONLY Mike, nothing else ──────────────────────── */}
          {phase === 'mike' && (
            <motion.div key="mike" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 32px', textAlign: 'center', width: '100%', maxWidth: '960px', margin: '0 auto' }}>

              {/* Mike on the left, appearance controls on the right — side by side rather
                  than stacked, so checking how you'll look doesn't push everything else down.
                  Mike's own frame is sized close to Sarah/James's card (448×300-ish) rather
                  than the old small 180×180 circle — he was visually much smaller than them,
                  and a circular crop would badly clip the 16:9 avatar video replacing his
                  static photo. */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', justifyContent: 'center', alignItems: 'flex-start', marginBottom: '28px' }}>

                <div style={{ flex: '2 1 380px', maxWidth: '460px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '20px' }}>
                    Your Recruitment Consultant
                  </div>
                  {/* Mike's photo — or, in English, his real pre-rendered talking-head clip
                      (see startMike/handleMikeIntroDone above). */}
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', margin: '0 auto 20px', borderRadius: '16px', overflow: 'hidden', background: 'var(--bg3)', border: '3px solid var(--blue)' }}>
                    {sessionLanguage === 'en' ? (
                      <video
                        ref={mikeVideoRef}
                        src="/images/mike-intro-v1.mp4"
                        autoPlay playsInline
                        onEnded={handleMikeIntroDone}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                      />
                    ) : (
                      <>
                        <img src="/images/mike.png" alt="Mike" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                        {/* Amplitude-driven mouth movement — only relevant on the non-English
                            live-TTS path; MOUTH_OVERLAY_ENABLED is currently false anyway
                            (see project-mouth-movement-avatars memory). */}
                        {MOUTH_OVERLAY_ENABLED && <MouthOverlay analyserNode={techAnalyser} active={phase === 'mike'} {...MOUTH_POSITIONS.mike} />}
                      </>
                    )}
                    {/* Pulse ring while speaking */}
                    <motion.div
                      animate={{ scale: [1, 1.03, 1], opacity: [0.6, 0.15, 0.6] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      style={{ position: 'absolute', inset: -8, borderRadius: '20px', border: '2px solid var(--blue)', pointerEvents: 'none' }}
                    />
                    {/* Mike's clip has nothing of its own to show once he's finished and we're
                        still waiting on Sarah/James — without this the frame just freezes on
                        its last frame (mouth mid-word), which reads as broken rather than
                        "loading". This scrim makes the wait visibly intentional. */}
                    <AnimatePresence>
                      {awaitingHandoff && (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{ position: 'absolute', inset: 0, background: 'rgba(7,11,20,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid rgba(79,142,247,0.25)', borderTopColor: 'var(--blue)' }}
                          />
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Bringing in Sarah &amp; James…</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>Mike</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recruitment Consultant</div>
                  {/* Speaking indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'default', userSelect: 'none' }}>
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                      style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-3)', userSelect: 'none' }}>Speaking…</span>
                  </div>
                </div>

                {/* While Mike briefs you — the natural moment to check how you'll look before
                    Sarah and James actually appear. Same filter presets as the Profile Video
                    recorder; picking one here carries through to the interview itself. */}
                <div style={{ flex: '1 1 200px', maxWidth: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', paddingLeft: '32px', borderLeft: '1px solid var(--border)' }}>
                  <YouCamera cameraOn={cameraOn} onToggle={() => setCameraOn(v => !v)} videoFilterCss={FILTER_CSS[filterPreset]} width={180} height={180} />
                  <div style={{ width: '100%' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>How you'll look</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {FILTER_PRESETS.map(preset => {
                        const active = filterPreset === preset;
                        return (
                          <button key={preset} onClick={() => setFilterPreset(preset)} title={FILTER_LABELS[preset].desc}
                            style={{
                              flex: 1, padding: '8px 4px', borderRadius: '10px',
                              background: active ? 'rgba(52,211,153,0.12)' : 'var(--bg3)',
                              border: `1px solid ${active ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
                              color: active ? '#34D399' : 'var(--text-3)',
                              fontSize: '10px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                              transition: 'all 0.15s ease',
                            }}>
                            <span style={{ fontSize: '15px' }}>{FILTER_LABELS[preset].icon}</span>
                            <span>{FILTER_LABELS[preset].label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  // Same path as Mike finishing naturally (handleMikeIntroDone) — stops
                  // whichever audio source is actually active (live TTS via
                  // stopAllInterviewerAudio, or the English video directly, since that one
                  // isn't routed through InterviewerAvatar and has no other stop mechanism),
                  // then reuses the exact same awaitingHandoff scrim + phase2-ready-or-wait
                  // gate Mike's own completion uses — one source of truth for "is Sarah/James's
                  // content ready yet", instead of this button polling a second, different flag.
                  stopAllInterviewerAudio();
                  mikeVideoRef.current?.pause();
                  handleMikeIntroDone();
                }}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '10px 28px',
                  color: 'var(--text-2)', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(79,142,247,0.5)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
              >
                Skip Intro →
              </button>
            </motion.div>
          )}

          {/* ── INTERVIEWER INTRO ─────────────────────────────────────────── */}
          {phase === 'interviewer-intro' && (
            <motion.div key="int-intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                      style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                    <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>Your interviewers are introducing themselves…</div>
                  </div>
                  <button
                    onClick={() => { stopAllInterviewerAudio(); setHrState('idle'); setTechState('idle'); askQuestion(0); }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '16px', flexShrink: 0 }}
                  >
                    Skip Intro →
                  </button>
                </div>
                {/* Animated bullet points */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { icon: '🎙️', text: 'When a question appears, click Record to start your answer' },
                    { icon: '⏹️', text: 'Click Stop when you\'ve finished speaking' },
                    { icon: '↩️', text: 'Use Repeat if you\'d like to hear the question again' },
                    { icon: '⏸️', text: 'Hit Pause anytime you need a moment to collect your thoughts' },
                    { icon: '✨', text: 'Speak naturally — take your time and don\'t worry about being perfect' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.55, duration: 0.45, ease: 'easeOut' }}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}
                    >
                      <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.45 }}>{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ASKING / ANSWERING / SCORING ─────────────────────────────── */}
          {(phase === 'asking' || phase === 'answering' || phase === 'scoring') && q && (
            <div>

              {/* Question card — animates per question, independent of answer panel */}
              <AnimatePresence mode="sync">
                <motion.div key={`q-${qIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                    {phase === 'asking' && (
                      <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                        style={{ width: '7px', height: '7px', borderRadius: '50%', background: isHrQuestion ? '#a78bfa' : 'var(--blue)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: '10px', fontWeight: 700, color: isHrQuestion ? '#a78bfa' : 'var(--blue)', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '3px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {isHrQuestion ? 'Sarah · HR' : `James · ${specialistTitle}`}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '3px 8px' }}>{selectedDifficulty}</span>
                    {phase === 'answering' && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                        <button onClick={repeatQuestion} style={{ background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.35)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: 'var(--blue)', cursor: 'pointer' }}>
                          ↩ Repeat
                        </button>
                        <button onClick={handlePause} style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.30)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: '#34D399', cursor: 'pointer' }}>
                          ⏸ Pause
                        </button>
                        <button onClick={handlePass} style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '7px', padding: '5px 13px', fontSize: '11px', fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}>
                          Pass →
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.55, minHeight: '28px' }}>
                    {displayedQuestion}
                    {phase === 'asking' && displayedQuestion.length < (q.questionText?.length ?? 0) && (
                      <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} style={{ marginLeft: '2px', color: isHrQuestion ? '#a78bfa' : 'var(--blue)' }}>▌</motion.span>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Answer area — always mounted, never animates between questions */}
              {(phase === 'asking' || phase === 'answering') && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>

                  {/* Left — answer input (3/4) */}
                  <div style={{ flex: 3, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {useVoice && (
                      <VoiceInput
                        onTranscript={(text, meta) => submitAnswer(text, meta, true)}
                        onInterimTranscript={() => {}}
                        highlightRecord={highlightRecord}
                        disabled={phase !== 'answering'}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      {useVoice && <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Or type your answer</div>}
                      <textarea
                        value={typedAnswer}
                        onChange={e => setTypedAnswer(e.target.value)}
                        placeholder="Type your answer here…"
                        rows={3}
                        style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', color: 'var(--text)', fontSize: '14px', lineHeight: 1.65, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>
                    {typedAnswer.trim() && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => submitAnswer(typedAnswer, undefined, false)}
                          style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '9px', padding: '8px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                          Submit Answer
                        </button>
                      </div>
                    )}

                    {/* Previous answers log */}
                    {sessionAnswers.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0 }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Previous Answers</div>
                        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0, paddingRight: '2px' }}>
                          {sessionAnswers.map((sa, i) => {
                            const pct = Math.round(sa.score.overallScore * 100);
                            const scoreColor = pct >= 70 ? '#34D399' : pct >= 50 ? '#F59E0B' : '#EF4444';
                            const passed = sa.answerText === '';
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', flexShrink: 0 }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, color: passed ? 'var(--text-3)' : scoreColor, minWidth: '32px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', lineHeight: 1.4 }}>
                                  {passed ? '—' : <>{pct}<span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--text-3)' }}>%</span></>}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.5, flex: 1 }}>
                                  {sa.question.questionText}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right — session stats (1/4) */}
                  <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Progress */}
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Progress</div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                        {questions.map((_, i) => (
                          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < qIndex ? 'var(--blue)' : i === qIndex ? 'rgba(79,142,247,0.4)' : 'var(--bg3)' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Q{qIndex + 1} of {questions.length}</div>
                    </div>

                    {/* Timer */}
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Time on answer</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: elapsed > 120 ? 'var(--amber)' : 'var(--text)' }}>{fmt(elapsed)}</div>
                    </div>

                    {/* Running score */}
                    {avgScore !== null && (
                      <div>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Avg score</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: scoreColor }}>{avgScore}%</div>
                      </div>
                    )}

                    {/* Coaching cue */}
                    <motion.div
                      key={coachingCue}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Coach</div>
                      <div style={{ fontSize: '11px', lineHeight: 1.5, color: 'rgba(167,139,250,0.9)', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '8px', padding: '8px 10px' }}>
                        {coachingCue}
                      </div>
                    </motion.div>

                    {/* Percentile benchmark card */}
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      style={{
                        background: 'linear-gradient(135deg, rgba(79,142,247,0.10) 0%, rgba(167,139,250,0.08) 100%)',
                        border: '1px solid rgba(79,142,247,0.22)',
                        borderRadius: '10px',
                        padding: '10px 11px',
                      }}
                    >
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(79,142,247,0.7)', marginBottom: '5px' }}>Benchmark</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.5 }}>
                        Top 5% of candidates scored <span style={{ color: '#34D399' }}>8/10</span> for this role
                      </div>
                      <div style={{ marginTop: '7px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '5%' }}
                          transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                          style={{ height: '100%', background: 'linear-gradient(90deg, var(--blue), #a78bfa)', borderRadius: '2px' }}
                        />
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '4px' }}>You are in the top 5th percentile</div>
                    </motion.div>

                    {/* Difficulty — fixed at intake, before questions were even generated for it;
                        read-only here, not a live control. Editing it mid-session used to be
                        possible via this same spot but did nothing except desync the displayed
                        label from the difficulty the questions/scoring were actually built for. */}
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Difficulty</div>
                      <div
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          fontSize: '11px', fontWeight: 700, padding: '6px 10px', borderRadius: '8px',
                          background: selectedDifficulty === 'Expert' ? 'rgba(239,68,68,0.12)' : selectedDifficulty === 'Pro' ? 'rgba(245,158,11,0.12)' : 'rgba(52,211,153,0.1)',
                          color: selectedDifficulty === 'Expert' ? '#EF4444' : selectedDifficulty === 'Pro' ? '#F59E0B' : '#34D399',
                          border: `1px solid ${selectedDifficulty === 'Expert' ? 'rgba(239,68,68,0.3)' : selectedDifficulty === 'Pro' ? 'rgba(245,158,11,0.3)' : 'rgba(52,211,153,0.25)'}`,
                        }}
                      >
                        {selectedDifficulty}
                      </div>
                    </div>

                    {/* Pause */}
                    <div style={{ marginTop: 'auto' }}>
                      <button onClick={handlePause} style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                        borderRadius: '9px', padding: '8px 0', fontSize: '11px', fontWeight: 700,
                        color: 'var(--text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>
                        Pause
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* Scoring spinner */}
              {phase === 'scoring' && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '8px 28px' }}>
                  <ChairSpinner label="Analysing your answer…" size={100} />
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Coaching overlay */}
      {phase === 'coaching' && coachingMessage && (
        <CoachingOverlay key={qIndex} message={coachingMessage} score={currentScore} onDone={nextQuestion} />
      )}

      {/* Pause overlay */}
      <AnimatePresence>
        {paused && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '40px 36px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏸</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>Interview paused</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '28px' }}>
                Take a moment. When you resume, the current question will replay so you can hear it again.
              </div>
              <button onClick={handleResume}
                style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '11px', padding: '13px 36px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                ▶ Resume Interview
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
