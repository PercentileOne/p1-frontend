import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { explainApi, type InterviewQuestion } from '../api/explainApi';
import { FileUpload } from '../components/FileUpload';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'setup' | 'generating' | 'screening' | 'result';
type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';
type Signal = 'strong' | 'partial' | 'weak' | 'redflag';

interface AnsweredQ {
  question: InterviewQuestion;
  selected: OptionKey | null;
  signal: Signal | null;
  score: number | null;
  summary: string | null;
}

// ── Option config ─────────────────────────────────────────────────────────────

const OPTIONS: Record<OptionKey, { label: string; color: string; bg: string; border: string }> = {
  A: { label: 'Strong',             color: '#34D399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.35)' },
  B: { label: 'Partial',            color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.35)' },
  C: { label: 'Weak',               color: '#EF4444', bg: 'rgba(239,68,68,0.09)',  border: 'rgba(239,68,68,0.30)' },
  D: { label: 'Red Flag',           color: '#DC2626', bg: 'rgba(220,38,38,0.12)',  border: 'rgba(220,38,38,0.45)' },
  E: { label: 'None of the above',  color: '#6B7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.30)' },
};

// ── Interpretation engine ─────────────────────────────────────────────────────

function interpretOption(
  q: InterviewQuestion,
  key: OptionKey,
): { signal: Signal; score: number; summary: string } {
  const topic = q.competencyTags?.join(' / ') ?? q.questionType;

  const templates: Record<OptionKey, { signal: Signal; score: number; summary: string }> = {
    A: {
      signal: 'strong',
      score: 0.90,
      summary: `Candidate gave a strong, well-structured response demonstrating clear competency in ${topic}. The answer was specific, confident, and aligned with what a high-performing candidate in this role would say.`,
    },
    B: {
      signal: 'partial',
      score: 0.55,
      summary: `Candidate showed some understanding of ${topic} but the response lacked depth or concrete examples. There is potential, though further probing or development would be needed.`,
    },
    C: {
      signal: 'weak',
      score: 0.22,
      summary: `Candidate's response was vague or incomplete regarding ${topic}. The answer did not adequately demonstrate the expected competency for this level of role.`,
    },
    D: {
      signal: 'redflag',
      score: 0.05,
      summary: `Candidate's response raised a concern around ${topic}. The answer was evasive, contradictory, or revealed a significant gap that could pose a risk if this candidate is progressed to interview.`,
    },
    E: {
      signal: 'weak',
      score: 0.10,
      summary: `Candidate's response did not align with any expected pattern for this question about ${topic}. The answer was off-topic or unclear — proceed with caution and consider probing further.`,
    },
  };

  return templates[key];
}

// ── Fallback questions ────────────────────────────────────────────────────────

function makeFallbackQuestions(jobSpec: string): InterviewQuestion[] {
  const istech    = /engineer|developer|software|cloud|devops|architect/i.test(jobSpec);
  const isleader  = /manager|director|head of|lead|vp |cto|cio/i.test(jobSpec);

  const base: InterviewQuestion[] = [
    {
      questionId: 'sq1',
      questionText: 'Give me a brief overview of your most recent role and what you were responsible for.',
      modelAnswer: 'Recent role, core responsibilities, team size, key deliverables.',
      questionType: 'Situational', difficulty: 'Easy', source: 'HR',
      competencyTags: ['background', 'clarity'],
    },
    {
      questionId: 'sq2',
      questionText: "What is one major challenge you have solved in the last 12 months — what did you do and what was the outcome?",
      modelAnswer: 'Specific challenge, actions taken, measurable outcome, learning.',
      questionType: 'Behavioural', difficulty: 'Medium', source: 'HR',
      competencyTags: ['problem-solving', 'delivery'],
    },
  ];

  if (istech) base.push({
    questionId: 'sq3',
    questionText: 'Describe the tech stack and architecture of your most recent production system.',
    modelAnswer: 'Languages, frameworks, cloud platform, CI/CD, scalability, team ownership.',
    questionType: 'Technical', difficulty: 'Medium', source: 'Role',
    competencyTags: ['technical depth', 'architecture'],
  });

  if (isleader) base.push({
    questionId: 'sq4',
    questionText: 'How large was the team you led and what was your approach to managing performance?',
    modelAnswer: 'Team size, structure, 1-to-1s, performance frameworks, examples of development.',
    questionType: 'Behavioural', difficulty: 'Medium', source: 'Role',
    competencyTags: ['leadership', 'team management'],
  });

  base.push({
    questionId: 'sq5',
    questionText: "What is your current notice period and salary expectation for the right role?",
    modelAnswer: 'Clear answer on notice period, realistic and specific salary range.',
    questionType: 'Situational', difficulty: 'Easy', source: 'HR',
    competencyTags: ['availability', 'commercial fit'],
  });

  return base;
}

// ── Signal chip ───────────────────────────────────────────────────────────────

function SignalChip({ signal, score }: { signal: Signal; score: number }) {
  const cfg: Record<Signal, { label: string; color: string; bg: string; border: string }> = {
    strong:  { label: '✓ Strong',    color: '#34D399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
    partial: { label: '~ Partial',   color: '#F59E0B', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.3)'  },
    weak:    { label: '✗ Weak',      color: '#EF4444', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)'  },
    redflag: { label: '⚑ Red Flag',  color: '#DC2626', bg: 'rgba(220,38,38,0.12)',   border: 'rgba(220,38,38,0.4)'   },
  };
  const c = cfg[signal];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 6, padding: '3px 10px',
        fontSize: 12, fontWeight: 700, color: c.color,
      }}>
        {c.label}
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(score * 100)}%
      </span>
    </div>
  );
}

// ── Option button ─────────────────────────────────────────────────────────────

function OptionBtn({
  optKey, selected, onSelect,
}: {
  optKey: OptionKey;
  selected: boolean;
  onSelect: () => void;
}) {
  const opt = OPTIONS[optKey];
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', textAlign: 'left',
        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'all 0.15s',
        background: selected ? opt.bg : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${selected ? opt.border : 'var(--border)'}`,
        outline: 'none',
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: selected ? opt.bg : 'rgba(255,255,255,0.06)',
        border: `1.5px solid ${selected ? opt.color : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800,
        color: selected ? opt.color : 'var(--text-3)',
        transition: 'all 0.15s',
      }}>
        {optKey}
      </div>
      <span style={{
        fontSize: 13, fontWeight: selected ? 700 : 500,
        color: selected ? opt.color : 'var(--text-2)',
        transition: 'color 0.15s',
      }}>
        {opt.label}
      </span>
      {selected && (
        <span style={{ marginLeft: 'auto', fontSize: 14, color: opt.color }}>●</span>
      )}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScreenCandidates() {
  const [step, setStep]               = useState<Step>('setup');
  const [jobSpec, setJobSpec]         = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [questions, setQuestions]     = useState<AnsweredQ[]>([]);
  const [error, setError]             = useState('');
  const [activeQ, setActiveQ]         = useState(0);

  const generate = useCallback(async () => {
    if (!jobSpec.trim()) return;
    setStep('generating');
    setError('');
    try {
      const result = await explainApi.quickGenerate({ jobDescriptionText: jobSpec });
      setQuestions(result.questions.slice(0, 5).map(q => ({
        question: q, selected: null, signal: null, score: null, summary: null,
      })));
    } catch {
      const fallback = makeFallbackQuestions(jobSpec);
      setQuestions(fallback.map(q => ({
        question: q, selected: null, signal: null, score: null, summary: null,
      })));
    }
    setActiveQ(0);
    setStep('screening');
  }, [jobSpec]);

  const selectOption = useCallback((qIdx: number, key: OptionKey) => {
    setQuestions(qs => qs.map((q, i) =>
      i === qIdx ? { ...q, selected: key, signal: null, score: null, summary: null } : q,
    ));
  }, []);

  const scoreQuestion = useCallback((idx: number) => {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== idx || !q.selected) return q;
      const { signal, score, summary } = interpretOption(q.question, q.selected);
      return { ...q, signal, score, summary };
    }));
    // Auto-advance to next unscored question
    setActiveQ(idx < questions.length - 1 ? idx + 1 : idx);
  }, [questions.length]);

  const allScored = questions.length > 0 && questions.every(q => q.signal !== null);

  const hasRedFlag = questions.some(q => q.signal === 'redflag');
  const avgScore = allScored
    ? questions.reduce((s, q) => s + (q.score ?? 0), 0) / questions.length
    : null;

  const overallSignal = avgScore === null ? null
    : hasRedFlag       ? 'pass'
    : avgScore >= 0.60 ? 'proceed'
    : avgScore >= 0.35 ? 'borderline'
    : 'pass';

  const overallCfg = {
    proceed:    { label: '✓ Proceed to Interview', color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
    borderline: { label: '~ Borderline — use judgement', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
    pass:       { label: hasRedFlag ? '⚑ Pass — red flag raised' : '✗ Pass — not a strong fit', color: hasRedFlag ? '#DC2626' : '#EF4444', bg: hasRedFlag ? 'rgba(220,38,38,0.10)' : 'rgba(239,68,68,0.08)', border: hasRedFlag ? 'rgba(220,38,38,0.35)' : 'rgba(239,68,68,0.2)' },
  };

  const reset = () => {
    setStep('setup'); setJobSpec(''); setCandidateName('');
    setQuestions([]); setError(''); setActiveQ(0);
  };

  return (
    <div style={{ padding: '32px', maxWidth: 760 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 6 }}>
          Recruiter Tool
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>
          Filter Candidate by Job Spec
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
          Generate role-specific screening questions. Select how the candidate responded on the call — AI scores and recommends.
        </p>
      </div>

      <AnimatePresence mode="wait">

        {/* ── SETUP ── */}
        {step === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>
                Job Spec
              </div>
              <FileUpload label="job spec" onExtracted={(text) => setJobSpec(text)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>or paste below</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <textarea
                value={jobSpec}
                onChange={e => setJobSpec(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={8}
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 14, color: 'var(--text)', fontSize: 13,
                  lineHeight: 1.65, resize: 'vertical', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>
                Candidate Name (optional)
              </div>
              <input
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
                placeholder="e.g. James Okafor"
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: 13,
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</div>}

            <button
              onClick={generate}
              disabled={jobSpec.trim().length < 30}
              style={{
                background: jobSpec.trim().length >= 30 ? 'var(--blue)' : 'rgba(79,142,247,0.25)',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '13px 32px', fontSize: 14, fontWeight: 700,
                cursor: jobSpec.trim().length >= 30 ? 'pointer' : 'default',
                fontFamily: 'inherit',
              }}
            >
              Generate Screening Questions →
            </button>
          </motion.div>
        )}

        {/* ── GENERATING ── */}
        {step === 'generating' && (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '64px 0' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', margin: '0 auto 20px' }}
            />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Analysing job spec…
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Generating role-specific screening questions
            </div>
          </motion.div>
        )}

        {/* ── SCREENING ── */}
        {step === 'screening' && (
          <motion.div key="screening" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {candidateName ? `Screening: ${candidateName}` : 'Phone Screen'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {questions.filter(q => q.signal !== null).length} of {questions.length} scored
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(Object.entries(OPTIONS) as [OptionKey, typeof OPTIONS[OptionKey]][]).map(([k, o]) => (
                  <span key={k} style={{
                    fontSize: 10, fontWeight: 700, color: o.color,
                    background: o.bg, border: `1px solid ${o.border}`,
                    borderRadius: 20, padding: '2px 8px',
                  }}>
                    {k} — {o.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'var(--bg3)', borderRadius: 99, height: 4, marginBottom: 20, overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${(questions.filter(q => q.signal !== null).length / questions.length) * 100}%` }}
                transition={{ duration: 0.4 }}
                style={{ height: '100%', background: 'linear-gradient(90deg, var(--blue), #a78bfa)', borderRadius: 99 }}
              />
            </div>

            {/* Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {questions.map((aq, idx) => (
                <motion.div key={aq.question.questionId} layout
                  style={{
                    background: 'var(--bg2)', border: `1px solid ${activeQ === idx ? 'rgba(79,142,247,0.4)' : 'var(--border)'}`,
                    borderRadius: 14, overflow: 'hidden',
                    opacity: activeQ !== idx && !aq.signal ? 0.55 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Q header */}
                  <div
                    onClick={() => setActiveQ(activeQ === idx ? -1 : idx)}
                    style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
                  >
                    {/* Number / signal badge */}
                    <div style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 1,
                      background: aq.signal === 'strong'  ? 'rgba(52,211,153,0.15)'
                               : aq.signal === 'partial' ? 'rgba(245,158,11,0.12)'
                               : aq.signal === 'redflag' ? 'rgba(220,38,38,0.15)'
                               : aq.signal === 'weak'    ? 'rgba(239,68,68,0.12)'
                               : 'rgba(79,142,247,0.1)',
                      border: `1px solid ${
                        aq.signal === 'strong'  ? 'rgba(52,211,153,0.3)'
                      : aq.signal === 'partial' ? 'rgba(245,158,11,0.3)'
                      : aq.signal === 'redflag' ? 'rgba(220,38,38,0.4)'
                      : aq.signal === 'weak'    ? 'rgba(239,68,68,0.25)'
                      : 'rgba(79,142,247,0.25)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800,
                      color: aq.signal === 'strong'  ? '#34D399'
                           : aq.signal === 'partial' ? '#F59E0B'
                           : aq.signal === 'redflag' ? '#DC2626'
                           : aq.signal === 'weak'    ? '#EF4444'
                           : 'var(--blue)',
                    }}>
                      {aq.selected && aq.signal ? aq.selected : idx + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', background: 'rgba(79,142,247,0.1)', borderRadius: 4, padding: '2px 7px' }}>
                          {aq.question.questionType}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', borderRadius: 4, padding: '2px 7px' }}>
                          {aq.question.difficulty}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 }}>
                        {aq.question.questionText}
                      </div>
                      {/* Scored summary preview */}
                      {aq.summary && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, lineHeight: 1.5, fontStyle: 'italic' }}>
                          {aq.summary.slice(0, 90)}…
                        </div>
                      )}
                    </div>

                    {aq.signal && <SignalChip signal={aq.signal} score={aq.score!} />}
                  </div>

                  {/* Expanded panel */}
                  <AnimatePresence>
                    {activeQ === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>

                          {/* Model answer hint */}
                          <details style={{ marginTop: 14, marginBottom: 16 }}>
                            <summary style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', cursor: 'pointer', userSelect: 'none', listStyle: 'none' }}>
                              💡 What to listen for ↓
                            </summary>
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65, padding: '10px 14px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 8 }}>
                              {aq.question.modelAnswer}
                            </div>
                          </details>

                          {/* Option selector */}
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>
                            How did the candidate respond?
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                            {(Object.keys(OPTIONS) as OptionKey[]).map(key => (
                              <OptionBtn
                                key={key}
                                optKey={key}
                                selected={aq.selected === key}
                                onSelect={() => selectOption(idx, key)}
                              />
                            ))}
                          </div>

                          {/* Score + result */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => scoreQuestion(idx)}
                              disabled={!aq.selected}
                              style={{
                                background: aq.selected ? 'var(--blue)' : 'rgba(79,142,247,0.25)',
                                color: '#fff', border: 'none', borderRadius: 9,
                                padding: '10px 22px', fontSize: 13, fontWeight: 700,
                                cursor: aq.selected ? 'pointer' : 'default',
                                fontFamily: 'inherit',
                              }}
                            >
                              Score &amp; Continue →
                            </button>
                            {aq.signal && <SignalChip signal={aq.signal} score={aq.score!} />}
                          </div>

                          {/* Generated summary */}
                          {aq.summary && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              style={{
                                marginTop: 14, padding: '12px 16px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border)',
                                borderRadius: 10, fontSize: 12,
                                color: 'var(--text-2)', lineHeight: 1.7,
                              }}
                            >
                              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
                                AI Summary
                              </span>
                              {aq.summary}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Finish */}
            {allScored && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 20 }}>
                <button
                  onClick={() => setStep('result')}
                  style={{
                    background: 'linear-gradient(135deg, var(--blue), #a78bfa)',
                    color: '#fff', border: 'none', borderRadius: 10,
                    padding: '13px 32px', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', width: '100%',
                  }}
                >
                  View Screening Result →
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── RESULT ── */}
        {step === 'result' && overallSignal && (
          <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

            {/* Overall verdict */}
            <div style={{
              background: overallCfg[overallSignal].bg,
              border: `1.5px solid ${overallCfg[overallSignal].border}`,
              borderRadius: 14, padding: '28px 32px', marginBottom: 24, textAlign: 'center',
            }}>
              <div style={{ fontSize: 34, marginBottom: 12 }}>
                {overallSignal === 'proceed' ? '✅' : overallSignal === 'borderline' ? '⚖️' : hasRedFlag ? '🚩' : '❌'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: overallCfg[overallSignal].color, marginBottom: 8 }}>
                {overallCfg[overallSignal].label}
              </div>
              {candidateName && (
                <div style={{ fontSize: 14, color: 'var(--text-2)' }}>
                  {candidateName} · {Math.round((avgScore ?? 0) * 100)}% average score
                </div>
              )}
            </div>

            {/* Q-by-Q breakdown */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Question Breakdown
              </div>
              {questions.map((aq, idx) => (
                <div key={aq.question.questionId} style={{
                  padding: '16px 20px',
                  borderBottom: idx < questions.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: aq.summary ? 8 : 0 }}>
                    {/* Option badge */}
                    {aq.selected && (
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: OPTIONS[aq.selected].bg,
                        border: `1.5px solid ${OPTIONS[aq.selected].border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, color: OPTIONS[aq.selected].color,
                      }}>
                        {aq.selected}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 3 }}>Q{idx + 1}</div>
                      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{aq.question.questionText}</div>
                    </div>
                    {aq.signal && <SignalChip signal={aq.signal} score={aq.score!} />}
                  </div>
                  {aq.summary && (
                    <div style={{
                      marginLeft: 42, fontSize: 12, color: 'var(--text-2)',
                      lineHeight: 1.65, fontStyle: 'italic',
                    }}>
                      {aq.summary}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Structured data — copy-ready */}
            <details style={{ marginBottom: 20 }}>
              <summary style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', listStyle: 'none', marginBottom: 8 }}>
                Structured Data (JSON) ↓
              </summary>
              <pre style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
                padding: 14, fontSize: 11, color: 'var(--text-2)', overflow: 'auto',
                lineHeight: 1.6, marginTop: 8,
              }}>
                {JSON.stringify({
                  candidate: candidateName || 'Unknown',
                  date: new Date().toISOString().split('T')[0],
                  recommendation: overallSignal,
                  averageScore: Math.round((avgScore ?? 0) * 100),
                  questions: questions.map((q, i) => ({
                    q: i + 1,
                    question: q.question.questionText,
                    option: q.selected,
                    signal: q.signal,
                    score: Math.round((q.score ?? 0) * 100),
                    summary: q.summary,
                  })),
                }, null, 2)}
              </pre>
            </details>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={reset}
                style={{
                  flex: 1, background: 'var(--bg2)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 10,
                  padding: '12px 20px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                ← Screen another candidate
              </button>
              {overallSignal !== 'pass' && (
                <button
                  onClick={() => window.open('/interview-room/demo', '_blank')}
                  style={{
                    flex: 1, background: 'var(--blue)', color: '#fff',
                    border: 'none', borderRadius: 10,
                    padding: '12px 20px', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Launch Interview Room →
                </button>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
