import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { readCandidateSessionFromHash, type CandidateFeedbackSession, type FeedbackOutcome } from '../utils/clientSession';
import { mapImprovementAreasToLearnModules, type LearnModule } from '../utils/learnModules';

type CandidateTab = 'feedback' | 'learn' | 'reinterview';

const OUTCOME_META: Record<FeedbackOutcome, { label: string; color: string; bg: string; border: string; icon: string; headline: string }> = {
  pass: {
    label: 'Congratulations — you have been progressed',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.25)',
    icon: '✓',
    headline: 'Great news',
  },
  'door-open': {
    label: 'The client is keeping the door open for you',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    icon: '⟳',
    headline: 'Keep going',
  },
  fail: {
    label: 'You have not been progressed at this time',
    color: '#F87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.25)',
    icon: '○',
    headline: 'Thank you for your time',
  },
};

export default function ExplainFeedback() {
  const [session, setSession] = useState<CandidateFeedbackSession | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<CandidateTab>('feedback');

  useEffect(() => {
    const s = readCandidateSessionFromHash();
    if (s) {
      setSession(s);
      if (s.outcome === 'door-open') setTab('feedback');
    } else {
      setError(true);
    }
  }, []);

  if (error) return <PortalError />;
  if (!session) return <PortalLoading />;

  const meta = OUTCOME_META[session.outcome];
  const modules = mapImprovementAreasToLearnModules(session.improvementAreas);
  const showReInterview = session.outcome === 'door-open';

  const TABS: { id: CandidateTab; label: string; show: boolean }[] = [
    { id: 'feedback', label: 'Your Feedback', show: true },
    { id: 'learn', label: `LEARN Recommendations${modules.length ? ` (${modules.length})` : ''}`, show: true },
    { id: 'reinterview', label: 'Re-Interview Prep', show: showReInterview },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
            <span style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>EXPLAIN</span>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>Interview Feedback</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0f1729 0%, #111827 100%)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              {meta.headline}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
              {session.candidateName}
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
              {session.role}{session.company ? ` · ${session.company}` : ''}
            </div>
          </div>

          {/* Outcome badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '10px 16px', borderRadius: '10px',
            background: meta.bg, border: `1px solid ${meta.border}`,
          }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: meta.bg, border: `1px solid ${meta.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, fontWeight: 900, fontSize: '14px', flexShrink: 0 }}>
              {meta.icon}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: meta.color }}>{meta.label}</span>
          </div>

          {session.outcome === 'door-open' && (
            <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>
              <strong style={{ color: '#F59E0B' }}>The client may reconsider you.</strong> Strengthen the areas below and your recruiter can re-submit your application. The LEARN modules recommended for you are designed specifically around what this client wanted to see more of.
            </div>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', display: 'flex' }}>
          {TABS.filter(t => t.show).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '14px 20px', fontSize: '13px', fontWeight: 600,
                color: tab === t.id ? 'var(--blue)' : 'var(--text-3)',
                borderBottom: `2px solid ${tab === t.id ? 'var(--blue)' : 'transparent'}`,
                transition: 'color 0.15s, border-color 0.15s', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === 'feedback'     && <FeedbackTab session={session} meta={meta} onGoLearn={() => setTab('learn')} />}
            {tab === 'learn'        && <LearnTab modules={modules} improvementAreas={session.improvementAreas} />}
            {tab === 'reinterview'  && <ReInterviewTab session={session} modules={modules} onGoLearn={() => setTab('learn')} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          Prepared by {session.recruiterName ?? 'your recruiter'} via InterviewMe.global · This feedback is confidential
        </span>
      </div>
    </div>
  );
}

// ── Feedback Tab ──────────────────────────────────────────────────────────────

function FeedbackTab({ session, meta, onGoLearn }: {
  session: CandidateFeedbackSession;
  meta: typeof OUTCOME_META[FeedbackOutcome];
  onGoLearn: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <Section title="Feedback Summary">
        <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {session.feedbackText}
        </div>
      </Section>

      {session.recruiterNotes && (
        <Section title="Notes from your Recruiter">
          <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7 }}>
            {session.recruiterNotes}
          </div>
        </Section>
      )}

      {session.improvementAreas.length > 0 && (
        <Section title="Areas to Develop">
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '14px', lineHeight: 1.6 }}>
            The client identified these as areas where they would have liked to see more from you. We have matched each one to a LEARN module to help you strengthen them.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {session.improvementAreas.map(area => (
              <span key={area} style={{
                fontSize: '13px', fontWeight: 700, padding: '6px 14px', borderRadius: '8px',
                background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color,
              }}>
                {area}
              </span>
            ))}
          </div>
          <button
            onClick={onGoLearn}
            style={{
              background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px',
              padding: '12px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            View LEARN Recommendations →
          </button>
        </Section>
      )}

      {session.improvementAreas.length === 0 && (
        <div style={{ padding: '20px', background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
          No specific improvement areas were identified — great interview performance.
        </div>
      )}
    </div>
  );
}

// ── Learn Tab ─────────────────────────────────────────────────────────────────

function LearnTab({ modules, improvementAreas }: { modules: LearnModule[]; improvementAreas: string[] }) {
  const [started, setStarted] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, number>>({});

  function startModule(id: string) {
    setStarted(prev => new Set(prev).add(id));
    let pct = 0;
    const timer = setInterval(() => {
      pct += Math.random() * 18 + 4;
      if (pct >= 100) { pct = 100; clearInterval(timer); }
      setProgress(prev => ({ ...prev, [id]: pct }));
    }, 600);
  }

  if (!modules.length) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: '14px' }}>
        No improvement areas were identified — no modules to recommend right now.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div>
        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>Your personalised LEARN plan</div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
          {modules.length} module{modules.length !== 1 ? 's' : ''} matched to your improvement areas — ordered by relevance.
          {improvementAreas.length > 0 && <> Based on: <em>{improvementAreas.join(', ')}</em>.</>}
        </div>
      </div>

      {groupByCategory(modules).map(({ category, items }) => (
        <div key={category}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: '12px' }}>
            {category}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map(mod => (
              <ModuleCard
                key={mod.id}
                module={mod}
                isStarted={started.has(mod.id)}
                progress={progress[mod.id] ?? 0}
                onStart={() => startModule(mod.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModuleCard({ module: mod, isStarted, progress, onStart }: {
  module: LearnModule;
  isStarted: boolean;
  progress: number;
  onStart: () => void;
}) {
  const diffColor = mod.difficulty === 'Beginner' ? '#34D399' : mod.difficulty === 'Intermediate' ? '#F59E0B' : '#F87171';
  const pct = Math.round(progress);
  const done = pct >= 100;

  return (
    <div style={{ background: 'var(--bg2)', border: `1px solid ${isStarted ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`, borderRadius: '12px', padding: '18px 20px', transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{mod.title}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.55, marginBottom: '12px' }}>
            {mod.description}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Tag label={`${mod.estimatedMinutes} min`} color="var(--text-3)" />
            <Tag label={mod.difficulty} color={diffColor} />
            <Tag label={mod.category} color="var(--text-3)" />
          </div>
        </div>
        <button
          onClick={!done ? onStart : undefined}
          style={{
            flexShrink: 0, padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
            cursor: done ? 'default' : 'pointer', whiteSpace: 'nowrap',
            background: done ? 'rgba(52,211,153,0.12)' : isStarted ? 'rgba(79,142,247,0.12)' : 'var(--blue)',
            border: done ? '1px solid rgba(52,211,153,0.3)' : isStarted ? '1px solid rgba(79,142,247,0.3)' : 'none',
            color: done ? '#34D399' : isStarted ? '#4F8EF7' : '#fff',
            transition: 'all 0.2s',
          }}
        >
          {done ? '✓ Complete' : isStarted ? 'Continue' : 'Start Module'}
        </button>
      </div>

      {isStarted && (
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>Progress</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: done ? '#34D399' : '#4F8EF7' }}>{pct}%</span>
          </div>
          <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5 }}
              style={{ height: '100%', background: done ? '#34D399' : '#4F8EF7', borderRadius: '2px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Re-Interview Tab ───────────────────────────────────────────────────────────

function ReInterviewTab({ session, modules, onGoLearn }: {
  session: CandidateFeedbackSession;
  modules: LearnModule[];
  onGoLearn: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div style={{ padding: '20px 22px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#F59E0B', marginBottom: '6px' }}>
          You are still in the running
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7 }}>
          {session.company ?? 'The client'} is keeping the door open. If their first-choice candidate doesn't accept, or if you demonstrate clear improvement in the areas below, your recruiter can re-submit you. The modules in your LEARN plan are mapped directly to what the interviewer wanted to see more of.
        </div>
      </div>

      {session.improvementAreas.length > 0 && (
        <Section title="Strengthen these areas before re-submission">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            {session.improvementAreas.map(area => (
              <span key={area} style={{ fontSize: '13px', fontWeight: 700, padding: '6px 14px', borderRadius: '8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                {area}
              </span>
            ))}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.65 }}>
            Work through your LEARN modules for each of these areas. Once you feel confident, let your recruiter know — they can arrange a follow-up conversation with the client.
          </p>
        </Section>
      )}

      <Section title="Your Re-Interview Module Playlist">
        {modules.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {modules.slice(0, 5).map((mod, i) => (
              <div key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-3)', width: '20px', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{mod.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{mod.estimatedMinutes} min · {mod.difficulty}</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', color: '#4F8EF7' }}>
                  {mod.category}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>No modules matched — complete the modules in the LEARN tab.</p>
        )}
        <button
          onClick={onGoLearn}
          style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
        >
          Start your LEARN plan →
        </button>
      </Section>

      <Section title="Next Steps">
        {[
          { n: 1, text: 'Complete the LEARN modules matched to your improvement areas.' },
          { n: 2, text: 'Practise answering the questions you found most challenging using the Interview Prep tool.' },
          { n: 3, text: 'Reach out to your recruiter and let them know you are ready to be reconsidered.' },
          { n: 4, text: 'Your recruiter will contact the client and arrange a follow-up if appropriate.' },
        ].map(step => (
          <div key={step.n} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '12px 0', borderBottom: step.n < 4 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', color: '#4F8EF7', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
              {step.n}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.65 }}>{step.text}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: '14px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, color, padding: '2px 8px', borderRadius: '5px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
      {label}
    </span>
  );
}

function groupByCategory(modules: LearnModule[]): { category: string; items: LearnModule[] }[] {
  const map = new Map<string, LearnModule[]>();
  for (const mod of modules) {
    if (!map.has(mod.category)) map.set(mod.category, []);
    map.get(mod.category)!.push(mod);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

function PortalLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px', color: 'var(--text)' }}>EXPLAIN</div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Loading your feedback…</div>
      </div>
    </div>
  );
}

function PortalError() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
        <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '16px', color: 'var(--text)' }}>EXPLAIN</div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Feedback not found</div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
          This link may have expired or been entered incorrectly. Please ask your recruiter to resend the feedback link.
        </div>
      </div>
    </div>
  );
}

