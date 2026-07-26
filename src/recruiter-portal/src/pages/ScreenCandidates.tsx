import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { explainApi, type InterviewQuestion } from '../api/explainApi';
import { FileUpload } from '../components/FileUpload';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'setup' | 'generating' | 'screening' | 'result';

interface AnsweredQ {
  question: InterviewQuestion;
  answer: string;
  score: number | null;
  signal: 'strong' | 'partial' | 'weak' | null;
  expanded: boolean;
}

// ── Local scorer ──────────────────────────────────────────────────────────────

function quickScore(q: InterviewQuestion, answer: string): { score: number; signal: 'strong' | 'partial' | 'weak' } {
  const lower = answer.toLowerCase().trim();
  if (lower.length < 8) return { score: 0.1, signal: 'weak' };

  const modelWords = q.modelAnswer
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 4);

  const hits = modelWords.filter(w => lower.includes(w)).length;
  const density = modelWords.length > 0 ? hits / modelWords.length : 0;
  const lengthBonus = Math.min(lower.length / 200, 0.15);
  const raw = Math.min(density * 0.85 + lengthBonus, 1);

  const signal: 'strong' | 'partial' | 'weak' =
    raw >= 0.55 ? 'strong' : raw >= 0.28 ? 'partial' : 'weak';

  return { score: raw, signal };
}

// ── Fallback questions (if API is unavailable) ────────────────────────────────

function makeFallbackQuestions(jobSpec: string): InterviewQuestion[] {
  const istech = /engineer|developer|software|cloud|devops|architect/i.test(jobSpec);
  const isleader = /manager|director|head of|lead|vp |cto|cio/i.test(jobSpec);

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
      questionText: "What's one major challenge you've solved in the last 12 months? What did you do and what was the outcome?",
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

function SignalChip({ signal, score }: { signal: 'strong' | 'partial' | 'weak'; score: number }) {
  const cfg = {
    strong:  { label: '✓ Strong',   bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',  color: '#34D399' },
    partial: { label: '~ Partial',  bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.3)',  color: '#F59E0B' },
    weak:    { label: '✗ Weak',     bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)',  color: '#EF4444' },
  }[signal];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 6, padding: '3px 10px',
        fontSize: 12, fontWeight: 700, color: cfg.color,
      }}>
        {cfg.label}
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(score * 100)}%
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScreenCandidates() {
  const [step, setStep] = useState<Step>('setup');
  const [jobSpec, setJobSpec] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [questions, setQuestions] = useState<AnsweredQ[]>([]);
  const [error, setError] = useState('');
  const [activeQ, setActiveQ] = useState(0);

  const generate = useCallback(async () => {
    if (!jobSpec.trim()) return;
    setStep('generating');
    setError('');
    try {
      const result = await explainApi.quickGenerate({ jobDescriptionText: jobSpec });
      setQuestions(result.questions.slice(0, 5).map(q => ({
        question: q, answer: '', score: null, signal: null, expanded: false,
      })));
    } catch {
      // API unavailable — fall back to role-specific heuristic questions
      const fallback = makeFallbackQuestions(jobSpec);
      setQuestions(fallback.map(q => ({
        question: q, answer: '', score: null, signal: null, expanded: false,
      })));
    }
    setActiveQ(0);
    setStep('screening');
  }, [jobSpec]);

  const scoreQuestion = useCallback((idx: number) => {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== idx) return q;
      const { score, signal } = quickScore(q.question, q.answer);
      return { ...q, score, signal };
    }));
  }, []);

  const allScored = questions.every(q => q.signal !== null);
  const avgScore = allScored && questions.length > 0
    ? questions.reduce((s, q) => s + (q.score ?? 0), 0) / questions.length
    : null;

  const overallSignal = avgScore === null ? null
    : avgScore >= 0.55 ? 'proceed'
    : avgScore >= 0.30 ? 'borderline'
    : 'pass';

  const overallCfg = {
    proceed:    { label: '✓ Proceed to Interview', color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
    borderline: { label: '~ Borderline — use judgement', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
    pass:       { label: '✗ Pass — not a strong fit', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  };

  const reset = () => {
    setStep('setup');
    setJobSpec('');
    setCandidateName('');
    setQuestions([]);
    setError('');
    setActiveQ(0);
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
          Paste or upload a job spec, generate screening questions, then score a candidate's answers live on the phone.
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
                  width: '100%', background: 'var(--bg3)',
                  border: '1px solid var(--border)', borderRadius: 10,
                  padding: 14, color: 'var(--text)', fontSize: 13,
                  lineHeight: 1.65, resize: 'vertical', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>
                Candidate (optional)
              </div>
              <input
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
                placeholder="e.g. James Okafor"
                style={{
                  width: '100%', background: 'var(--bg3)',
                  border: '1px solid var(--border)', borderRadius: 10,
                  padding: '11px 14px', color: 'var(--text)', fontSize: 13,
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {candidateName ? `Screening: ${candidateName}` : 'Phone Screen'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {questions.filter(q => q.signal !== null).length} of {questions.length} questions scored
                </div>
              </div>
              <button
                onClick={reset}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ← New screen
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'var(--bg3)', borderRadius: 99, height: 4, marginBottom: 24, overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${(questions.filter(q => q.signal !== null).length / questions.length) * 100}%` }}
                transition={{ duration: 0.4 }}
                style={{ height: '100%', background: 'linear-gradient(90deg, var(--blue), #a78bfa)', borderRadius: 99 }}
              />
            </div>

            {/* Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {questions.map((aq, idx) => (
                <motion.div
                  key={aq.question.questionId}
                  layout
                  style={{
                    background: 'var(--bg2)',
                    border: `1px solid ${activeQ === idx ? 'rgba(79,142,247,0.4)' : aq.signal ? 'var(--border)' : 'var(--border)'}`,
                    borderRadius: 14,
                    overflow: 'hidden',
                    opacity: activeQ !== idx && !aq.signal ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Q header */}
                  <div
                    style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
                    onClick={() => setActiveQ(activeQ === idx ? -1 : idx)}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 1,
                      background: aq.signal === 'strong' ? 'rgba(52,211,153,0.15)'
                        : aq.signal === 'partial' ? 'rgba(245,158,11,0.12)'
                        : aq.signal === 'weak' ? 'rgba(239,68,68,0.12)'
                        : 'rgba(79,142,247,0.1)',
                      border: `1px solid ${aq.signal === 'strong' ? 'rgba(52,211,153,0.3)'
                        : aq.signal === 'partial' ? 'rgba(245,158,11,0.3)'
                        : aq.signal === 'weak' ? 'rgba(239,68,68,0.25)'
                        : 'rgba(79,142,247,0.25)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800,
                      color: aq.signal ? (aq.signal === 'strong' ? '#34D399' : aq.signal === 'partial' ? '#F59E0B' : '#EF4444') : 'var(--blue)',
                    }}>
                      {aq.signal === 'strong' ? '✓' : aq.signal === 'weak' ? '✗' : idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
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
                    </div>
                    {aq.signal && <SignalChip signal={aq.signal} score={aq.score!} />}
                  </div>

                  {/* Expanded: answer + score */}
                  <AnimatePresence>
                    {activeQ === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>
                          {/* Model answer (collapsed hint) */}
                          <details style={{ marginTop: 14, marginBottom: 14 }}>
                            <summary style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', cursor: 'pointer', userSelect: 'none', listStyle: 'none' }}>
                              💡 What to listen for ↓
                            </summary>
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.65, padding: '10px 14px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 8 }}>
                              {aq.question.modelAnswer}
                            </div>
                          </details>

                          {/* Answer input */}
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                            Candidate's answer — type a summary
                          </div>
                          <textarea
                            value={aq.answer}
                            onChange={e => setQuestions(qs => qs.map((q, i) => i === idx ? { ...q, answer: e.target.value, signal: null, score: null } : q))}
                            placeholder="e.g. Mentioned leading a 12-person team through Azure migration, reduced deployment time by 60%…"
                            rows={3}
                            style={{
                              width: '100%', background: 'var(--bg3)',
                              border: '1px solid var(--border)', borderRadius: 10,
                              padding: 12, color: 'var(--text)', fontSize: 13,
                              lineHeight: 1.6, resize: 'vertical', outline: 'none',
                              fontFamily: 'inherit', boxSizing: 'border-box',
                              marginBottom: 12,
                            }}
                          />

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                scoreQuestion(idx);
                                if (idx < questions.length - 1) setActiveQ(idx + 1);
                              }}
                              disabled={aq.answer.trim().length < 5}
                              style={{
                                background: aq.answer.trim().length >= 5 ? 'var(--blue)' : 'rgba(79,142,247,0.25)',
                                color: '#fff', border: 'none', borderRadius: 9,
                                padding: '10px 22px', fontSize: 13, fontWeight: 700,
                                cursor: aq.answer.trim().length >= 5 ? 'pointer' : 'default',
                                fontFamily: 'inherit',
                              }}
                            >
                              Score Answer →
                            </button>

                            {aq.signal && <SignalChip signal={aq.signal} score={aq.score!} />}

                            {idx < questions.length - 1 && (
                              <button
                                onClick={() => setActiveQ(idx + 1)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}
                              >
                                Skip →
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Finish button */}
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
            <div style={{
              background: overallCfg[overallSignal].bg,
              border: `1.5px solid ${overallCfg[overallSignal].border}`,
              borderRadius: 14, padding: '28px 32px', marginBottom: 24, textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>
                {overallSignal === 'proceed' ? '✅' : overallSignal === 'borderline' ? '⚖️' : '❌'}
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
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Question Breakdown
              </div>
              {questions.map((aq, idx) => (
                <div key={aq.question.questionId} style={{
                  padding: '14px 20px',
                  borderBottom: idx < questions.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', minWidth: 20 }}>Q{idx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, marginBottom: 4 }}>{aq.question.questionText}</div>
                    {aq.answer && <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.5 }}>"{aq.answer}"</div>}
                  </div>
                  {aq.signal && <SignalChip signal={aq.signal} score={aq.score!} />}
                </div>
              ))}
            </div>

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

