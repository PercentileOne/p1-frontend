import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { explainApi, type InterviewQuestion, type ScoreResponse } from '../api/explainApi';

// Demo pack used when no real packId data is loaded
const DEMO_QUESTIONS: InterviewQuestion[] = [
  {
    questionId: 'q1',
    questionText: 'Tell me about a time you led a team through a difficult technical challenge.',
    modelAnswer: 'Describe a specific situation, the actions you took as leader, how you managed team dynamics, and the measurable outcome you achieved.',
    questionType: 'Behavioural',
    difficulty: 'Medium',
    source: 'Demo',
    competencyTags: ['leadership', 'delivery', 'communication'],
  },
  {
    questionId: 'q2',
    questionText: 'How do you approach designing a system that needs to scale to 10x current load?',
    modelAnswer: 'Discuss capacity planning, horizontal vs vertical scaling, caching strategies, database partitioning, and how you would validate the design through load testing.',
    questionType: 'Technical',
    difficulty: 'Hard',
    source: 'Demo',
    competencyTags: ['architecture', 'problem-solving'],
  },
  {
    questionId: 'q3',
    questionText: 'Describe a situation where you had to manage competing priorities with limited time.',
    modelAnswer: 'Explain how you assessed urgency and impact, how you communicated with stakeholders, and how you delivered despite constraints.',
    questionType: 'Situational',
    difficulty: 'Medium',
    source: 'Demo',
    competencyTags: ['prioritisation', 'stakeholder management'],
  },
];

type Phase = 'question' | 'answering' | 'scored';

const DIM_LABELS: Record<string, string> = {
  clarity: 'Clarity',
  relevance: 'Relevance',
  depth: 'Depth',
  confidence: 'Confidence',
};

const DIM_COLORS: Record<string, string> = {
  high: 'var(--red)',
  medium: 'var(--amber)',
  low: 'var(--green)',
};

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color }}>{Math.round(value * 100)}%</span>
      </div>
      <div style={{ height: '5px', background: 'var(--bg)', borderRadius: '3px', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: '3px' }}
        />
      </div>
    </div>
  );
}

function scoreColor(v: number) {
  if (v >= 0.7) return 'var(--green)';
  if (v >= 0.4) return 'var(--amber)';
  return 'var(--red)';
}

export default function CandidatePractice() {
  const { packId } = useParams<{ packId: string }>();
  const questions = DEMO_QUESTIONS; // In a real build, fetch by packId
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [answer, setAnswer] = useState('');
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResponse | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const q = questions[qIndex];

  useEffect(() => {
    if (phase === 'answering') {
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const startAnswer = () => {
    setPhase('answering');
    setAnswer('');
    setElapsed(0);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setScoring(true);
    try {
      // Use demo scoring with empty token (endpoint is JWT-protected, fallback to local approximation)
      const result = await explainApi.scoreResponse(
        { packId: packId ?? 'demo', questionId: q.questionId, answerText: answer },
        'demo-token'
      ).catch(() => localScore(q, answer));
      setScoreResult(result);
      setPhase('scored');
    } finally {
      setScoring(false);
    }
  };

  const next = () => {
    if (qIndex < questions.length - 1) {
      setQIndex(i => i + 1);
      setPhase('question');
      setAnswer('');
      setScoreResult(null);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const badgeColor = (type: string) => ({ Behavioural: 'var(--blue)', Technical: 'var(--green)', Situational: 'var(--amber)' }[type] ?? 'var(--text-3)');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px', fontFamily: '-apple-system,"Segoe UI",sans-serif' }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '720px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--blue)' }}>Explain · Practice Mode</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Question {qIndex + 1} of {questions.length}</div>
        </div>
        {/* Progress bar */}
        <div style={{ height: '3px', background: 'var(--bg2)', borderRadius: '2px', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${((qIndex + (phase === 'scored' ? 1 : 0)) / questions.length) * 100}%` }}
            transition={{ duration: 0.4 }}
            style={{ height: '100%', background: 'var(--blue)', borderRadius: '2px' }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${qIndex}-${phase}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{ width: '100%', maxWidth: '720px' }}
        >
          {/* Question card */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: badgeColor(q.questionType), background: 'rgba(0,0,0,0.3)', borderRadius: '5px', padding: '3px 9px' }}>{q.questionType}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)', background: 'rgba(0,0,0,0.2)', borderRadius: '5px', padding: '3px 9px' }}>{q.difficulty}</span>
            </div>
            <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.55 }}>{q.questionText}</div>
          </div>

          {/* Phase: question — show Start button */}
          {phase === 'question' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <button onClick={startAnswer} style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '11px', padding: '14px 40px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
                Start Answer
              </button>
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-3)' }}>Your timer starts when you click</div>
            </div>
          )}

          {/* Phase: answering */}
          {phase === 'answering' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: elapsed > 120 ? 'var(--amber)' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{fmt(elapsed)}</div>
              </div>
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type your answer here…"
                rows={8}
                style={{
                  width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px',
                  padding: '16px', color: 'var(--text)', fontSize: '14px', lineHeight: 1.65, resize: 'vertical',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', gap: '10px' }}>
                <button onClick={() => setPhase('question')} style={{ background: 'none', color: 'var(--text-3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={submitAnswer}
                  disabled={!answer.trim() || scoring}
                  style={{ background: answer.trim() && !scoring ? 'var(--blue)' : 'rgba(79,142,247,0.3)', color: '#fff', border: 'none', borderRadius: '9px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: answer.trim() && !scoring ? 'pointer' : 'default' }}
                >
                  {scoring ? 'Scoring…' : 'Submit & Score'}
                </button>
              </div>
            </div>
          )}

          {/* Phase: scored */}
          {phase === 'scored' && scoreResult && (
            <div>
              {/* Overall */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Overall Score</div>
                <div style={{ fontSize: '48px', fontWeight: 800, color: scoreColor(scoreResult.overallScore), letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {Math.round(scoreResult.overallScore * 100)}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>out of 100</div>
              </div>

              {/* Dimension scores */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '16px' }}>Breakdown</div>
                {(['clarity', 'relevance', 'depth', 'confidence'] as const).map(d => (
                  <ScoreBar key={d} label={DIM_LABELS[d]} value={(scoreResult as unknown as Record<string, number>)[d]} color={scoreColor((scoreResult as unknown as Record<string, number>)[d])} />
                ))}
              </div>

              {/* Feedback */}
              {scoreResult.feedback.length > 0 && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '14px' }}>Feedback</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {scoreResult.feedback.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: DIM_COLORS[f.severity] ?? 'var(--text-3)', marginTop: '6px', flexShrink: 0 }} />
                        <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.55 }}>{f.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {scoreResult.suggestions.length > 0 && (
                <div style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '12px' }}>Suggestions</div>
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {scoreResult.suggestions.map((s, i) => (
                      <li key={i} style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.55 }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Your answer */}
              <details style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                <summary style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}>Your Answer</summary>
                <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.65 }}>{answer}</div>
              </details>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={startAnswer} style={{ flex: 1, background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  Try Again
                </button>
                {qIndex < questions.length - 1 && (
                  <button onClick={next} style={{ flex: 1, background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Next Question →
                  </button>
                )}
                {qIndex === questions.length - 1 && (
                  <div style={{ flex: 1, background: 'var(--bg3)', color: 'var(--green)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 700, textAlign: 'center' }}>
                    Practice Complete 🎉
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Local approximation used when API is not available (no auth token)
function localScore(_q: InterviewQuestion, answer: string): ScoreResponse {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const len = words.length;
  const clarity = Math.min(1, len / 80);
  const depth = answer.match(/\d+/) ? 0.65 : 0.35;
  const relevance = 0.5;
  const confidence = answer.toLowerCase().includes('i led') || answer.toLowerCase().includes('i built') ? 0.75 : 0.45;
  const overallScore = Math.round((clarity * 0.25 + relevance * 0.35 + depth * 0.25 + confidence * 0.15) * 10000) / 10000;
  return {
    clarity, relevance, depth, confidence, overallScore,
    feedback: [
      { dimension: 'clarity', message: len < 30 ? 'Your answer is quite short — aim for 60–120 words.' : 'Reasonable length and structure.', severity: len < 30 ? 'high' : 'low' },
    ],
    suggestions: len < 30 ? ['Use the STAR format to structure your answers.'] : [],
  };
}
