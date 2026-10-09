import type { CSSProperties, ReactNode } from 'react';
import { logEvent } from '../api/flowLogger';

// The "Interview, Learn, Interview again, Pass" loop (Francis, 2026-10-09). One card, used on both results screens: the 3-question demo (free public Learn page, opens in a new
// tab) and the full interview's summary (the candidate's own Learn tab). It names the weak areas, gives each a Learn button, offers one click to interview again, and, when
// this person has done the same role before, shows "last time, now", so they see their score climb.

const GREEN = '#34D399', AMBER = '#FBBF24', RED = '#F87171', BLUE = '#4F8EF7';
const colour = (s: number) => (s < 3 ? RED : s < 7 ? AMBER : GREEN);

export interface LoopAction { href?: string; onClick?: () => void; newTab?: boolean }
export interface LoopArea { key: string; label: string; score10: number; blurb: string; learn: LoopAction }

interface CardProps {
  subject: string;
  overall: number;                                    // 0-100
  areas: LoopArea[];                                  // weakest first; empty = strong across the board
  learnAll: LoopAction;
  again: LoopAction;
  previous: { score: number; at?: string } | null;    // an earlier score for the same role, if any
  eventPrefix: string;                                // 'try' or 'summary': tracking names
  mobile: boolean;
  footer?: string;
  learnLabel?: string;
}

function ActionButton({ action, style, onTrack, children }: { action: LoopAction; style: CSSProperties; onTrack: () => void; children: ReactNode }) {
  if (action.href) {
    return <a href={action.href} target={action.newTab ? '_blank' : undefined} rel={action.newTab ? 'noreferrer' : undefined} onClick={() => { onTrack(); action.onClick?.(); }} style={{ textDecoration: 'none', cursor: 'pointer', ...style }}>{children}</a>;
  }
  return <button type="button" onClick={() => { onTrack(); action.onClick?.(); }} style={{ border: 'none', fontFamily: 'inherit', cursor: 'pointer', ...style }}>{children}</button>;
}

export function ImproveLoopCard({ subject, overall, areas, learnAll, again, previous, eventPrefix, mobile, footer, learnLabel = '📚 Learn this →' }: CardProps) {
  const delta = previous ? overall - previous.score : null;
  const steps: { icon: string; text: string; done?: boolean; now?: boolean }[] = [
    { icon: '✓', text: 'Interview', done: true }, { icon: '📚', text: 'Learn', now: true }, { icon: '↻', text: 'Interview again' }, { icon: '🏆', text: 'Pass' },
  ];

  return (
    <div style={{ marginTop: 12, padding: '18px 18px 16px', borderRadius: 16, border: '1px solid rgba(79,142,247,0.35)', background: 'linear-gradient(135deg,rgba(79,142,247,0.10),rgba(52,211,153,0.06))' }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: BLUE, textAlign: 'center' }}>Your path to a pass</div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', margin: '10px 0 14px' }}>
        {steps.map((s, i) => (
          <span key={s.text} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, padding: '5px 11px', borderRadius: 999, color: s.done ? '#04120c' : s.now ? '#fff' : 'var(--text-2, #cbd5e1)', background: s.done ? GREEN : s.now ? BLUE : 'rgba(255,255,255,0.07)' }}>{s.icon} {s.text}</span>
            {i < steps.length - 1 && <span aria-hidden="true" style={{ color: 'var(--text-3, #94a3b8)' }}>→</span>}
          </span>
        ))}
      </div>

      {delta !== null && previous && (
        <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 800, margin: '0 0 14px', color: delta > 0 ? GREEN : delta < 0 ? AMBER : 'var(--text, #f1f5f9)' }}>
          {delta > 0 ? `📈 Last time ${previous.score} → now ${overall} (up ${delta})` : delta < 0 ? `Last time ${previous.score} → now ${overall} (down ${-delta})` : `Last time ${previous.score} → now ${overall} (same)`}
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-3, #94a3b8)', marginTop: 3 }}>
            {delta > 0 ? 'Learning, then interviewing again, works. Keep going.' : 'A wobble is normal. Learn the weak spots below, then go again.'}
          </div>
        </div>
      )}

      {areas.length > 0 ? (
        <>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2, #cbd5e1)', marginBottom: 10 }}>
            <strong style={{ color: 'var(--text, #f1f5f9)' }}>Where to focus.</strong> Learn these, then interview again and watch the score move.
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {areas.map(a => (
              <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.22)', border: `1px solid ${colour(a.score10)}55` }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#0b1220', background: colour(a.score10), borderRadius: 8, padding: '4px 9px', whiteSpace: 'nowrap' }}>{a.label} {Math.round(a.score10)}/10</span>
                <span style={{ flex: '1 1 160px', minWidth: 0, fontSize: 13.5, color: 'var(--text-2, #cbd5e1)' }}>{a.blurb}</span>
                <ActionButton action={a.learn} onTrack={() => logEvent(`${eventPrefix}_learn_click`, { metadata: { area: a.key, score: a.score10, mobile } })}
                  style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: BLUE, borderRadius: 9, padding: '8px 13px', whiteSpace: 'nowrap' }}>{learnLabel}</ActionButton>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-2, #cbd5e1)', marginBottom: 4 }}>
          <strong style={{ color: GREEN }}>Strong across the board.</strong> To stay ahead, go deeper on {subject}.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
        <ActionButton action={learnAll} onTrack={() => logEvent(`${eventPrefix}_learn_click`, { metadata: { area: 'subject', mobile } })}
          style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text, #f1f5f9)', background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border, rgba(255,255,255,0.14))', borderRadius: 11, padding: '11px 16px' }}>📚 Learn all of {subject}</ActionButton>
        <ActionButton action={again} onTrack={() => logEvent(`${eventPrefix}_again_click`, { metadata: { score: overall, hadPrevious: !!previous, mobile } })}
          style={{ fontSize: 14, fontWeight: 900, color: '#fff', background: `linear-gradient(135deg,${GREEN},#047857)`, borderRadius: 11, padding: '11px 18px' }}>↻ Interview again on {subject}</ActionButton>
      </div>
      {footer && <div style={{ fontSize: 12, color: 'var(--text-3, #94a3b8)', textAlign: 'center', marginTop: 10 }}>{footer}</div>}
    </div>
  );
}

// ── The 3-question demo's version: skills scored 0-10, learned on the free public Learn page ─────────────────────────────────────────────────────────────

export type Dim = 'clarity' | 'relevance' | 'accuracy' | 'depth' | 'confidence';

export const DIM_AREAS: Record<Dim, { label: string; blurb: string; topic: (subject: string) => string }> = {
  clarity: { label: 'Clarity', blurb: 'Structuring an answer so it is easy to follow', topic: s => `Structuring clear interview answers with the STAR method (${s})` },
  relevance: { label: 'Relevance', blurb: 'Answering the question that was actually asked', topic: s => `Answering interview questions directly and on point (${s})` },
  accuracy: { label: 'Accuracy', blurb: 'The knowledge interviewers expect you to have', topic: s => `${s}: the core knowledge interviewers expect` },
  depth: { label: 'Depth', blurb: 'Adding a real example and a result', topic: s => `Giving deep, example-led interview answers (${s})` },
  confidence: { label: 'Confidence', blurb: 'Sounding sure of yourself', topic: s => `Sounding confident in interviews (${s})` },
};

const learnUrl = (topic: string) => `/learn-anything?topic=${encodeURIComponent(topic.slice(0, 120))}`;

export function TryImproveLoop({ subject, overall, dimensions, previous, againUrl, mobile }: {
  subject: string; overall: number; dimensions: Record<Dim, number>; previous: { score: number; at: string } | null; againUrl: string; mobile: boolean;
}) {
  const areas: LoopArea[] = (Object.keys(DIM_AREAS) as Dim[]).filter(d => dimensions[d] < 7).sort((a, b) => dimensions[a] - dimensions[b]).slice(0, 3)
    .map(d => ({ key: d, label: DIM_AREAS[d].label, score10: dimensions[d], blurb: DIM_AREAS[d].blurb, learn: { href: learnUrl(DIM_AREAS[d].topic(subject)), newTab: true } }));
  return <ImproveLoopCard subject={subject} overall={overall} areas={areas} previous={previous} eventPrefix="try" mobile={mobile}
    learnAll={{ href: learnUrl(subject), newTab: true }} again={{ href: againUrl }} learnLabel="📚 Learn this free →" footer="Free. We remember your score on this device, so you can see it climb." />;
}
