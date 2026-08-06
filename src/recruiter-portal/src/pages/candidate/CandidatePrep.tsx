import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChairSpinner } from '../../components/ChairSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { readPrepSessionFromHash, type CandidatePrepSession } from '../../utils/clientSession';
import { mapImprovementAreasToLearnModules } from '../../utils/learnModules';
import { buildJobSpecContext, buildCVContext } from '../../utils/contextBuilder';
import { generateQuestionsWithAI } from '../../api/aiScoring';
import type { InterviewQuestion as BaseInterviewQuestion } from '../../api/explainApi';

type InterviewQuestion = BaseInterviewQuestion & { followUps?: string[] };

type PrepPhase = 'intake' | 'generating' | 'practice' | 'complete';
type SelfAssessment = 'strong' | 'ok' | 'weak' | null;

interface PracticeAnswer {
  question: InterviewQuestion;
  assessment: SelfAssessment;
  notes: string;
}

// ── Intake form ───────────────────────────────────────────────────────────────

function IntakeForm({ onStart }: { onStart: (role: string, company: string, cvText: string, count: 3 | 6) => void }) {
  const [role, setRole]       = useState('');
  const [company, setCompany] = useState('');
  const [cvText, setCvText]   = useState('');
  const [count, setCount]     = useState<3 | 6>(6);

  const canStart = role.trim().length >= 2;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 24px' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

        <div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Build your prep pack
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
            Tell us the role and we'll generate personalised interview questions with model answers, follow-up probes, and LEARN recommendations.
          </div>
        </div>

        {/* Role */}
        <div>
          <Label text="Role you're interviewing for *" />
          <input
            value={role}
            onChange={e => setRole(e.target.value)}
            placeholder="e.g. Senior Software Engineer, Head Barista, Registered Nurse…"
            autoFocus
            style={inputStyle}
          />
        </div>

        {/* Company */}
        <div>
          <Label text="Company (optional — improves question quality)" />
          <input
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="e.g. Google, Starbucks, NHS, Goldman Sachs…"
            style={inputStyle}
          />
        </div>

        {/* CV excerpt */}
        <div>
          <Label text="Paste your CV or a brief summary of your experience (optional)" />
          <textarea
            value={cvText}
            onChange={e => setCvText(e.target.value)}
            placeholder="Paste your CV text, LinkedIn summary, or a few lines about your background. The more context, the more targeted your questions will be."
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {/* Question count */}
        <div>
          <Label text="How many questions?" />
          <div style={{ display: 'flex', gap: '10px' }}>
            {([3, 6] as const).map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: count === n ? 'rgba(79,142,247,0.12)' : 'var(--bg2)',
                  border: `1px solid ${count === n ? 'rgba(79,142,247,0.4)' : 'var(--border)'}`,
                  color: count === n ? '#4F8EF7' : 'var(--text-3)',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 900, marginBottom: '2px' }}>{n}</div>
                <div style={{ fontSize: '11px', fontWeight: 600 }}>{n === 3 ? 'Quick Prep (~15 min)' : 'Full Prep (~30 min)'}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => canStart && onStart(role.trim(), company.trim(), cvText.trim(), count)}
          disabled={!canStart}
          style={{
            padding: '15px', borderRadius: '12px', fontSize: '15px', fontWeight: 800,
            background: canStart ? 'var(--blue)' : 'rgba(79,142,247,0.3)',
            color: '#fff', border: 'none', cursor: canStart ? 'pointer' : 'default', transition: 'background 0.2s',
          }}
        >
          Generate my prep pack →
        </button>
      </motion.div>
    </div>
  );
}

// ── Question practice card ────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  total,
  onAssess,
  onNext,
  isLast,
}: {
  question: InterviewQuestion;
  index: number;
  total: number;
  onAssess: (a: SelfAssessment, notes: string) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  const [showAnswer, setShowAnswer]         = useState(false);
  const [showFollowUps, setShowFollowUps]   = useState(false);
  const [assessment, setAssessment]         = useState<SelfAssessment>(null);
  const [notes, setNotes]                   = useState('');
  const [timerSecs, setTimerSecs]           = useState(0);
  const [timerRunning, setTimerRunning]     = useState(false);
  const intervalRef                         = useRef<ReturnType<typeof setInterval> | null>(null);

  const modules = mapImprovementAreasToLearnModules(question.competencyTags ?? []);
  const suggestedModule = modules[0] ?? null;

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  function toggleTimer() {
    if (timerRunning) {
      clearInterval(intervalRef.current!);
      setTimerRunning(false);
    } else {
      intervalRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
      setTimerRunning(true);
    }
  }

  function resetTimer() {
    clearInterval(intervalRef.current!);
    setTimerRunning(false);
    setTimerSecs(0);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const sourceColor = question.source === 'HR'
    ? '#a78bfa'
    : question.source === 'Role'
    ? '#4F8EF7'
    : 'var(--text-3)';

  const difficultyColor = question.difficulty === 'Hard'
    ? '#F87171'
    : question.difficulty === 'Medium'
    ? '#F59E0B'
    : '#34D399';

  const ASSESSMENTS: { value: SelfAssessment; label: string; color: string; bg: string }[] = [
    { value: 'strong', label: '💪 Strong',    color: '#34D399', bg: 'rgba(52,211,153,0.10)' },
    { value: 'ok',     label: '👍 OK',        color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
    { value: 'weak',   label: '📖 Need work', color: '#F87171', bg: 'rgba(248,113,113,0.10)' },
  ];

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.22 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* Progress + timer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ width: i === index ? '24px' : '8px', height: '8px', borderRadius: '4px', background: i < index ? '#34D399' : i === index ? 'var(--blue)' : 'var(--border)', transition: 'all 0.3s' }} />
          ))}
          <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '4px' }}>
            {index + 1} of {total}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: timerSecs > 120 ? '#F87171' : 'var(--text-2)' }}>
            {fmt(timerSecs)}
          </span>
          <button onClick={toggleTimer} style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text-3)', cursor: 'pointer' }}>
            {timerRunning ? '⏸ Pause' : '▶ Timer'}
          </button>
          {timerSecs > 0 && (
            <button onClick={resetTimer} style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text-3)', cursor: 'pointer' }}>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Question */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '5px', background: 'rgba(79,142,247,0.1)', color: sourceColor, border: `1px solid ${sourceColor}30` }}>
              {question.source === 'HR' ? 'HR & Culture' : question.source === 'Role' ? 'Role Competency' : question.source}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '5px', background: 'var(--bg)', border: '1px solid var(--border)', color: difficultyColor }}>
              {question.difficulty}
            </span>
            {question.competencyTags?.slice(0, 2).map(t => (
              <span key={t} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '5px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-3)', textTransform: 'capitalize' }}>{t}</span>
            ))}
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.5 }}>
            {question.questionText}
          </div>
        </div>

        {/* Practice area */}
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            Practice your answer out loud or make notes below. Use the timer to stay within 2 minutes.
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Jot down key points from your answer, or anything you want to remember…"
            rows={3}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '11px 13px', color: 'var(--text)', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', lineHeight: 1.6 }}
          />
        </div>
      </div>

      {/* Self assessment */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
          How did that feel?
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {ASSESSMENTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setAssessment(assessment === opt.value ? null : opt.value)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: '9px', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
                background: assessment === opt.value ? opt.bg : 'var(--bg2)',
                border: `1px solid ${assessment === opt.value ? opt.color + '50' : 'var(--border)'}`,
                color: assessment === opt.value ? opt.color : 'var(--text-3)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Model answer */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <button
          onClick={() => setShowAnswer(v => !v)}
          style={{ width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-2)' }}>
            {showAnswer ? '▲ Hide model answer' : '▼ Reveal model answer'}
          </span>
          <span style={{ fontSize: '11px', color: '#34D399', fontWeight: 700 }}>Key points</span>
        </button>
        {showAnswer && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, background: 'rgba(52,211,153,0.03)' }}>
            {question.modelAnswer}
          </div>
        )}
      </div>

      {/* Follow-up probes */}
      {question.followUps && question.followUps.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <button
            onClick={() => setShowFollowUps(v => !v)}
            style={{ width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-2)' }}>
              {showFollowUps ? '▲ Hide follow-ups' : '▼ Follow-up probes'}
            </span>
            <span style={{ fontSize: '11px', color: '#4F8EF7', fontWeight: 700 }}>{question.followUps.length} probes</span>
          </button>
          {showFollowUps && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {question.followUps.map((fu, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#4F8EF7', fontSize: '12px', flexShrink: 0, marginTop: '2px' }}>↳</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.55 }}>{fu}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LEARN hook */}
      {suggestedModule && (assessment === 'weak' || assessment === 'ok') && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: '14px 16px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.18)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4F8EF7', marginBottom: '4px' }}>
              LEARN Recommendation
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{suggestedModule.title}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{suggestedModule.estimatedMinutes} min · {suggestedModule.difficulty}</div>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.25)', color: '#4F8EF7', whiteSpace: 'nowrap' }}>
            Added to your plan
          </span>
        </motion.div>
      )}

      {/* Next */}
      <button
        onClick={() => { onAssess(assessment, notes); onNext(); }}
        style={{
          padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 800,
          background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer',
        }}
      >
        {isLast ? 'Finish prep →' : 'Next question →'}
      </button>
    </motion.div>
  );
}

// ── Complete screen ───────────────────────────────────────────────────────────

function CompletePage({
  answers,
  role,
  company,
  onRestart,
}: {
  answers: PracticeAnswer[];
  role: string;
  company?: string;
  onRestart: () => void;
}) {
  const navigate = useNavigate();

  const weakAreas = answers
    .filter(a => a.assessment === 'weak' || a.assessment === 'ok')
    .flatMap(a => a.question.competencyTags ?? []);

  const deduped = Array.from(new Set(weakAreas));
  const modules = mapImprovementAreasToLearnModules(deduped);

  const strongCount = answers.filter(a => a.assessment === 'strong').length;
  const okCount     = answers.filter(a => a.assessment === 'ok').length;
  const weakCount   = answers.filter(a => a.assessment === 'weak').length;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '640px', margin: '0 auto' }}>

      {/* Score summary */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: '4px' }}>
          Prep Complete
        </div>
        <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '20px' }}>
          {role}{company ? ` · ${company}` : ''}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <StatPill n={strongCount} label="Strong" color="#34D399" />
          <StatPill n={okCount}     label="OK"     color="#F59E0B" />
          <StatPill n={weakCount}   label="Need work" color="#F87171" />
        </div>
        {deduped.length > 0 && (
          <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
            Focus areas: <strong style={{ color: 'var(--text-2)' }}>{deduped.join(', ')}</strong>
          </div>
        )}
      </div>

      {/* LEARN plan */}
      {modules.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: '14px' }}>
            Your personalised LEARN plan
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {modules.slice(0, 5).map((mod, i) => (
              <div key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-3)', width: '20px', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{mod.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{mod.estimatedMinutes} min · {mod.difficulty} · {mod.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next steps */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={onRestart}
          style={{ flex: 1, padding: '13px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Prep again →
        </button>
        <button
          onClick={() => navigate('/interview-room/demo')}
          style={{ flex: 1, padding: '13px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}
        >
          Try the AI voice interview →
        </button>
      </div>
    </motion.div>
  );
}

function StatPill({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '14px 8px', background: `${color}10`, border: `1px solid ${color}30`, borderRadius: '10px' }}>
      <div style={{ fontSize: '28px', fontWeight: 900, color, lineHeight: 1, marginBottom: '4px' }}>{n}</div>
      <div style={{ fontSize: '11px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function CandidatePrep() {
  const [phase, setPhase]       = useState<PrepPhase>('intake');
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [qIndex, setQIndex]     = useState(0);
  const [answers, setAnswers]   = useState<PracticeAnswer[]>([]);
  const [error, setError]       = useState('');
  const [role, setRole]         = useState('');
  const [company, setCompany]   = useState('');

  // Try reading a recruiter-generated prep session from the URL hash
  useEffect(() => {
    const session: CandidatePrepSession | null = readPrepSessionFromHash();
    if (session) {
      setQuestions(session.questions);
      setRole(session.role);
      setCompany(session.company ?? '');
      setPhase('practice');
    }
  }, []);

  async function handleIntakeStart(r: string, c: string, cvText: string, count: 3 | 6) {
    setRole(r);
    setCompany(c);
    setPhase('generating');
    setError('');

    try {
      const jobText = [r, c ? `at ${c}` : ''].filter(Boolean).join(' ');
      const jobCtx = buildJobSpecContext(jobText);
      jobCtx.title = r;
      if (c) jobCtx.company = c;

      const cvCtx = cvText ? buildCVContext(cvText) : buildCVContext('');

      const generated = await generateQuestionsWithAI(cvCtx, jobCtx);
      setQuestions(generated.slice(0, count));
      setPhase('practice');
    } catch {
      setError('Could not generate questions — please check your connection and try again.');
      setPhase('intake');
    }
  }

  function handleAnswer(assessment: SelfAssessment, notes: string) {
    setAnswers(prev => [...prev, { question: questions[qIndex], assessment, notes }]);
  }

  function handleNext() {
    if (qIndex < questions.length - 1) {
      setQIndex(i => i + 1);
    } else {
      setPhase('complete');
    }
  }

  function restart() {
    setPhase('intake');
    setQuestions([]);
    setQIndex(0);
    setAnswers([]);
    setError('');
    window.location.hash = '';
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
            <a href="/candidate" style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text)', textDecoration: 'none', letterSpacing: '-0.02em' }}>
              EXPLAIN
            </a>
            {phase !== 'intake' && (
              <button onClick={restart} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', background: 'none', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 12px', cursor: 'pointer' }}>
                ← New prep pack
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Generating state */}
      {phase === 'generating' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px' }}>
          <ChairSpinner size={130} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
              Building your prep pack…
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
              AI is generating questions for <strong style={{ color: 'var(--text-2)' }}>{role}{company ? ` at ${company}` : ''}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Content area */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', fontSize: '13px', color: '#F87171', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {phase === 'intake' && (
            <motion.div key="intake" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <IntakeForm onStart={handleIntakeStart} />
            </motion.div>
          )}

          {phase === 'practice' && questions.length > 0 && (
            <motion.div key={`q-${qIndex}`} style={{ maxWidth: '640px', margin: '0 auto' }}>
              <QuestionCard
                question={questions[qIndex]}
                index={qIndex}
                total={questions.length}
                onAssess={handleAnswer}
                onNext={handleNext}
                isLast={qIndex === questions.length - 1}
              />
            </motion.div>
          )}

          {phase === 'complete' && (
            <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CompletePage answers={answers} role={role} company={company} onRestart={restart} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '12px 14px',
  color: 'var(--text)',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function Label({ text }: { text: string }) {
  return (
    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
      {text}
    </div>
  );
}
