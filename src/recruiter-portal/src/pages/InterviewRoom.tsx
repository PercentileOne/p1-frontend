import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewerAvatar, type AvatarState } from '../components/InterviewerAvatar';
import { VoiceInput, type TranscriptMeta } from '../components/VoiceInput';
import type { InterviewQuestion, ScoreResponse } from '../api/explainApi';
import { speak, elevenLabsConfigured } from '../api/ttsApi';
import { type CVContext, type JobSpecContext } from '../utils/contextBuilder';
import { CoachingOverlay } from '../components/CoachingOverlay';
import { generateCoachingMessage, type CoachingMessage } from '../utils/coachingEngine';
import { scoreWithAI, coachWithAI, aiScoringConfigured, sessionPrepareClient } from '../api/aiScoring';
import { pickRandomCompany, type Company } from '../data/companyBank';
import { logFlowEvent } from '../api/flowLogger';

// ── Demo fallback questions ───────────────────────────────────────────────────

function buildDemoQuestions(company: Company): InterviewQuestion[] {
  return [
    {
      questionId: 'q1',
      questionText: 'Walk me through the most complex challenge you have faced in this type of role. What did you do and what was the outcome?',
      modelAnswer: 'Cover: context, your specific actions, trade-offs made, and the measurable result.',
      questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['problem-solving'],
    },
    {
      questionId: 'q2',
      questionText: 'Tell me about a time you had to deliver under significant pressure. How did you manage it?',
      modelAnswer: 'Cover: the pressures involved, your approach, how you prioritised, and the outcome.',
      questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['delivery', 'resilience'],
    },
    {
      questionId: 'q3',
      questionText: 'Describe a situation where you had to work closely with a team to achieve something difficult. What role did you play?',
      modelAnswer: 'Cover: the team dynamic, your specific contribution, any conflict or challenge, and the result.',
      questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['teamwork', 'collaboration'],
    },
    {
      questionId: 'q4',
      questionText: `What do you know about ${company.name} and why does this role specifically appeal to you?`,
      modelAnswer: `Show genuine research into ${company.name}. Connect their mission to your own motivations and experience.`,
      questionType: 'Behavioural', difficulty: 'Easy', source: 'HR', competencyTags: ['company knowledge', 'motivation'],
    },
    {
      questionId: 'q5',
      questionText: 'Describe a time you delivered difficult feedback to someone. How did you approach it?',
      modelAnswer: 'Use STAR. Emphasise empathy, specificity, listening to the response, and the relationship outcome.',
      questionType: 'Behavioural', difficulty: 'Medium', source: 'HR', competencyTags: ['communication', 'stakeholder management'],
    },
  ];
}

// ── Local scoring fallback ────────────────────────────────────────────────────

function localScore(q: InterviewQuestion, answer: string, companyKeywords: string[] = []): ScoreResponse {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const len = words.length;
  const lower = answer.toLowerCase();
  const clarity = Math.min(1, len / 80) * 0.8 + (answer.includes('.') ? 0.2 : 0);
  const relevance = q.competencyTags.some(t => lower.includes(t)) ? 0.65 : 0.4;
  const depth = /\d+/.test(answer) ? 0.7 : lower.includes('result') || lower.includes('outcome') ? 0.6 : 0.4;
  const confidence = lower.includes('i led') || lower.includes('i built') || lower.includes('i delivered') ? 0.8
    : lower.includes('i think') || lower.includes('maybe') ? 0.35 : 0.55;
  const isCompanyKnowledgeQ = q.competencyTags.includes('company knowledge');
  const factsHit = isCompanyKnowledgeQ ? companyKeywords.filter(f => lower.includes(f)).length : 0;
  const companyBonus = isCompanyKnowledgeQ ? Math.min(0.2, factsHit * 0.05) : 0;
  const overall = Math.min(1, Math.round((clarity * 0.25 + relevance * 0.35 + depth * 0.25 + confidence * 0.15 + companyBonus) * 10000) / 10000);
  return {
    clarity, relevance, depth, confidence, overallScore: overall,
    feedback: [
      { dimension: 'clarity', message: len < 40 ? 'Your answer is quite short — aim for at least 60 words.' : 'Good length and structure.', severity: len < 40 ? 'high' : 'low' },
      { dimension: 'depth', message: depth < 0.5 ? 'Add a concrete metric or named outcome.' : 'Good use of specifics.', severity: depth < 0.5 ? 'medium' : 'low' },
    ],
    suggestions: len < 40 ? ['Use the STAR format to structure your answer.'] : [],
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
  jobSpecText?: string;
  cvText?: string;
  autoStart?: boolean;
  selectedLanguage?: string;
}

interface SessionAnswer {
  question: InterviewQuestion;
  answerText: string;
  meta?: TranscriptMeta;
  score: ScoreResponse;
  answeredByVoice: boolean;
  thinkTimeMs?: number;
}

// Mike-only phase, then full interview
type RoomPhase =
  | 'intro'
  | 'mike'
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
  const cvCtx = ctx.cvCtx;
  const jobCtx = ctx.jobCtx;

  const demoCompany = useMemo(() => pickRandomCompany(), []);

  // Background AI session prep results
  const [bgQuestions, setBgQuestions] = useState<InterviewQuestion[] | null>(null);
  const [bgSarahIntro, setBgSarahIntro] = useState<string | null>(null);
  const [bgJamesIntro, setBgJamesIntro] = useState<string | null>(null);
  const [bgMikeScript, setBgMikeScript] = useState<string | null>(null);
  const [bgCompanyFacts, setBgCompanyFacts] = useState<string[]>([]);
  const [bgSpecialistTitle, setBgSpecialistTitle] = useState<string | null>(null);
  const bgLoadRef = useRef(false);
  const bgLoadedRef = useRef(false); // true once AI results arrive

  // Derived values — prefer AI results, fall back to demo
  const questions = ctx.questions ?? bgQuestions ?? buildDemoQuestions(demoCompany);
  const companyKeywords = ctx.questions
    ? (ctx.companyFacts ?? [])
    : (bgCompanyFacts.length ? bgCompanyFacts : demoCompany.companyKnowledgeKeywords);
  const specialistTitle = ctx.specialistTitle ?? bgSpecialistTitle ?? 'Hiring Manager';
  const effectiveSarahIntro = ctx.sarahIntro ?? bgSarahIntro ?? undefined;
  const effectiveJamesIntro = ctx.jamesIntro ?? bgJamesIntro ?? undefined;

  // Mike's fallback script — used if AI hasn't loaded yet (it usually finishes before Mike)
  const fallbackMikeScript = `Hi there — I'm Mike, your recruitment consultant. I've set up your interview today and I want to give you a quick briefing before you meet the panel. Your interviewers today are Sarah, who heads up HR, and James, who'll be assessing you on the role itself. They'll ask you a series of questions — just answer naturally, take your time, and don't worry about being perfect. The best thing you can do is be specific: use real examples from your experience. I know you're well prepared, so back yourself. Good luck — I'll hand you over to Sarah and James now.`;
  const mikeScript = ctx.mikeScript ?? bgMikeScript ?? fallbackMikeScript;

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
  const [paused, setPaused] = useState(false);
  const [runningScores, setRunningScores] = useState<number[]>([]);
  const [audioCheckState, setAudioCheckState] = useState<'idle' | 'playing' | 'done'>('idle');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelSpeakRef = useRef<(() => void) | null>(null);
  const thinkStartRef = useRef<number>(0);
  const pausedPhaseRef = useRef<RoomPhase>('answering');
  const onDoneRef = useRef<(() => void) | null>(null);

  const q = questions[qIndex];
  const isHrQuestion = q?.source === 'HR';

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

  const askQuestion = useCallback((index: number) => {
    const question = questions[index];
    if (!question) return;
    const interviewer: 'hr' | 'technical' = question.source === 'HR' ? 'hr' : 'technical';
    setPhase('asking');
    onDoneRef.current = null;
    if (interviewer === 'hr') { setHrState('speaking'); setTechState('listening'); }
    else { setTechState('speaking'); setHrState('listening'); }
    logFlowEvent('QUESTION_DISPLAYED', { questionId: question.questionId, index, source: question.source });
    const onDone = () => {
      setHrState('idle'); setTechState('idle');
      thinkStartRef.current = Date.now();
      setPhase('answering');
    };
    cancelSpeakRef.current = speak(question.questionText, interviewer, onDone);
  }, [questions]);

  const repeatQuestion = useCallback(() => {
    cancelSpeakRef.current?.();
    askQuestion(qIndex);
  }, [qIndex, askQuestion]);

  const testAudio = useCallback(() => {
    setAudioCheckState('playing');
    speak("Hi there! I'm Sarah, your HR interviewer.", 'hr', () => {
      speak("And I'm James. Great — you can hear us both clearly!", 'technical', () => setAudioCheckState('done'));
    });
  }, []);

  const introStartedRef = useRef(false);

  const beginInterviewIntro = useCallback(() => {
    if (introStartedRef.current) return;
    introStartedRef.current = true;
    cancelSpeakRef.current?.();
    cancelSpeakRef.current = null;
    setPhase('interviewer-intro');
    logFlowEvent('INTERVIEW_PHASE_STARTED', {
      questionCount: questions.length,
      aiQuestionsLoaded: bgLoadedRef.current,
      specialistTitle,
    });
    setTimeout(() => {
      setHrState('speaking');
      const sarahText = effectiveSarahIntro ??
        "Hi — I'm Sarah, HR Director. Welcome. I'll be joined by James who'll lead the role-specific questions. We have a few questions for you — just speak naturally, take your time, and don't worry about being perfect. Ready when you are.";
      const jamesText = effectiveJamesIntro ??
        "And I'm James — looking forward to hearing about your experience. Let's get started.";
      cancelSpeakRef.current = speak(sarahText, 'hr', () => {
        setHrState('idle');
        setTechState('speaking');
        cancelSpeakRef.current = speak(jamesText, 'technical', () => {
          setTechState('idle');
          setTimeout(() => askQuestion(0), 500);
        });
      });
    }, 600);
  }, [askQuestion, effectiveSarahIntro, effectiveJamesIntro, questions.length, specialistTitle]);

  const beginInterviewIntroRef = useRef(beginInterviewIntro);
  useEffect(() => { beginInterviewIntroRef.current = beginInterviewIntro; }, [beginInterviewIntro]);

  const startMike = useCallback(() => {
    setPhase('mike');
    logFlowEvent('MIKE_INTRO_STARTED', { hasJobSpec: Boolean(ctx.jobSpecText), hasCv: Boolean(ctx.cvText), selectedLanguage: ctx.selectedLanguage });
    cancelSpeakRef.current = speak(mikeScript, 'technical', () => {
      cancelSpeakRef.current = null;
      logFlowEvent('MIKE_INTRO_COMPLETED', {});
      beginInterviewIntroRef.current();
    });
  }, [mikeScript, ctx.jobSpecText, ctx.cvText, ctx.selectedLanguage]);

  const startInterview = useCallback(() => {
    startMike();
  }, [startMike]);

  useEffect(() => {
    return () => { cancelSpeakRef.current?.(); };
  }, []);

  // Background AI session prep — fires immediately on mount, independent of Mike
  useEffect(() => {
    if (ctx.questions || bgLoadRef.current || !ctx.jobSpecText) return;
    bgLoadRef.current = true;
    sessionPrepareClient(ctx.jobSpecText!, ctx.cvText, ctx.selectedLanguage).then(result => {
      bgLoadedRef.current = true;
      setBgQuestions(result.questions);
      if (result.sarahIntro) setBgSarahIntro(result.sarahIntro);
      if (result.jamesIntro) setBgJamesIntro(result.jamesIntro);
      if (result.mikeScript) setBgMikeScript(result.mikeScript);
      if (result.companyFacts?.length) setBgCompanyFacts(result.companyFacts);
      if (result.specialistTitle) setBgSpecialistTitle(result.specialistTitle);
      logFlowEvent('QUESTION_GENERATED', { count: result.questions.length, specialistTitle: result.specialistTitle });
    }).catch(() => {
      bgLoadedRef.current = true; // still mark done so we know it finished
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start — go straight to Mike IMMEDIATELY, no waiting
  const autoStartFiredRef = useRef(false);
  useEffect(() => {
    if (!ctx.autoStart || autoStartFiredRef.current) return;
    autoStartFiredRef.current = true;
    const timer = setTimeout(() => startMike(), 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setTimeout(() => askQuestion(qIndex), 200);
    }
  }, [askQuestion, qIndex]);

  const nextQuestion = useCallback(() => {
    setCurrentScore(null);
    setTypedAnswer('');
    setCoachingMessage(null);
    logFlowEvent('QUESTION_COMPLETED', { questionId: q?.questionId, index: qIndex });
    if (qIndex + 1 >= questions.length) {
      navigate(`/interview-summary/session-${Date.now()}`, { state: { answers: sessionAnswers, cvCtx, jobCtx } });
    } else {
      const next = qIndex + 1;
      setQIndex(next);
      askQuestion(next);
    }
  }, [qIndex, questions.length, sessionAnswers, navigate, askQuestion, q, cvCtx, jobCtx]);

  const handlePass = useCallback(() => {
    const thinkTimeMs = thinkStartRef.current > 0 ? Date.now() - thinkStartRef.current : undefined;
    thinkStartRef.current = 0;
    const passScore: ScoreResponse = {
      clarity: 0, relevance: 0, depth: 0, confidence: 0, overallScore: 0,
      feedback: [{ dimension: 'overall', message: 'Question passed — no answer given.', severity: 'high' }],
      suggestions: ['Attempt all questions in a real interview.'],
    };
    setRunningScores(prev => [...prev, 0]);
    setSessionAnswers(prev => [...prev, { question: q, answerText: '', score: passScore, answeredByVoice: false, thinkTimeMs }]);
    setCurrentScore(null); setCoachingMessage(null); setTypedAnswer('');
    logFlowEvent('QUESTION_COMPLETED', { questionId: q?.questionId, index: qIndex, passed: true });
    if (qIndex + 1 >= questions.length) {
      navigate(`/interview-summary/session-${Date.now()}`, { state: { answers: [...sessionAnswers, { question: q, answerText: '', score: passScore, answeredByVoice: false, thinkTimeMs }], cvCtx, jobCtx } });
    } else {
      const next = qIndex + 1;
      setQIndex(next);
      askQuestion(next);
    }
  }, [q, qIndex, questions.length, sessionAnswers, navigate, askQuestion, cvCtx, jobCtx]);

  const submitAnswer = useCallback(async (text: string, meta?: TranscriptMeta, byVoice = false) => {
    if (!text.trim()) return;
    const thinkTimeMs = thinkStartRef.current > 0 ? Date.now() - thinkStartRef.current : undefined;
    thinkStartRef.current = 0;
    setPhase('scoring');
    setHrState('thinking'); setTechState('thinking');
    logFlowEvent('ANSWER_RECEIVED', { questionId: q?.questionId, wordCount: text.trim().split(/\s+/).length, byVoice });

    let score: ScoreResponse;
    try {
      score = aiScoringConfigured
        ? await scoreWithAI(q, text, cvCtx, jobCtx)
        : localScore(q, text, companyKeywords);
    } catch {
      score = localScore(q, text, companyKeywords);
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
  }, [q, qIndex, cvCtx, jobCtx, companyKeywords]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const progress = (qIndex + (phase === 'scoring' ? 1 : 0)) / questions.length;

  const scoreColor = avgScore === null ? 'var(--text-3)'
    : avgScore >= 70 ? '#34D399'
    : avgScore >= 50 ? '#F59E0B'
    : '#EF4444';

  // Show Sarah + James only after Mike has finished
  const showInterviewers = phase !== 'intro' && phase !== 'mike';

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
              <InterviewerAvatar role="hr" state={hrState} active={isHrQuestion && phase !== 'answering'} onVideoEnded={() => onDoneRef.current?.()} />
              <InterviewerAvatar role="technical" state={techState} active={!isHrQuestion && phase !== 'answering'} specialistTitle={specialistTitle} onVideoEnded={() => onDoneRef.current?.()} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* ── INTRO — only shown when NOT autoStart ─────────────────────── */}
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>Ready for your interview?</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 20px' }}>
                You'll be asked {questions.length} questions by Sarah (HR) and James ({specialistTitle}). Answer by speaking or typing.
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: elevenLabsConfigured ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${elevenLabsConfigured ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', padding: '6px 14px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: elevenLabsConfigured ? '#34D399' : 'var(--amber)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: elevenLabsConfigured ? '#34D399' : 'var(--amber)' }}>
                    {elevenLabsConfigured ? 'ElevenLabs Neural Voices active' : 'Using browser voices'}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <button onClick={testAudio} disabled={audioCheckState === 'playing'}
                  style={{ background: 'transparent', border: `1px solid ${audioCheckState === 'done' ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`, borderRadius: '8px', padding: '7px 18px', fontSize: '13px', fontWeight: 600, cursor: audioCheckState === 'playing' ? 'default' : 'pointer', color: audioCheckState === 'done' ? '#34D399' : 'var(--text-2)', display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
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
              <button onClick={startInterview}
                style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '11px', padding: '14px 40px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                Start Interview
              </button>
            </motion.div>
          )}

          {/* ── MIKE PHASE — ONLY Mike, nothing else ──────────────────────── */}
          {phase === 'mike' && (
            <motion.div key="mike" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 32px', textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '20px' }}>
                Your Recruitment Consultant
              </div>
              {/* Mike's photo */}
              <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto 20px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg3)', border: '3px solid var(--blue)' }}>
                <img src="/images/mike.png" alt="Mike" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                {/* Pulse ring while speaking */}
                <motion.div
                  animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.15, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid var(--blue)', pointerEvents: 'none' }}
                />
              </div>
              <div style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>Mike</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recruitment Consultant</div>
              {/* Speaking indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}
                  style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34D399' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>Speaking…</span>
              </div>
              <button
                onClick={() => { cancelSpeakRef.current?.(); beginInterviewIntroRef.current(); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Skip briefing →
              </button>
            </motion.div>
          )}

          {/* ── INTERVIEWER INTRO ─────────────────────────────────────────── */}
          {phase === 'interviewer-intro' && (
            <motion.div key="int-intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px' }}>
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
            </motion.div>
          )}

          {/* ── ASKING / ANSWERING / SCORING ─────────────────────────────── */}
          {(phase === 'asking' || phase === 'answering' || phase === 'scoring') && q && (
            <motion.div key={`q-${qIndex}-${phase}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Question card */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px', marginBottom: '16px' }}>
                {phase === 'asking' ? (
                  <div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                      <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
                        style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />
                      <div style={{ fontSize: '15px', color: 'var(--text-2)', fontStyle: 'italic' }}>Interviewer is speaking…</div>
                    </div>
                    <button onClick={repeatQuestion}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer' }}>
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

              {/* Answer area */}
              {phase === 'answering' && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {useVoice && (
                    <VoiceInput
                      onTranscript={(text, meta) => submitAnswer(text, meta, true)}
                      onInterimTranscript={() => {}}
                    />
                  )}
                  <div>
                    {useVoice && <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Or type your answer</div>}
                    <textarea
                      value={typedAnswer}
                      onChange={e => setTypedAnswer(e.target.value)}
                      placeholder="Type your answer here…"
                      rows={4}
                      style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', color: 'var(--text)', fontSize: '14px', lineHeight: 1.65, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      <button onClick={handlePass}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer' }}>
                        Pass →
                      </button>
                      {typedAnswer.trim() && (
                        <button onClick={() => submitAnswer(typedAnswer, undefined, false)}
                          style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                          Submit Answer
                        </button>
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
