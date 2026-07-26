import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewerAvatar, type AvatarState } from '../components/InterviewerAvatar';
import { VoiceInput, type TranscriptMeta } from '../components/VoiceInput';
import type { InterviewQuestion, ScoreResponse } from '../api/explainApi';
import { speak, elevenLabsConfigured } from '../api/ttsApi';
import { type CVContext, type JobSpecContext } from '../utils/contextBuilder';
import { CoachingOverlay } from '../components/CoachingOverlay';
import { generateCoachingMessage, type CoachingMessage } from '../utils/coachingEngine';
import { scoreWithAI, coachWithAI, aiScoringConfigured } from '../api/aiScoring';
import { createTalk, didConfigured } from '../api/didApi';

// ── Demo questions ─────────────────────────────────────────────────────────────

const DEMO_QUESTIONS: InterviewQuestion[] = [
  // Technical first (James asks these)
  {
    questionId: 'q1',
    questionText: 'Walk me through the most technically complex system you have designed. What trade-offs did you make and what would you do differently now?',
    modelAnswer: 'Cover: context and scale, architectural decisions, trade-offs you consciously made, how you validated the design, and what you would do differently.',
    questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['core competency', 'problem-solving'],
  },
  {
    questionId: 'q2',
    questionText: 'How do you ensure engineering quality when under significant time pressure? Give me a specific example.',
    modelAnswer: 'Cover: what you cut vs what is non-negotiable (security, core tests), how you communicate risk to the business, and how you pay back tech debt after.',
    questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['delivery', 'quality'],
  },
  {
    questionId: 'q3',
    questionText: 'Describe a system you had to refactor or re-architect. What triggered it, how did you manage the migration, and what was the outcome?',
    modelAnswer: 'Cover: the trigger (tech debt, scaling, new requirements), your migration strategy, how you managed risk, and measurable improvement after.',
    questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['problem-solving', 'accountability', 'delivery'],
  },
  // HR / team-fit last (Sarah asks these)
  {
    questionId: 'q4',
    questionText: 'What do you know about Vallum Associates and why does this role appeal to you specifically?',
    modelAnswer: 'Mention: specialist executive recruitment firm in financial services; 40-person engineering team; core banking platform modernisation from monolith to microservices; £8m budget; Azure cloud migration. Tie to your own experience and motivations.',
    questionType: 'Behavioural', difficulty: 'Easy', source: 'HR', competencyTags: ['company knowledge', 'motivation', 'research'],
  },
  {
    questionId: 'q5',
    questionText: 'Describe a time you had to deliver difficult feedback to a senior stakeholder. How did you approach it and what happened?',
    modelAnswer: 'Use STAR. Show you prepared, chose the right setting, led with facts not feelings, listened to their response, and maintained the relationship.',
    questionType: 'Behavioural', difficulty: 'Medium', source: 'HR', competencyTags: ['stakeholder management', 'communication'],
  },
];

// ── Local scoring fallback ────────────────────────────────────────────────────

const VALLUM_FACTS = ['microservice', 'monolith', 'core banking', 'azure', 'eight million', '£8m', '8m', 'forty', '40', 'financial service', 'regulated', 'executive recruitment', 'vallum'];

function localScore(q: InterviewQuestion, answer: string): ScoreResponse {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const len = words.length;
  const lower = answer.toLowerCase();
  const clarity = Math.min(1, len / 80) * 0.8 + (answer.includes('.') ? 0.2 : 0);
  const relevance = q.competencyTags.some(t => lower.includes(t)) ? 0.65 : 0.4;
  const depth = /\d+/.test(answer) ? 0.7 : lower.includes('result') || lower.includes('outcome') ? 0.6 : 0.4;
  const confidence = lower.includes('i led') || lower.includes('i built') || lower.includes('i delivered') ? 0.8
    : lower.includes('i think') || lower.includes('maybe') ? 0.35 : 0.55;

  // Company knowledge bonus — rewards candidates who researched Vallum facts
  const isCompanyKnowledgeQ = q.competencyTags.includes('company knowledge');
  const factsHit = isCompanyKnowledgeQ ? VALLUM_FACTS.filter(f => lower.includes(f)).length : 0;
  const companyBonus = isCompanyKnowledgeQ ? Math.min(0.2, factsHit * 0.05) : 0;

  const overall = Math.min(1, Math.round((clarity * 0.25 + relevance * 0.35 + depth * 0.25 + confidence * 0.15 + companyBonus) * 10000) / 10000);
  return {
    clarity, relevance, depth, confidence, overallScore: overall,
    feedback: [
      { dimension: 'clarity', message: len < 40 ? 'Your answer is quite short — aim for at least 60 words.' : 'Good length and structure.', severity: len < 40 ? 'high' : 'low' },
      { dimension: 'depth', message: isCompanyKnowledgeQ
          ? factsHit >= 3 ? 'Excellent research — you clearly know the business.' : factsHit >= 1 ? 'Good start — mention the core banking modernisation and Azure migration for full marks.' : 'Show your research: mention the microservices modernisation, Azure, and the £8m budget.'
          : depth < 0.5 ? 'Add a concrete metric or named outcome to strengthen your answer.' : 'Good use of specifics.',
        severity: isCompanyKnowledgeQ ? (factsHit >= 3 ? 'low' : factsHit >= 1 ? 'medium' : 'high') : depth < 0.5 ? 'medium' : 'low' },
    ],
    suggestions: isCompanyKnowledgeQ && factsHit < 3
      ? ['Name at least 3 specific facts: core banking monolith-to-microservices migration, Azure cloud, £8m programme budget, 40-person team.']
      : len < 40 ? ['Use the STAR format to structure your answer.'] : [],
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomState {
  cvCtx?: CVContext;
  jobCtx?: JobSpecContext;
  questions?: InterviewQuestion[];
  sarahIntro?: string;
  jamesIntro?: string;
  specialistTitle?: string;
  mikeScript?: string | null;
  companyFacts?: string[];
}

interface SessionAnswer {
  question: InterviewQuestion;
  answerText: string;
  meta?: TranscriptMeta;
  score: ScoreResponse;
  answeredByVoice: boolean;
  thinkTimeMs?: number;
}

type RoomPhase =
  | 'intro'
  | 'agent-briefing'
  | 'prerendering'
  | 'interviewer-intro'
  | 'asking'
  | 'answering'
  | 'scoring'
  | 'coaching'
  | 'done';

// ── Main Component ────────────────────────────────────────────────────────────

export default function InterviewRoom() {
  useParams<{ packId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = (location.state ?? {}) as RoomState;
  const questions = ctx.questions ?? DEMO_QUESTIONS;
  const cvCtx = ctx.cvCtx;
  const jobCtx = ctx.jobCtx;
  const specialistTitle = ctx.specialistTitle ?? 'Hiring Manager';

  const mikeScript = ctx.mikeScript ??
    "Hi, I'm Mike — your interview consultant for today. Quick company brief before you go in. Vallum Associates is a specialist executive recruitment firm based in London, known for placing senior leaders into financial services and regulated industries. They've been growing fast — the digital transformation programme you'd be leading has a forty-person engineering team and an eight-million-pound annual budget. The CTO you'd report to built the current platform, so he'll probe deeply on architecture decisions. Key things they care about: cloud migration experience — Azure specifically — stakeholder management at C-level, and how you balance speed with engineering quality. If they ask what you know about the company, mention the core banking modernisation from monolith to microservices — that's the heart of the role. Right — Sarah and James are ready. Good luck.";

  const [phase, setPhase] = useState<RoomPhase>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [useVoice, setUseVoice] = useState(true);
  const [currentScore, setCurrentScore] = useState<ScoreResponse | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<SessionAnswer[]>([]);
  const [hrState, setHrState] = useState<AvatarState>('idle');
  const [techState, setTechState] = useState<AvatarState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [coachingMessage, setCoachingMessage] = useState<CoachingMessage | null>(null);
  const [hrVideoUrl, setHrVideoUrl] = useState<string | null>(null);
  const [techVideoUrl, setTechVideoUrl] = useState<string | null>(null);
  const [mikeVideoUrl, setMikeVideoUrl] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [runningScores, setRunningScores] = useState<number[]>([]);
  const [audioCheckState, setAudioCheckState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [prerenderProgress, setPrerenderProgress] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelSpeakRef = useRef<(() => void) | null>(null);
  const thinkStartRef = useRef<number>(0);
  const pausedPhaseRef = useRef<RoomPhase>('answering');
  const onDoneRef = useRef<(() => void) | null>(null);
  const didCacheRef = useRef<Map<number, string>>(new Map());

  const q = questions[qIndex];
  const isHrQuestion = q.source === 'HR';

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

  const prefetchDid = useCallback(async (index: number) => {
    if (!didConfigured || didCacheRef.current.has(index)) return;
    const question = questions[index];
    if (!question) return;
    const role: 'hr' | 'technical' = question.source === 'HR' ? 'hr' : 'technical';
    try {
      const { videoUrl } = await createTalk(question.questionText, role);
      didCacheRef.current.set(index, videoUrl);
    } catch { /* silent — ElevenLabs fallback will be used */ }
  }, [questions]);

  const askQuestion = useCallback(async (index: number) => {
    const question = questions[index];
    const interviewer: 'hr' | 'technical' = question.source === 'HR' ? 'hr' : 'technical';
    setPhase('asking');
    setHrVideoUrl(null);
    setTechVideoUrl(null);

    const onDone = () => {
      onDoneRef.current = null;
      setHrState('idle'); setTechState('idle');
      thinkStartRef.current = Date.now();
      setPhase('answering');
    };

    if (didConfigured) {
      // Show thinking while we wait for D-ID to render the video
      if (interviewer === 'hr') { setHrState('thinking'); setTechState('listening'); }
      else { setTechState('thinking'); setHrState('listening'); }
      try {
        let videoUrl = didCacheRef.current.get(index);
        if (!videoUrl) {
          const result = await createTalk(question.questionText, interviewer);
          videoUrl = result.videoUrl;
          didCacheRef.current.set(index, videoUrl);
        }
        onDoneRef.current = onDone;
        if (interviewer === 'hr') { setHrVideoUrl(videoUrl); setHrState('speaking'); }
        else { setTechVideoUrl(videoUrl); setTechState('speaking'); }
        return;
      } catch { /* fall through to ElevenLabs */ }
    }

    // ElevenLabs / Web Speech fallback
    if (interviewer === 'hr') { setHrState('speaking'); setTechState('listening'); }
    else { setTechState('speaking'); setHrState('listening'); }
    cancelSpeakRef.current = speak(question.questionText, interviewer, onDone);
  }, [questions, prefetchDid]);

  const repeatQuestion = useCallback(() => {
    cancelSpeakRef.current?.();
    askQuestion(qIndex);
  }, [qIndex, askQuestion]);

  const testAudio = useCallback(() => {
    setAudioCheckState('playing');
    speak("Hi there! I'm Sarah, your HR interviewer.", 'hr', () => {
      speak("And I'm James, the technical interviewer. Great — you can hear us both clearly!", 'technical', () => setAudioCheckState('done'));
    });
  }, []);

  const beginInterviewIntro = useCallback(() => {
    setPhase('interviewer-intro');
    setHrState('speaking');
    const sarahText = ctx.sarahIntro ??
      "Welcome to your interview. When you're ready to answer, click the record button, speak naturally, then click Stop. You'll get instant feedback after each answer. Let's begin.";
    cancelSpeakRef.current = speak(sarahText, 'hr', () => {
      setHrState('idle');
      if (ctx.jamesIntro) {
        setTechState('speaking');
        cancelSpeakRef.current = speak(ctx.jamesIntro!, 'technical', () => {
          setTechState('idle');
          setTimeout(() => askQuestion(0), 300);
        });
      } else {
        setTimeout(() => askQuestion(0), 300);
      }
    });
  }, [askQuestion, ctx.sarahIntro, ctx.jamesIntro]);

  const startInterview = useCallback(async () => {
    if (didConfigured) {
      // Pre-render only question 0 before starting — subsequent questions are
      // prefetched by prefetchDid() during coaching/scoring after each answer.
      const prerenderFirst = async () => {
        setPrerenderProgress(0);
        const q = questions[0];
        if (q && !didCacheRef.current.has(0)) {
          const role: 'hr' | 'technical' = q.source === 'HR' ? 'hr' : 'technical';
          try {
            const { videoUrl } = await createTalk(q.questionText, role);
            didCacheRef.current.set(0, videoUrl);
          } catch { /* ElevenLabs fallback */ }
        }
        setPrerenderProgress(100);
      };

      if (mikeScript) {
        // Show Mike's briefing while question 0 renders in the background
        setPhase('agent-briefing');
        try {
          const [{ videoUrl }] = await Promise.all([
            createTalk(mikeScript, 'agent'),
            prerenderFirst(),
          ]);
          setMikeVideoUrl(videoUrl);
          // Video autoplays with its own audio — do NOT also call speak() here
        } catch {
          // D-ID failed: fall back to voice-only Mike, then chain into intro
          cancelSpeakRef.current?.();
          cancelSpeakRef.current = speak(mikeScript, 'technical', () => {
            cancelSpeakRef.current = null;
            beginInterviewIntro();
          });
          await prerenderFirst();
        }
      } else {
        setPhase('prerendering');
        await prerenderFirst();
        beginInterviewIntro();
      }
    } else {
      if (mikeScript) {
        setPhase('agent-briefing');
        speak(mikeScript, 'technical', () => beginInterviewIntro());
      } else {
        beginInterviewIntro();
      }
    }
  }, [askQuestion, questions, ctx.mikeScript, beginInterviewIntro]);

  useEffect(() => {
    return () => { cancelSpeakRef.current?.(); };
  }, []);

  const handlePause = useCallback(() => {
    pausedPhaseRef.current = phase;
    cancelSpeakRef.current?.();
    if (timerRef.current) clearInterval(timerRef.current);
    setPaused(true);
  }, [phase]);

  const handleResume = useCallback(() => {
    setPaused(false);
    if (pausedPhaseRef.current === 'asking' || pausedPhaseRef.current === 'interviewer-intro') {
      // Re-ask question — user needs to hear it again
      setTimeout(() => askQuestion(qIndex), 200);
    }
  }, [askQuestion, qIndex]);

  const nextQuestion = useCallback(() => {
    setCurrentScore(null);
    setTypedAnswer('');
    setCoachingMessage(null);
    if (qIndex + 1 >= questions.length) {
      navigate(`/interview-summary/session-${Date.now()}`, { state: { answers: sessionAnswers, cvCtx, jobCtx } });
    } else {
      const next = qIndex + 1;
      setQIndex(next);
      askQuestion(next);
    }
  }, [qIndex, questions.length, sessionAnswers, navigate, askQuestion]);

  const handlePass = useCallback(() => {
    const thinkTimeMs = thinkStartRef.current > 0 ? Date.now() - thinkStartRef.current : undefined;
    thinkStartRef.current = 0;
    const passScore: ScoreResponse = {
      clarity: 0, relevance: 0, depth: 0, confidence: 0, overallScore: 0,
      feedback: [{ dimension: 'overall', message: 'Question passed — no answer given.', severity: 'high' }],
      suggestions: ['Attempt all questions in a real interview — passing signals lack of preparation.'],
    };
    setRunningScores(prev => [...prev, 0]);
    setSessionAnswers(prev => [...prev, { question: q, answerText: '', score: passScore, answeredByVoice: false, thinkTimeMs, meta: undefined }]);
    // Skip coaching — advance directly
    setCurrentScore(null);
    setCoachingMessage(null);
    setTypedAnswer('');
    if (qIndex + 1 >= questions.length) {
      navigate(`/interview-summary/session-${Date.now()}`, { state: { answers: [...sessionAnswers, { question: q, answerText: '', score: passScore, answeredByVoice: false, thinkTimeMs }], cvCtx, jobCtx } });
    } else {
      const next = qIndex + 1;
      setQIndex(next);
      askQuestion(next);
    }
  }, [q, qIndex, questions.length, sessionAnswers, navigate, askQuestion]);

  const submitAnswer = useCallback(async (text: string, meta?: TranscriptMeta, byVoice = false) => {
    if (!text.trim()) return;
    const thinkTimeMs = thinkStartRef.current > 0 ? Date.now() - thinkStartRef.current : undefined;
    thinkStartRef.current = 0;

    setPhase('scoring');
    setHrState('thinking'); setTechState('thinking');

    let score: ScoreResponse;
    try {
      score = aiScoringConfigured
        ? await scoreWithAI(q, text, cvCtx, jobCtx)
        : localScore(q, text);
    } catch {
      score = localScore(q, text);
    }

    setCurrentScore(score);
    setRunningScores(prev => [...prev, score.overallScore]);
    setSessionAnswers(prev => [...prev, { question: q, answerText: text, meta, score, answeredByVoice: byVoice, thinkTimeMs }]);
    setHrState('idle'); setTechState('idle');

    let coaching: CoachingMessage;
    try {
      coaching = aiScoringConfigured
        ? await coachWithAI(q, text, score, cvCtx, jobCtx, thinkTimeMs)
        : generateCoachingMessage(score, q, text, cvCtx, jobCtx);
    } catch {
      coaching = generateCoachingMessage(score, q, text, cvCtx, jobCtx);
    }

    setCoachingMessage(coaching);
    setPhase('coaching');
    prefetchDid(qIndex + 1); // pre-render next question's video while user reads feedback
  }, [q, qIndex, cvCtx, jobCtx, prefetchDid]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const progress = (qIndex + (phase === 'scoring' ? 1 : 0)) / questions.length;

  const scoreColor = avgScore === null ? 'var(--text-3)'
    : avgScore >= 70 ? '#34D399'
    : avgScore >= 50 ? '#F59E0B'
    : '#EF4444';

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      fontFamily: '-apple-system,"Segoe UI",sans-serif',
      display: 'flex', flexDirection: 'column',
      userSelect: 'none',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--blue)' }}>
            Explain · Interview Room
          </div>
          {phase !== 'intro' && (
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
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {phase === 'answering' && (
            <div style={{ fontSize: '13px', fontWeight: 700, color: elapsed > 120 ? 'var(--amber)' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</div>
          )}
          {phase !== 'intro' && phase !== 'done' && (
            <button
              onClick={handlePause}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 12px', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer' }}
              title="Pause interview"
            >
              ⏸ Pause
            </button>
          )}
          <button onClick={() => {
            cancelSpeakRef.current?.();
            if (sessionAnswers.length > 0) {
              navigate(`/interview-summary/session-${Date.now()}`, { state: { answers: sessionAnswers, cvCtx, jobCtx } });
            } else {
              navigate(-1);
            }
          }}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 14px', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer' }}>
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

        {/* Avatars */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <InterviewerAvatar role="hr" state={hrState} active={isHrQuestion && phase !== 'answering'} videoUrl={hrVideoUrl} onVideoEnded={() => onDoneRef.current?.()} />
          <InterviewerAvatar role="technical" state={techState} active={!isHrQuestion && phase !== 'answering'} videoUrl={techVideoUrl} specialistTitle={specialistTitle} onVideoEnded={() => onDoneRef.current?.()} />
        </div>

        <AnimatePresence mode="wait">
          {/* Intro screen */}
          {phase === 'prerendering' && (
            <motion.div key="prerendering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>Almost ready…</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '28px' }}>
                Generating your first interviewer video. This takes about 20 seconds.
              </div>
              <div style={{ background: 'var(--bg3)', borderRadius: '99px', height: '8px', width: '100%', maxWidth: '360px', margin: '0 auto 16px', overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${Math.min(prerenderProgress, 100)}%` }}
                  transition={{ duration: 0.4 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, var(--blue), #a78bfa)', borderRadius: '99px' }}
                />
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{Math.round(Math.min(prerenderProgress, 100))}% ready</div>
            </motion.div>
          )}

          {phase === 'agent-briefing' && (
            <motion.div key="agent-briefing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center', maxWidth: '560px', margin: '0 auto' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--blue)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>Your Interview Consultant</div>
              <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 20px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', border: '3px solid var(--blue)' }}>
                {mikeVideoUrl ? (
                  <video
                    src={mikeVideoUrl}
                    autoPlay
                    muted
                    playsInline
                    onEnded={beginInterviewIntro}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img src="/images/mike.png" alt="Mike" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>Mike</div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '20px' }}>Interview Consultant</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '24px', minHeight: '48px' }}>
                <em>"{mikeScript}"</em>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ background: 'var(--bg3)', borderRadius: '99px', height: '4px', width: '180px', overflow: 'hidden' }}>
                  <motion.div
                    animate={{ width: `${Math.min(prerenderProgress, 100)}%` }}
                    transition={{ duration: 0.4 }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, var(--blue), #a78bfa)', borderRadius: '99px' }}
                  />
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-3)', minWidth: '36px' }}>{Math.round(Math.min(prerenderProgress, 100))}%</span>
              </div>
              <button
                onClick={beginInterviewIntro}
                style={{ fontSize: '13px', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Skip briefing →
              </button>
            </motion.div>
          )}

          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>Ready for your interview?</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 20px' }}>
                You'll be asked {questions.length} questions by Sarah (HR) and James ({specialistTitle}). Answer by speaking or typing.
                The interview flows continuously — coaching leads straight to the next question, just like the real thing.
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: didConfigured ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${didConfigured ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', padding: '6px 14px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: didConfigured ? '#34D399' : 'var(--amber)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: didConfigured ? '#34D399' : 'var(--amber)' }}>
                    {didConfigured ? 'D-ID Talking Faces active' : 'Faces unavailable'}
                  </span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: elevenLabsConfigured ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${elevenLabsConfigured ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', padding: '6px 14px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: elevenLabsConfigured ? '#34D399' : 'var(--amber)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: elevenLabsConfigured ? '#34D399' : 'var(--amber)' }}>
                    {elevenLabsConfigured ? 'ElevenLabs Neural Voices active' : 'Using browser voices'}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={testAudio}
                  disabled={audioCheckState === 'playing'}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${audioCheckState === 'done' ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
                    borderRadius: '8px', padding: '7px 18px',
                    fontSize: '13px', fontWeight: 600, cursor: audioCheckState === 'playing' ? 'default' : 'pointer',
                    color: audioCheckState === 'done' ? '#34D399' : 'var(--text-2)',
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                  }}
                >
                  {audioCheckState === 'playing' && <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--blue)', animation: 'pulse 1s infinite' }} />}
                  {audioCheckState === 'done' ? '✓ Audio working' : audioCheckState === 'playing' ? 'Playing…' : '🔊 Test audio'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer' }}>
                  <input type="radio" checked={useVoice} onChange={() => setUseVoice(true)} style={{ accentColor: 'var(--blue)' }} />
                  Speak my answers (recommended)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer' }}>
                  <input type="radio" checked={!useVoice} onChange={() => setUseVoice(false)} style={{ accentColor: 'var(--blue)' }} />
                  Type my answers
                </label>
              </div>
              <button onClick={startInterview} style={{
                background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '11px',
                padding: '14px 40px', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              }}>
                Start Interview
              </button>
            </motion.div>
          )}

          {/* Question / answering display */}
          {(phase === 'asking' || phase === 'answering' || phase === 'scoring' || phase === 'interviewer-intro') && (
            <motion.div key={`q-${qIndex}-${phase}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Question card */}
              {phase !== 'interviewer-intro' && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px', marginBottom: '16px' }}>
                  {phase === 'asking' ? (
                    <div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                          style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />
                        <div style={{ fontSize: '15px', color: 'var(--text-2)', fontStyle: 'italic' }}>Interviewer is speaking…</div>
                      </div>
                      {/* Repeat button */}
                      <button
                        onClick={repeatQuestion}
                        style={{
                          background: 'none', border: '1px solid var(--border)', borderRadius: '7px',
                          padding: '6px 14px', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer',
                        }}
                      >
                        ↩ Repeat question
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: isHrQuestion ? '#a78bfa' : 'var(--blue)', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', padding: '3px 8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          {isHrQuestion ? 'Sarah · HR' : `James · ${specialistTitle}`}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '3px 8px' }}>{q.difficulty}</span>
                      </div>
                      <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.55 }}>{q.questionText}</div>
                    </>
                  )}
                </div>
              )}

              {phase === 'interviewer-intro' && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                        style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                      <div style={{ fontSize: '14px', color: 'var(--text-2)' }}>Your interviewers are introducing themselves…</div>
                    </div>
                    <button
                      onClick={() => { cancelSpeakRef.current?.(); setHrState('idle'); setTechState('idle'); askQuestion(0); }}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '16px', flexShrink: 0 }}
                    >
                      Skip Intro →
                    </button>
                  </div>
                </div>
              )}

              {/* Answer area */}
              {phase === 'answering' && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {useVoice ? (
                    <VoiceInput
                      onTranscript={(text, meta) => submitAnswer(text, meta, true)}
                      onInterimTranscript={() => {}}
                    />
                  ) : null}
                  <div>
                    {useVoice && <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Or type your answer</div>}
                    <textarea
                      value={typedAnswer}
                      onChange={e => setTypedAnswer(e.target.value)}
                      placeholder="Type your answer here…"
                      rows={4}
                      style={{
                        width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                        borderRadius: '10px', padding: '14px', color: 'var(--text)', fontSize: '14px',
                        lineHeight: 1.65, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      <button
                        onClick={handlePass}
                        title="Skip this question — counts as 0 in your final score"
                        style={{
                          background: 'none', border: '1px solid var(--border)', borderRadius: '9px',
                          padding: '10px 20px', fontSize: '13px', fontWeight: 600,
                          color: 'var(--text-3)', cursor: 'pointer', letterSpacing: '0.02em',
                        }}
                      >
                        Pass →
                      </button>
                      {typedAnswer.trim() && (
                        <button onClick={() => submitAnswer(typedAnswer, undefined, false)} style={{
                          background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '9px',
                          padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                        }}>Submit Answer</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Scoring spinner */}
              {phase === 'scoring' && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', margin: '0 auto 14px' }} />
                  <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>Analysing your answer…</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Coaching overlay — auto-advances to next question on dismiss */}
      {phase === 'coaching' && coachingMessage && (
        <CoachingOverlay
          key={qIndex}
          message={coachingMessage}
          score={currentScore}
          onDone={nextQuestion}
        />
      )}

      {/* Pause overlay */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
            }}
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px',
                padding: '40px 36px', textAlign: 'center', maxWidth: '400px', width: '100%',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏸</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>Interview paused</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '28px' }}>
                Take a moment. When you resume, the current question will replay so you can hear it again.
              </div>
              <button
                onClick={handleResume}
                style={{
                  background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '11px',
                  padding: '13px 36px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', width: '100%',
                }}
              >
                ▶ Resume Interview
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
