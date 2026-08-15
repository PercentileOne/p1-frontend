import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ── Term banks ────────────────────────────────────────────────────────────────

const TERM_BANKS: Record<string, { term: string; hint: string }[]> = {
  'Software Engineer': [
    { term: 'Vertical Slice Architecture', hint: 'How you organise features in a codebase' },
    { term: 'CQRS', hint: 'Separating reads from writes' },
    { term: 'Dependency Injection', hint: 'How objects get what they need' },
    { term: 'Big O Notation', hint: 'Measuring algorithm efficiency' },
    { term: 'Race Condition', hint: 'When timing causes bugs' },
    { term: 'Idempotency', hint: 'Safe to call multiple times' },
    { term: 'Event Sourcing', hint: 'Storing state as a sequence of events' },
    { term: 'Technical Debt', hint: 'The cost of cutting corners' },
    { term: 'Deadlock', hint: 'Two processes waiting on each other forever' },
    { term: 'Refactoring', hint: 'Improving code without changing behaviour' },
    { term: 'Domain-Driven Design', hint: 'Modelling software around the business' },
    { term: 'Microservices', hint: 'Small, independent deployable services' },
    { term: 'REST API', hint: 'Standard way for systems to talk over HTTP' },
    { term: 'Unit Test', hint: 'Testing one thing in isolation' },
    { term: 'CI/CD', hint: 'Automating building and deploying code' },
    { term: 'Dependency Inversion', hint: 'Depend on abstractions, not concretions' },
    { term: 'Eventual Consistency', hint: 'Data that agrees — eventually' },
    { term: 'Blue-Green Deployment', hint: 'Zero-downtime releases' },
  ],
  'Solutions Architect': [
    { term: 'CAP Theorem', hint: 'Consistency, Availability, Partition tolerance' },
    { term: 'Event-Driven Architecture', hint: 'Systems that react to events' },
    { term: 'Saga Pattern', hint: 'Managing distributed transactions' },
    { term: 'Load Balancer', hint: 'Distributing traffic across servers' },
    { term: 'Multi-Tenancy', hint: 'One system serving many customers' },
    { term: 'Strangler Fig Pattern', hint: 'Gradually replacing a legacy system' },
    { term: 'API Gateway', hint: 'Single entry point for all clients' },
    { term: 'Sharding', hint: 'Splitting a database across machines' },
    { term: 'Blue-Green Deployment', hint: 'Zero-downtime releases' },
    { term: 'Service Mesh', hint: 'Infrastructure layer for service-to-service communication' },
    { term: 'Circuit Breaker', hint: 'Stopping cascading failures' },
    { term: 'CQRS', hint: 'Separating reads from writes' },
  ],
  'Product Manager': [
    { term: 'North Star Metric', hint: 'The single number that defines success' },
    { term: 'OKR', hint: 'Objectives and Key Results' },
    { term: 'Jobs To Be Done', hint: 'What the user is actually hiring the product for' },
    { term: 'MVP', hint: 'Minimum Viable Product' },
    { term: 'Product-Market Fit', hint: 'When people genuinely need what you built' },
    { term: 'Churn Rate', hint: 'How fast users leave' },
    { term: 'Net Promoter Score', hint: 'Would you recommend us?' },
    { term: 'Discovery vs Delivery', hint: 'Finding the right thing vs building it right' },
    { term: 'Backlog Grooming', hint: 'Refining and prioritising future work' },
    { term: 'A/B Testing', hint: 'Comparing two versions to find the better one' },
    { term: 'Customer Acquisition Cost', hint: 'What it costs to win one user' },
    { term: 'Lifetime Value', hint: 'Total revenue expected from one customer' },
  ],
  'Cloud Engineer': [
    { term: 'Infrastructure as Code', hint: 'Defining servers in code, not clicks' },
    { term: 'Kubernetes', hint: 'Container orchestration at scale' },
    { term: 'Serverless', hint: 'Running code without managing servers' },
    { term: 'Availability Zone', hint: 'An isolated data centre within a region' },
    { term: 'Auto-Scaling', hint: 'Adding capacity automatically under load' },
    { term: 'CDN', hint: 'Serving content from servers near the user' },
    { term: 'Object Storage', hint: 'Storing files as objects, not folders' },
    { term: 'VPC', hint: 'Your own private network in the cloud' },
    { term: 'Ingress', hint: 'How traffic enters a Kubernetes cluster' },
    { term: 'SLA', hint: 'The uptime you promise to customers' },
    { term: 'RTO / RPO', hint: 'Recovery Time and Recovery Point Objectives' },
    { term: 'Terraform', hint: 'Infrastructure as Code tool by HashiCorp' },
  ],
  'Business Analyst': [
    { term: 'As-Is vs To-Be', hint: 'Current state vs future state' },
    { term: 'Gap Analysis', hint: 'What stands between now and the goal' },
    { term: 'MoSCoW Method', hint: 'Must, Should, Could, Won\'t prioritisation' },
    { term: 'Process Mapping', hint: 'Visualising how work flows' },
    { term: 'Stakeholder Analysis', hint: 'Who is affected and how much' },
    { term: 'Functional Requirement', hint: 'What the system must do' },
    { term: 'Non-Functional Requirement', hint: 'How well the system must do it' },
    { term: 'Use Case', hint: 'A scenario where someone uses the system' },
    { term: 'User Story', hint: 'As a [user] I want [goal] so that [reason]' },
    { term: 'Root Cause Analysis', hint: 'Finding the real cause, not the symptom' },
  ],
  'NHS Clinical Staff': [
    { term: 'SBAR', hint: 'A structured communication framework' },
    { term: 'NEWS2 Score', hint: 'Early warning scoring system' },
    { term: 'Sepsis Six', hint: 'Bundle of treatments within the golden hour' },
    { term: 'Duty of Candour', hint: 'Being open when things go wrong' },
    { term: 'Capacity Assessment', hint: 'Determining if a patient can decide' },
    { term: 'Triage', hint: 'Prioritising patients by urgency' },
    { term: 'Informed Consent', hint: 'Patient agrees knowing the risks' },
    { term: 'Safeguarding', hint: 'Protecting vulnerable individuals' },
    { term: 'DNAR', hint: 'Do Not Attempt Resuscitation order' },
    { term: 'Clinical Governance', hint: 'Accountability for quality of care' },
  ],
  'Finance & Accounting': [
    { term: 'EBITDA', hint: 'Earnings before interest, tax, depreciation, amortisation' },
    { term: 'Working Capital', hint: 'Short-term assets minus short-term liabilities' },
    { term: 'P&L Statement', hint: 'Revenue minus costs over a period' },
    { term: 'Cash Flow', hint: 'Money in versus money out' },
    { term: 'Depreciation', hint: 'Spreading the cost of an asset over time' },
    { term: 'Accruals', hint: 'Recognising costs when incurred, not when paid' },
    { term: 'Break-Even Point', hint: 'Where revenue covers all costs' },
    { term: 'Return on Investment', hint: 'Profit relative to what you spent' },
    { term: 'Balance Sheet', hint: 'Assets, liabilities, and equity at a moment' },
    { term: 'Gross Margin', hint: 'Revenue minus cost of goods sold' },
  ],
  'General Knowledge': [
    { term: 'Cognitive Dissonance', hint: 'Holding two contradictory beliefs' },
    { term: 'Compound Interest', hint: 'Earning interest on interest' },
    { term: 'Supply and Demand', hint: 'The forces that set prices' },
    { term: 'Natural Selection', hint: "Darwin's mechanism for evolution" },
    { term: 'Confirmation Bias', hint: 'Seeing what you already believe' },
    { term: 'Sunk Cost Fallacy', hint: "Continuing because you've already invested" },
    { term: 'Paradigm Shift', hint: 'A fundamental change in thinking' },
    { term: 'Opportunity Cost', hint: 'What you give up by choosing something' },
    { term: 'First Principles Thinking', hint: 'Breaking problems down to their roots' },
    { term: 'Dunning-Kruger Effect', hint: 'Knowing too little to know how little you know' },
    { term: "Occam's Razor", hint: 'The simplest explanation is usually right' },
    { term: 'Heuristic', hint: 'A mental shortcut for decision-making' },
  ],
};

const PROFESSIONS = Object.keys(TERM_BANKS);
const ROUND_SECONDS = 30;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

type GamePhase = 'setup' | 'playing' | 'results';

interface TermResult {
  term: string;
  marked: 'correct' | 'skip' | null;
  timeMs: number;
}

export default function LearnFlashTalkPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const presetProfession = (location.state as { profession?: string } | null)?.profession;

  const [phase, setPhase] = useState<GamePhase>('setup');
  const [profession, setProfession] = useState(presetProfession ?? 'Software Engineer');
  const [terms, setTerms] = useState<{ term: string; hint: string }[]>([]);
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [showHint, setShowHint] = useState(false);
  const [results, setResults] = useState<TermResult[]>([]);
  const [currentStart, setCurrentStart] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsRef = useRef<TermResult[]>([]);

  const currentTerm = terms[idx];
  const progressPct = timeLeft / ROUND_SECONDS;

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Mark current term as timed-out if not yet answered
    const finalResults = [...resultsRef.current];
    if (finalResults.length < terms.length && terms[finalResults.length]) {
      finalResults.push({ term: terms[finalResults.length].term, marked: null, timeMs: ROUND_SECONDS * 1000 });
    }
    setResults(finalResults);
    setPhase('results');
  }, [terms]);

  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, endGame]);

  const startGame = () => {
    const shuffled = shuffle(TERM_BANKS[profession] ?? TERM_BANKS['General Knowledge']).slice(0, 10);
    setTerms(shuffled);
    resultsRef.current = [];
    setResults([]);
    setIdx(0);
    setTimeLeft(ROUND_SECONDS);
    setShowHint(false);
    setCurrentStart(Date.now());
    setPhase('playing');
  };

  const markTerm = (result: 'correct' | 'skip') => {
    const timeMs = Date.now() - currentStart;
    const entry: TermResult = { term: currentTerm.term, marked: result, timeMs };
    resultsRef.current = [...resultsRef.current, entry];

    const nextIdx = idx + 1;
    if (nextIdx >= terms.length) {
      endGame();
      return;
    }
    setIdx(nextIdx);
    setShowHint(false);
    setCurrentStart(Date.now());
  };

  const correct = results.filter(r => r.marked === 'correct').length;
  const skipped = results.filter(r => r.marked === 'skip').length;
  const timedOut = results.filter(r => r.marked === null).length;
  const scorePct = results.length > 0 ? Math.round((correct / results.length) * 100) : 0;

  const timerColor = timeLeft > 15 ? '#34D399' : timeLeft > 7 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system,"Segoe UI",sans-serif', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <button onClick={() => navigate('/learn')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 14px', color: 'var(--text-3)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
          ← Learn
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>⚡ Flash Talk</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Explain the term before the clock runs out</div>
        </div>
        {phase === 'playing' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: timerColor, fontVariantNumeric: 'tabular-nums', minWidth: '44px', textAlign: 'right', transition: 'color 0.3s' }}>{timeLeft}</div>
            <div style={{ width: '6px', height: '48px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
              <motion.div animate={{ height: `${progressPct * 100}%` }} transition={{ duration: 1, ease: 'linear' }}
                style={{ width: '100%', background: timerColor, borderRadius: '3px', transformOrigin: 'bottom', transition: 'background 0.3s' }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <AnimatePresence mode="wait">

          {/* ── SETUP ───────────────────────────────────────────────────── */}
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '56px', marginBottom: '12px' }}>⚡</div>
                <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Flash Talk</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
                  A term appears. You have {ROUND_SECONDS} seconds to explain it.<br />
                  10 terms. Mark each correct or skip. Score as high as you can.
                </p>
              </div>
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>Choose your field</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {PROFESSIONS.map(p => (
                    <button key={p} onClick={() => setProfession(p)}
                      style={{ padding: '8px 16px', borderRadius: '20px', border: `1px solid ${profession === p ? 'var(--blue)' : 'var(--border)'}`, background: profession === p ? 'rgba(79,142,247,0.15)' : 'var(--bg3)', color: profession === p ? 'var(--blue)' : 'var(--text-2)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <motion.button onClick={startGame} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', color: '#fff', border: 'none', borderRadius: '14px', padding: '16px 0', fontSize: '16px', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.01em' }}>
                Start Round →
              </motion.button>
            </motion.div>
          )}

          {/* ── PLAYING ─────────────────────────────────────────────────── */}
          {phase === 'playing' && currentTerm && (
            <motion.div key={`term-${idx}`} initial={{ opacity: 0, x: 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -40, scale: 0.95 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>

              {/* Progress dots */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {terms.map((_, i) => (
                  <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i < idx ? '#34D399' : i === idx ? 'var(--blue)' : 'var(--bg3)', transition: 'background 0.2s' }} />
                ))}
              </div>

              {/* Term card */}
              <div style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '40px 32px', textAlign: 'center', position: 'relative', minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                  Term {idx + 1} of {terms.length}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                  {currentTerm.term}
                </div>
                <AnimatePresence>
                  {showHint && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', width: '100%' }}>
                      <div style={{ background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.25)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: 'var(--blue)', lineHeight: 1.5 }}>
                        💡 {currentTerm.hint}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!showHint && (
                  <button onClick={() => setShowHint(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 16px', fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer', marginTop: '4px' }}>
                    Show hint
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <motion.button onClick={() => markTerm('skip')} whileTap={{ scale: 0.95 }}
                  style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '14px', padding: '18px 0', fontSize: '15px', fontWeight: 700, color: '#EF4444', cursor: 'pointer' }}>
                  ✗ Skip
                </motion.button>
                <motion.button onClick={() => markTerm('correct')} whileTap={{ scale: 0.95 }}
                  style={{ flex: 2, background: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(52,211,153,0.1))', border: '1px solid rgba(52,211,153,0.45)', borderRadius: '14px', padding: '18px 0', fontSize: '15px', fontWeight: 800, color: '#34D399', cursor: 'pointer' }}>
                  ✓ Got it!
                </motion.button>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                ✓ {results.filter(r => r.marked === 'correct').length} correct · ✗ {results.filter(r => r.marked === 'skip').length} skipped
              </div>
            </motion.div>
          )}

          {/* ── RESULTS ─────────────────────────────────────────────────── */}
          {phase === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} style={{ fontSize: '64px', fontWeight: 900, color: scorePct >= 70 ? '#34D399' : scorePct >= 50 ? '#F59E0B' : '#EF4444', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {scorePct}%
                </motion.div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginTop: '8px' }}>
                  {scorePct >= 80 ? 'Excellent! 🏆' : scorePct >= 60 ? 'Good round! 💪' : scorePct >= 40 ? 'Keep practising 📚' : 'Tough one — review and retry'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '6px' }}>
                  {correct} correct · {skipped} skipped · {timedOut} timed out — {profession}
                </div>
              </div>

              {/* Term breakdown */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                {results.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>
                      {r.marked === 'correct' ? '✅' : r.marked === 'skip' ? '❌' : '⏱️'}
                    </span>
                    <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: r.marked === 'correct' ? 'var(--text)' : 'var(--text-3)' }}>
                      {r.term}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                      {r.marked === 'correct' ? `${(r.timeMs / 1000).toFixed(1)}s` : r.marked === 'skip' ? 'skipped' : 'time'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={startGame} style={{ flex: 1, background: 'linear-gradient(135deg, #4F46E5, #6366F1)', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px 0', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>
                  Play Again
                </button>
                <button onClick={() => navigate('/learn')} style={{ flex: 1, background: 'var(--bg2)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 0', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                  Back to Learn
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
