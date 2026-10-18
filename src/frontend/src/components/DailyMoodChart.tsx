import { useEffect, useMemo, useRef, useState } from 'react';
import { planningApi } from '../api/planningApi';
import type { MoodDay } from '../api/planningApi';
import { localDate, routinesApi } from '../api/routinesApi';
import type { DaySummary } from '../api/routinesApi';
import { addDays, dateRange, monthsBetween } from '../utils/dateRange';
import { MOOD_COLOURS, MOOD_GREEN, MOOD_AMBER, MOOD_RED, MOOD_LABELS, moodColourForAverage } from '../utils/mood';

// Mood by day (Francis, 2026-10-18): the one-tap daily mood as a line, with a bar underneath for the share of that day's essentials that were done, so good
// moods and good routine days can be compared. Days with no mood are left blank, and are not counted in the average, unless "Show unrecorded days as Okay" is
// switched on: then they appear as faint hollow dots at Okay, so they can always be told apart from real taps. Click a point to open that day.

const W = 640, H = 270, L = 62, R = 18, T = 14, PAD = 14;
const MOOD_H = 170, BAR_TOP = 205, BAR_H = 36;
const RANGES = [{ days: 30, name: 'Last 30 days' }, { days: 90, name: 'Last 90 days' }, { days: 365, name: 'Last year' }];

function short(date: string): string { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
function long(date: string): string { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }

export function DailyMoodChart({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const today = useMemo(() => localDate(), []);
  const [days, setDays] = useState(30);
  const [fillOkay, setFillOkay] = useState(false);
  const [moods, setMoods] = useState<MoodDay[] | null>(null);
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const from = addDays(today, -(days - 1));

  useEffect(() => {
    const mine = ++seq.current;
    setMoods(null); setError('');
    (async () => {
      try {
        const [m, ...months] = await Promise.all([
          planningApi.moods(from, today),
          ...monthsBetween(from, today).map(k => routinesApi.month(k).catch(() => [] as DaySummary[])),
        ]);
        if (seq.current !== mine) return;
        setMoods(Array.isArray(m) ? m : []);
        setSummaries(months.flat().filter((s): s is DaySummary => !!s && typeof s.date === 'string'));
      } catch (e) {
        if (seq.current === mine) { setMoods([]); setError((e as Error).message || 'Could not load your moods. Try again.'); }
      }
    })();
  }, [from, today]);

  const box: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 };
  const chip = (on: boolean): React.CSSProperties => ({ padding: '5px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, border: `1px solid ${on ? MOOD_GREEN : 'var(--border)'}`, background: on ? 'rgba(52,211,153,0.14)' : 'none', color: on ? MOOD_GREEN : 'var(--text-2, var(--text))' });

  const dates = dateRange(from, today);
  const byDate = new Map((moods ?? []).map(m => [m.date, m.rating]));
  const essPct = new Map<string, number>();
  summaries.forEach(s => { if (s.essentialsTotal > 0 && s.date >= from && s.date <= today) essPct.set(s.date, s.essentialsDone / s.essentialsTotal); });
  const recorded = dates.filter(d => byDate.has(d));

  const plotW = W - L - R;
  const x = (i: number) => (dates.length <= 1 ? L + plotW / 2 : L + (i / (dates.length - 1)) * plotW);
  const y = (rating: number) => T + PAD + ((5 - rating) / 4) * (MOOD_H - T - 2 * PAD);

  const avg = recorded.length > 0 ? recorded.reduce((n, d) => n + byDate.get(d)!, 0) / recorded.length : 0;
  const goodDays = recorded.filter(d => (byDate.get(d) ?? 0) >= 4 && essPct.has(d));
  const roughDays = recorded.filter(d => (byDate.get(d) ?? 0) <= 2 && essPct.has(d));
  const mean = (list: string[]) => Math.round((list.reduce((n, d) => n + essPct.get(d)!, 0) / list.length) * 100);
  const insight = goodDays.length >= 2 && roughDays.length >= 2
    ? `On Good or Great days you did ${mean(goodDays)}% of your essentials. On Hard or Rough days, ${mean(roughDays)}%.` : '';

  const line = (fillOkay ? dates.map((d, i) => ({ d, i, r: byDate.get(d) ?? 3 })) : dates.map((d, i) => ({ d, i, r: byDate.get(d) ?? 0 })).filter(p => p.r > 0));
  const tickIdx = Array.from(new Set([0, Math.floor((dates.length - 1) / 3), Math.floor(((dates.length - 1) * 2) / 3), dates.length - 1]));
  const barW = Math.max(2, Math.min(14, plotW / dates.length - 1));

  return (
    <section style={box} aria-label="Mood by day">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.03em' }}>MOOD BY DAY</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="How far back">
          {RANGES.map(r => <button key={r.days} type="button" aria-pressed={days === r.days} onClick={() => setDays(r.days)} style={chip(days === r.days)}>{r.name}</button>)}
        </div>
      </div>

      {moods === null && !error && <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading your moods…</div>}
      {error && <div role="alert" style={{ color: '#EF4444', fontSize: 13.5 }}>{error}</div>}

      {moods !== null && recorded.length === 0 && !error && (
        <div style={{ fontSize: 14, color: 'var(--text-3)' }}>
          No daily moods yet. On any day in Routines, tap how you are today (Rough to Great) and your mood by day will start to appear here.
        </div>
      )}

      {moods !== null && recorded.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <Stat value={`${avg.toFixed(1)} of 5`} colour={moodColourForAverage(avg)} text={`average over ${recorded.length} recorded day${recorded.length === 1 ? '' : 's'}`} />
            <Stat value={`${recorded.length} of ${dates.length}`} colour="var(--text)" text="days with a mood" />
          </div>
          {insight && <div style={{ fontSize: 14, color: 'var(--text-2, var(--text))', background: 'var(--bg3, rgba(255,255,255,0.04))', borderRadius: 10, padding: '10px 12px' }}>{insight}</div>}

          <div style={{ overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`Mood by day: ${recorded.length} days recorded, average ${avg.toFixed(1)} out of 5`} style={{ width: '100%', minWidth: 520, height: 'auto' }}>
              <rect x={L} y={T} width={plotW} height={y(3.5) - T} fill={MOOD_GREEN} opacity={0.08} />
              <rect x={L} y={y(3.5)} width={plotW} height={y(2.5) - y(3.5)} fill={MOOD_AMBER} opacity={0.09} />
              <rect x={L} y={y(2.5)} width={plotW} height={MOOD_H - y(2.5)} fill={MOOD_RED} opacity={0.09} />
              {[1, 2, 3, 4, 5].map(v => (
                <g key={v}>
                  <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--border)' }} strokeWidth={1} />
                  <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={12} style={{ fill: 'var(--text-3)' }}>{MOOD_LABELS[v - 1]}</text>
                </g>
              ))}
              <text x={L - 8} y={BAR_TOP + BAR_H / 2 + 4} textAnchor="end" fontSize={11} style={{ fill: 'var(--text-3)' }}>Essentials</text>
              <line x1={L} x2={W - R} y1={BAR_TOP + BAR_H} y2={BAR_TOP + BAR_H} style={{ stroke: 'var(--border)' }} strokeWidth={1} />

              {dates.map((d, i) => essPct.has(d) && (
                <rect key={`b${d}`} x={x(i) - barW / 2} y={BAR_TOP + BAR_H - essPct.get(d)! * BAR_H} width={barW} height={Math.max(1, essPct.get(d)! * BAR_H)} rx={1.5} fill={MOOD_GREEN} opacity={0.55}>
                  <title>{`${long(d)}: ${Math.round(essPct.get(d)! * 100)}% of essentials`}</title>
                </rect>
              ))}

              {line.length > 1 && <polyline fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={line.map(p => `${x(p.i)},${y(p.r)}`).join(' ')} style={{ stroke: 'var(--text-3)', opacity: 0.55 }} />}

              {fillOkay && dates.map((d, i) => !byDate.has(d) && (
                <circle key={`f${d}`} cx={x(i)} cy={y(3)} r={3.5} fill="none" strokeWidth={1.2} style={{ stroke: 'var(--text-3)', opacity: 0.7 }}><title>{`${long(d)}: not recorded, shown as Okay`}</title></circle>
              ))}

              {dates.map((d, i) => {
                const r = byDate.get(d);
                if (!r) return null;
                const text = `${long(d)}: ${MOOD_LABELS[r - 1]}. Open this day.`;
                return (
                  <g key={d} role="button" tabIndex={0} aria-label={text} style={{ cursor: 'pointer', outline: 'none' }}
                    onClick={() => onOpenDay(d)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDay(d); } }}>
                    <title>{text}</title>
                    <circle cx={x(i)} cy={y(r)} r={11} fill="transparent" />
                    <circle cx={x(i)} cy={y(r)} r={dates.length > 120 ? 3 : 5} fill={MOOD_COLOURS[r - 1]} style={{ stroke: 'var(--bg2)' }} strokeWidth={1.2} />
                  </g>
                );
              })}

              {tickIdx.map(i => (
                <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'} fontSize={12} style={{ fill: 'var(--text-3)' }}>{short(dates[i])}</text>
              ))}
            </svg>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--text-2, var(--text))', cursor: 'pointer' }}>
            <input type="checkbox" checked={fillOkay} onChange={e => setFillOkay(e.target.checked)} style={{ accentColor: MOOD_GREEN }} />
            Show unrecorded days as Okay (faint hollow dots, not counted in the average)
          </label>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--text-3)' }}>
            <span><span aria-hidden="true" style={{ color: MOOD_GREEN }}>●</span> Good or Great</span>
            <span><span aria-hidden="true" style={{ color: MOOD_AMBER }}>●</span> Okay</span>
            <span><span aria-hidden="true" style={{ color: MOOD_RED }}>●</span> Hard or Rough</span>
            <span>▮ Share of essentials done</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Click a point to open that day.</div>
        </>
      )}
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
