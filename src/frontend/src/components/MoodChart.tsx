import { useState } from 'react';
import type { Cadence, Review } from '../api/planningApi';

// Mood over time (Francis, 2026-10-18): the 1 to 5 rating from each review, drawn as a line against the calendar, so good stretches and dips show at a glance.
// Click a point to open that review. Dates are on a real time scale, so a missed week shows as a gap. Unrated reviews are left out.

const RATINGS = ['Rough', 'Hard', 'Okay', 'Good', 'Great'];
// Traffic lights: red for Rough and Hard, amber for Okay, green for Good and Great.
const RED = '#F87171', AMBER = '#F5B942', GREEN = '#34D399';
const COLOURS = [RED, RED, AMBER, GREEN, GREEN];
const W = 640, H = 230, L = 62, R = 18, T = 14, B = 36, PAD = 14;
const DEFAULT_SHOWN = 26;

function ms(date: string): number { const [y, m, d] = date.split('-').map(Number); return Date.UTC(y, m - 1, d); }
function short(date: string): string { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
function longDate(date: string): string { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
function label(cadence: Cadence, date: string): string {
  const [y, m] = date.split('-').map(Number);
  if (cadence === 'yearly') return String(y);
  if (cadence === 'monthly') return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return `week of ${longDate(date)}`;
}
function tick(cadence: Cadence, date: string): string {
  const [y, m] = date.split('-').map(Number);
  if (cadence === 'yearly') return String(y);
  if (cadence === 'monthly') return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  return short(date);
}

export function MoodChart({ reviews, cadence, currentStart, onOpen }: { reviews: Review[]; cadence: Cadence; currentStart: string; onOpen: (periodStart: string) => void }) {
  const [all, setAll] = useState(false);
  const noun = cadence === 'weekly' ? 'weeks' : cadence === 'monthly' ? 'months' : 'years';
  const rated = reviews.filter(r => r.rating >= 1 && r.rating <= 5).sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const shown = all ? rated : rated.slice(-DEFAULT_SHOWN);

  const box: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 };
  const title = <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.03em' }}>MOOD OVER TIME</div>;

  if (rated.length < 2) {
    return (
      <section style={box} aria-label="Mood over time">
        {title}
        <div style={{ fontSize: 14, color: 'var(--text-3)' }}>
          {rated.length === 0 ? `Rate how a ${noun === 'weeks' ? 'week' : noun === 'months' ? 'month' : 'year'} felt in your review` : `One ${noun === 'weeks' ? 'week' : noun === 'months' ? 'month' : 'year'} rated so far. Rate one more`} and your mood over time will appear here.
        </div>
      </section>
    );
  }

  const t0 = ms(shown[0].periodStart), t1 = ms(shown[shown.length - 1].periodStart);
  const plotW = W - L - R, plotH = H - T - B;
  const x = (date: string) => (t1 === t0 ? L + plotW / 2 : L + ((ms(date) - t0) / (t1 - t0)) * plotW);
  const y = (rating: number) => T + PAD + ((5 - rating) / 4) * (plotH - 2 * PAD);
  const pts = shown.map(r => ({ r, cx: x(r.periodStart), cy: y(r.rating) }));
  const avg = shown.reduce((n, r) => n + r.rating, 0) / shown.length;
  const best = shown.reduce((a, r) => (r.rating > a.rating ? r : a), shown[0]);
  const hardest = shown.reduce((a, r) => (r.rating < a.rating ? r : a), shown[0]);
  const tickIdx = Array.from(new Set([0, Math.floor((shown.length - 1) / 3), Math.floor(((shown.length - 1) * 2) / 3), shown.length - 1]));

  return (
    <section style={box} aria-label="Mood over time">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        {title}
        {rated.length > DEFAULT_SHOWN && (
          <button type="button" onClick={() => setAll(a => !a)} aria-pressed={all} style={{ background: 'none', border: 'none', color: '#34D399', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}>
            {all ? `Show the last ${DEFAULT_SHOWN}` : `Show all ${rated.length}`}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <Stat value={`${avg.toFixed(1)} of 5`} colour={avg >= 3.5 ? GREEN : avg >= 2.5 ? AMBER : RED} text={`average over ${shown.length} ${noun}`} />
        <Stat value={RATINGS[best.rating - 1]} colour={COLOURS[best.rating - 1]} text={`best: ${label(cadence, best.periodStart)}`} />
        <Stat value={RATINGS[hardest.rating - 1]} colour={COLOURS[hardest.rating - 1]} text={`hardest: ${label(cadence, hardest.periodStart)}`} />
      </div>

      {/* On a phone the chart keeps a readable size and scrolls sideways inside its own box, rather than shrinking its labels to nothing. */}
      <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Mood over time: ${shown.length} ${cadence} reviews, average ${avg.toFixed(1)} out of 5`} style={{ width: '100%', minWidth: 520, height: 'auto' }}>
        {/* faint traffic-light zones behind the line */}
        <rect x={L} y={T} width={plotW} height={y(3.5) - T} fill={GREEN} opacity={0.08} />
        <rect x={L} y={y(3.5)} width={plotW} height={y(2.5) - y(3.5)} fill={AMBER} opacity={0.09} />
        <rect x={L} y={y(2.5)} width={plotW} height={T + plotH - y(2.5)} fill={RED} opacity={0.09} />
        {[1, 2, 3, 4, 5].map(v => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--border)' }} strokeWidth={1} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={12} style={{ fill: 'var(--text-3)' }}>{RATINGS[v - 1]}</text>
          </g>
        ))}
        {tickIdx.map(i => (
          <text key={i} x={pts[i].cx} y={H - 12} textAnchor={i === 0 && shown.length > 1 ? 'start' : i === shown.length - 1 ? 'end' : 'middle'} fontSize={12} style={{ fill: 'var(--text-3)' }}>
            {tick(cadence, shown[i].periodStart)}
          </text>
        ))}
        <polyline fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={pts.map(p => `${p.cx},${p.cy}`).join(' ')} style={{ stroke: 'var(--text-3)', opacity: 0.6 }} />
        {pts.map(({ r, cx, cy }) => {
          const current = r.periodStart === currentStart;
          const text = `${label(cadence, r.periodStart)}: ${RATINGS[r.rating - 1]}. Open this review.`;
          return (
            <g key={r.periodStart} role="button" tabIndex={0} aria-label={text} style={{ cursor: 'pointer', outline: 'none' }}
              onClick={() => onOpen(r.periodStart)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(r.periodStart); } }}>
              <title>{text}</title>
              <circle cx={cx} cy={cy} r={14} fill="transparent" />
              {current && <circle cx={cx} cy={cy} r={9} fill="none" strokeWidth={2} style={{ stroke: 'var(--text)' }} />}
              <circle cx={cx} cy={cy} r={5.5} fill={COLOURS[r.rating - 1]} style={{ stroke: 'var(--bg2)' }} strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-3)' }}>
        <span><span aria-hidden="true" style={{ color: GREEN }}>●</span> Good or Great</span>
        <span><span aria-hidden="true" style={{ color: AMBER }}>●</span> Okay</span>
        <span><span aria-hidden="true" style={{ color: RED }}>●</span> Hard or Rough</span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Click a point to read that review. The ringed point is the one you are on.</div>
    </section>
  );
}

function Stat({ value, text, colour }: { value: string; text: string; colour: string }) {
  return (
    <div style={{ background: 'var(--bg3, rgba(255,255,255,0.04))', borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 20, color: colour, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{text}</div>
    </div>
  );
}
