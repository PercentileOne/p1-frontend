import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChairSpinner } from '../../components/ChairSpinner';
import type { ClientSession, FeedbackOutcome } from '../../utils/clientSession';
import { getRoleImprovementAreas } from '../../utils/clientSession';
import { generateFeedbackWithAI } from '../../api/aiScoring';

interface Props { session: ClientSession }

type FeedbackStep = 'outcome' | 'areas' | 'notes' | 'generating' | 'review';

const OUTCOME_CONFIG: Record<FeedbackOutcome, { label: string; sub: string; color: string; bg: string; icon: string }> = {
  pass: {
    label: 'Pass',
    sub: 'Candidate is being progressed to the next stage',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.08)',
    icon: '✓',
  },
  'door-open': {
    label: 'Leave Door Open',
    sub: 'Not progressing now, but may reconsider if first choice declines',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    icon: '⟳',
  },
  fail: {
    label: 'Not Progressing',
    sub: 'Candidate will not be moved forward at this time',
    color: '#F87171',
    bg: 'rgba(248,113,113,0.08)',
    icon: '×',
  },
};

export default function ClientFeedback({ session }: Props) {
  const { meta, cvCtx, jobCtx } = session;
  const [step, setStep] = useState<FeedbackStep>('outcome');
  const [outcome, setOutcome] = useState<FeedbackOutcome | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [clientNotes, setClientNotes] = useState('');
  const [generatedFeedback, setGeneratedFeedback] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const areaGroups = getRoleImprovementAreas(jobCtx.title, jobCtx.industry);

  function toggleArea(area: string) {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  }

  async function generate() {
    if (!outcome) return;
    setStep('generating');
    setError('');
    try {
      const summary = await generateFeedbackWithAI({
        candidateName: meta.candidateName,
        role: jobCtx.title,
        company: jobCtx.company,
        industry: jobCtx.industry,
        cvCtx: cvCtx as Parameters<typeof generateFeedbackWithAI>[0]['cvCtx'],
        outcome,
        improvementAreas: selectedAreas,
        clientNotes,
      });
      setGeneratedFeedback(summary);
      setStep('review');
    } catch {
      setError('Failed to generate feedback — please check your connection and try again.');
      setStep('notes');
    }
  }

  async function copyFeedback() {
    await navigator.clipboard.writeText(generatedFeedback);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function restart() {
    setStep('outcome');
    setOutcome(null);
    setSelectedAreas([]);
    setClientNotes('');
    setGeneratedFeedback('');
    setError('');
  }

  const outcomeConfig = outcome ? OUTCOME_CONFIG[outcome] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '680px' }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
          Provide Feedback
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
          Your feedback will be turned into a professional, kind summary by AI and sent to {meta.candidateName} via your recruiter.
          It takes under 2 minutes and makes a real difference.
        </div>
      </div>

      {/* Progress bar */}
      <StepBar current={step} />

      <AnimatePresence mode="wait">

        {/* Step 1: Outcome */}
        {step === 'outcome' && (
          <Fade key="outcome">
            <StepTitle n={1} title="What is the outcome for this candidate?" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(Object.entries(OUTCOME_CONFIG) as [FeedbackOutcome, typeof OUTCOME_CONFIG[FeedbackOutcome]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => { setOutcome(key); setStep('areas'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '16px 20px', borderRadius: '12px',
                    background: outcome === key ? cfg.bg : 'var(--bg2)',
                    border: `1px solid ${outcome === key ? cfg.color + '50' : 'var(--border)'}`,
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '20px', width: '28px', height: '28px', borderRadius: '50%', background: cfg.bg, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, fontWeight: 800, flexShrink: 0 }}>
                    {cfg.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: cfg.color, marginBottom: '2px' }}>{cfg.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{cfg.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </Fade>
        )}

        {/* Step 2: Improvement areas */}
        {step === 'areas' && outcomeConfig && (
          <Fade key="areas">
            <StepTitle n={2} title="Select areas to develop (optional)" />
            <div style={{ marginBottom: '8px' }}>
              <OutcomePill config={outcomeConfig} outcome={outcome!} onBack={() => setStep('outcome')} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px', lineHeight: 1.6 }}>
              Choose any areas where the candidate showed room for growth. These will be woven into the feedback naturally.
              {outcome === 'pass' && ' Even successful candidates benefit from knowing what to keep developing.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {areaGroups.map((group, gi) => (
                <div key={gi} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {group.map(area => (
                    <button
                      key={area}
                      onClick={() => toggleArea(area)}
                      style={{
                        padding: '7px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                        background: selectedAreas.includes(area) ? 'rgba(79,142,247,0.15)' : 'var(--bg2)',
                        border: `1px solid ${selectedAreas.includes(area) ? 'rgba(79,142,247,0.4)' : 'var(--border)'}`,
                        color: selectedAreas.includes(area) ? '#4F8EF7' : 'var(--text-2)',
                      }}
                    >
                      {selectedAreas.includes(area) ? '✓ ' : ''}{area}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            {selectedAreas.length > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '12px' }}>
                {selectedAreas.length} area{selectedAreas.length !== 1 ? 's' : ''} selected: {selectedAreas.join(', ')}
              </div>
            )}
            <NavRow
              onBack={() => setStep('outcome')}
              onNext={() => setStep('notes')}
              nextLabel="Next →"
            />
          </Fade>
        )}

        {/* Step 3: Notes */}
        {step === 'notes' && outcomeConfig && (
          <Fade key="notes">
            <StepTitle n={3} title="Any additional notes? (optional)" />
            <OutcomePill config={outcomeConfig} outcome={outcome!} onBack={() => setStep('outcome')} />
            {selectedAreas.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px', marginTop: '12px' }}>
                {selectedAreas.map(a => (
                  <span key={a} style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '5px', background: 'rgba(79,142,247,0.12)', color: '#4F8EF7', border: '1px solid rgba(79,142,247,0.25)' }}>{a}</span>
                ))}
              </div>
            )}
            <textarea
              value={clientNotes}
              onChange={e => setClientNotes(e.target.value)}
              placeholder={`e.g. "${meta.candidateName} interviewed well but lacked depth on ${selectedAreas[0] ?? 'the key competency'}. Strong culture fit. Consider for a junior version of the role."`}
              rows={4}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px',
                padding: '12px 14px', color: 'var(--text)', fontSize: '13px', resize: 'vertical',
                boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.6,
              }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }}>
              These notes help the AI write accurate, specific feedback. They will not be shared verbatim with the candidate.
            </p>
            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px', fontSize: '13px', color: '#F87171' }}>
                {error}
              </div>
            )}
            <NavRow
              onBack={() => setStep('areas')}
              onNext={generate}
              nextLabel="Generate feedback →"
              nextAccent
            />
          </Fade>
        )}

        {/* Generating */}
        {step === 'generating' && (
          <Fade key="generating">
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <ChairSpinner size={110} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                Writing feedback…
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                AI is crafting professional, kind feedback for {meta.candidateName}.
              </div>
            </div>
          </Fade>
        )}

        {/* Step 4: Review */}
        {step === 'review' && outcomeConfig && (
          <Fade key="review">
            <StepTitle n={4} title="Review your feedback" />
            <OutcomePill config={outcomeConfig} outcome={outcome!} onBack={() => {}} showBack={false} />

            <div style={{ marginTop: '16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 22px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: '14px' }}>
                AI-Generated Feedback Draft
              </div>
              <textarea
                value={generatedFeedback}
                onChange={e => setGeneratedFeedback(e.target.value)}
                rows={10}
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--text)', fontSize: '14px', lineHeight: 1.75, resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px', lineHeight: 1.5 }}>
              Edit freely — the text above is a starting point. When you're happy, copy it and send to your recruiter, or use the button below.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={copyFeedback}
                style={{
                  flex: 1, padding: '13px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                  background: copied ? 'rgba(52,211,153,0.15)' : 'var(--blue)',
                  border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'var(--blue)'}`,
                  color: copied ? '#34D399' : '#fff', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {copied ? '✓ Copied to clipboard' : 'Copy feedback'}
              </button>
              <button
                onClick={restart}
                style={{ padding: '13px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text-3)', cursor: 'pointer' }}
              >
                Start over
              </button>
            </div>

            <div style={{ marginTop: '20px', padding: '14px 16px', background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-2)' }}>Next:</strong> Copy this feedback and send it to your recruiter. They will review it, add any notes, and send it to {meta.candidateName} on your behalf. The candidate will also receive relevant learning recommendations based on the development areas you identified.
            </div>
          </Fade>
        )}
      </AnimatePresence>
    </div>
  );
}

function Fade({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{children}</div>
    </motion.div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
        {n}
      </span>
      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{title}</span>
    </div>
  );
}

function OutcomePill({ config, onBack, showBack = true }: { config: typeof OUTCOME_CONFIG[FeedbackOutcome]; outcome: FeedbackOutcome; onBack: () => void; showBack?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: config.bg, border: `1px solid ${config.color}30`, borderRadius: '8px' }}>
      <span style={{ fontSize: '13px', fontWeight: 700, color: config.color }}>{config.label}</span>
      <span style={{ fontSize: '12px', color: 'var(--text-3)', flex: 1 }}>{config.sub}</span>
      {showBack && (
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-3)', padding: '0', textDecoration: 'underline' }}>
          Change
        </button>
      )}
    </div>
  );
}

function NavRow({ onBack, onNext, nextLabel, nextAccent }: { onBack: () => void; onNext: () => void; nextLabel: string; nextAccent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
      <button onClick={onBack} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer' }}>
        ← Back
      </button>
      <button onClick={onNext} style={{ background: nextAccent ? 'var(--blue)' : 'var(--bg2)', border: `1px solid ${nextAccent ? 'var(--blue)' : 'var(--border)'}`, borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 700, color: nextAccent ? '#fff' : 'var(--text-2)', cursor: 'pointer' }}>
        {nextLabel}
      </button>
    </div>
  );
}

const STEPS: FeedbackStep[] = ['outcome', 'areas', 'notes', 'review'];
function StepBar({ current }: { current: FeedbackStep }) {
  const idx = STEPS.indexOf(current === 'generating' ? 'review' : current);
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= idx ? 'var(--blue)' : 'var(--border)', transition: 'background 0.3s' }} />
      ))}
    </div>
  );
}
