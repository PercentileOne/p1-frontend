import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MAX_PRIORITIES, MAX_REVIEW_NOTES, MAX_REVIEW_TEXT, periodOf, planningApi, shiftPeriod } from '../api/planningApi';
import type { Cadence, LookBack, Review } from '../api/planningApi';
import { DailyMoodChart } from '../components/DailyMoodChart';
import { MoodChart } from '../components/MoodChart';
import { localDate, routinesApi } from '../api/routinesApi';
import type { DaySummary } from '../api/routinesApi';

// Systems (Francis, 2026-10-18): a review at each rhythm. One engine, three cadences (weekly, monthly, yearly). Each review has three parts:
// look back (worked out from real data), reflect (a few questions and a free-text note), look forward (the top priorities for the next period). It saves by itself.

const GREEN = '#34D399';
const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 };
const field: React.CSSProperties = {
  width: '100%', background: 'var(--bg3, rgba(255,255,255,0.04))', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px',
  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const label: React.CSSProperties = { fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.03em' };

interface CadenceConfig { name: string; noun: string; next: string; q1: string; q2: string; q3: string; notesHint: string }
const CADENCES: Record<Cadence, CadenceConfig> = {
  weekly: {
    name: 'Weekly', noun: 'week', next: 'next week',
    q1: 'What went well this week?', q2: "What didn't go well?", q3: 'What did I learn?',
    notesHint: "Anything else. For example: wasn't pleased with my performance overall, but I had a great meeting, and things look good going forward. I must study more on marketing.",
  },
  monthly: {
    name: 'Monthly', noun: 'month', next: 'next month',
    q1: 'What moved forward this month?', q2: 'What got in the way?', q3: 'What will I change?',
    notesHint: 'Anything else about this month: wins, worries, decisions, things to remember.',
  },
  yearly: {
    name: 'Yearly', noun: 'year', next: 'next year',
    q1: 'What am I proudest of this year?', q2: 'What would I do differently?', q3: 'Who do I want to become next year?',
    notesHint: 'Anything else about this year: the big moments, the lessons, what matters most now.',
  },
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RATINGS = ['Rough', 'Hard', 'Okay', 'Good', 'Great'];

function parts(date: string): [number, number, number] { const [y, m, d] = date.split('-').map(Number); return [y, m, d]; }
function periodTitle(cadence: Cadence, start: string, end: string): string {
  const [ys, ms, ds] = parts(start); const [ye, me, de] = parts(end);
  if (cadence === 'yearly') return String(ys);
  if (cadence === 'monthly') return `${new Date(ys, ms - 1, 1).toLocaleDateString('en-GB', { month: 'long' })} ${ys}`;
  return ms === me ? `${ds}–${de} ${MONTHS[ms - 1]} ${ye}` : `${ds} ${MONTHS[ms - 1]} – ${de} ${MONTHS[me - 1]} ${ye}`;
}

interface Form { rating: number; wentWell: string; didntGoWell: string; learned: string; notes: string; priorities: string[] }
const BLANK: Form = { rating: 0, wentWell: '', didntGoWell: '', learned: '', notes: '', priorities: ['', '', ''] };
function fromReview(r: Review | null): Form {
  if (!r) return BLANK;
  const p = [...r.priorities]; while (p.length < 3) p.push('');
  return { rating: r.rating, wentWell: r.wentWell, didntGoWell: r.didntGoWell, learned: r.learned, notes: r.notes, priorities: p };
}

export default function ReviewsTab({ initialCadence, initialDate, onOpenDay }: { initialCadence?: Cadence; initialDate?: string; onOpenDay?: (date: string) => void } = {}) {
  const today = useMemo(() => localDate(), []);
  const [cadence, setCadence] = useState<Cadence>(initialCadence ?? 'weekly');
  const [anchor, setAnchor] = useState(initialDate ?? today);
  const { start, end } = periodOf(cadence, anchor);
  const cfg = CADENCES[cadence];
  const [form, setForm] = useState<Form>(BLANK);
  const [loaded, setLoaded] = useState(false);
  const [lookBack, setLookBack] = useState<LookBack | null>(null);
  const [history, setHistory] = useState<Review[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [moodView, setMoodView] = useState<'days' | 'reviews'>('days');
  const [error, setError] = useState('');
  const formRef = useRef(form); formRef.current = form;
  const lookRef = useRef(lookBack); lookRef.current = lookBack;
  const timer = useRef<number | null>(null);
  const dirty = useRef(false);
  const keyRef = useRef(''); keyRef.current = `${cadence}|${start}`;

  const loadHistory = useCallback(() => {
    planningApi.reviews(cadence).then(setHistory).catch(() => setHistory([]));
  }, [cadence]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Open a period: the saved review if there is one, and the look-back worked out from real data.
  useEffect(() => {
    let alive = true;
    setLoaded(false); setError(''); setSaveState('idle'); dirty.current = false;
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    (async () => {
      let saved: Review | null = null;
      try { saved = (await planningApi.period(cadence, start)).review; } catch (e) { if (alive) setError((e as Error).message); }
      if (!alive) return;
      setForm(fromReview(saved));
      setLookBack(saved?.lookBack ?? null);
      setLoaded(true);
      const lb = await computeLookBack(start, end);
      if (!alive) return;
      setLookBack(lb);
    })();
    return () => { alive = false; };
  }, [cadence, start, end]);

  const send = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    if (!dirty.current) return;
    dirty.current = false;
    const [c, s] = keyRef.current.split('|') as [Cadence, string];
    const f = formRef.current;
    try {
      await planningApi.saveReview(c, s, { ...f, priorities: f.priorities.map(p => p.trim()).filter(Boolean), lookBack: lookRef.current });
      if (!dirty.current) setSaveState('saved');
      loadHistory();
    } catch (e) {
      dirty.current = true; setSaveState('idle');
      setError((e as Error).message || 'Your review could not be saved. Check your connection.');
    }
  }, [loadHistory]);

  function change(patch: Partial<Form>) {
    setForm(f => ({ ...f, ...patch }));
    dirty.current = true; setSaveState('saving'); setError('');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void send(); }, 1200);
  }
  // Leaving the page must not lose typed words. (Switching period or rhythm flushes in its own click handler, while the old key is still current.)
  const sendRef = useRef(send); sendRef.current = send;
  useEffect(() => () => { void sendRef.current(); }, []);

  const canGoNext = shiftPeriod(cadence, start, 1) <= today;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Your reviews</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>A routine is what you do each day. A system is the regular look back that makes the routine better.</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Review rhythm">
        {(Object.keys(CADENCES) as Cadence[]).map(c => (
          <button key={c} type="button" aria-pressed={cadence === c} onClick={() => { void send(); setCadence(c); setAnchor(today); }}
            style={{ padding: '7px 14px', borderRadius: 999, border: `1px solid ${cadence === c ? GREEN : 'var(--border)'}`, background: cadence === c ? 'rgba(52,211,153,0.14)' : 'none', color: cadence === c ? GREEN : 'var(--text-2, var(--text))', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13 }}>
            {CADENCES[c].name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <button type="button" aria-label={`Previous ${cfg.noun}`} onClick={() => { void send(); setAnchor(shiftPeriod(cadence, start, -1)); }} style={navBtn}><ChevronLeft size={18} /></button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, color: 'var(--text)' }}>{periodTitle(cadence, start, end)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', minHeight: 16 }} aria-live="polite">{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? <span style={{ color: GREEN }}>Saved</span> : ''}</div>
        </div>
        <button type="button" aria-label={`Next ${cfg.noun}`} disabled={!canGoNext} onClick={() => { void send(); setAnchor(shiftPeriod(cadence, start, 1)); }} style={{ ...navBtn, opacity: canGoNext ? 1 : 0.35, cursor: canGoNext ? 'pointer' : 'default' }}><ChevronRight size={18} /></button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Jump to another period">
        <input type="date" aria-label="Jump to a date" value={anchor} min="2024-01-01" max={today}
          onChange={e => { const v = e.target.value; if (v && v >= '2024-01-01' && v <= today) { void send(); setAnchor(v); } }}
          style={{ ...field, width: 'auto', padding: '7px 10px' }} />
        <button type="button" aria-label={`Back to this ${cfg.noun}`} disabled={start <= today && today <= end} onClick={() => { void send(); setAnchor(today); }}
          style={{ padding: '8px 14px', borderRadius: 9, border: `1px solid ${GREEN}`, background: 'transparent', color: GREEN, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, opacity: start <= today && today <= end ? 0.45 : 1 }}>
          This {cfg.noun}
        </button>
      </div>

      {error && <div role="alert" style={{ ...card, padding: 12, color: '#F87171', fontSize: 14 }}>{error}</div>}

      {/* 1. Look back */}
      <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Look back">
        <div style={label}>1. LOOK BACK</div>
        {lookBack ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <Stat value={lookBack.essentialsTotal > 0 ? `${lookBack.essentialsDone} of ${lookBack.essentialsTotal}` : '0'} text="essentials done" />
            <Stat value={`${lookBack.daysAllEssentials} of ${lookBack.daysOpened}`} text="days with every essential done" />
            <Stat value={String(lookBack.practiceInterviews)} text="practice interviews" />
          </div>
        ) : <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Working this out…</div>}
      </section>

      {/* 2. Reflect */}
      <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }} aria-label="Reflect">
        <div style={label}>2. REFLECT</div>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6 }}>How did the {cfg.noun} feel overall?</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Overall rating">
            {RATINGS.map((r, i) => (
              <button key={r} type="button" aria-pressed={form.rating === i + 1} disabled={!loaded} onClick={() => change({ rating: form.rating === i + 1 ? 0 : i + 1 })}
                style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${form.rating === i + 1 ? GREEN : 'var(--border)'}`, background: form.rating === i + 1 ? 'rgba(52,211,153,0.14)' : 'none', color: form.rating === i + 1 ? GREEN : 'var(--text-2, var(--text))', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>{r}</button>
            ))}
          </div>
        </div>
        <Question id="rv1" text={cfg.q1} value={form.wentWell} max={MAX_REVIEW_TEXT} disabled={!loaded} onChange={v => change({ wentWell: v })} />
        <Question id="rv2" text={cfg.q2} value={form.didntGoWell} max={MAX_REVIEW_TEXT} disabled={!loaded} onChange={v => change({ didntGoWell: v })} />
        <Question id="rv3" text={cfg.q3} value={form.learned} max={MAX_REVIEW_TEXT} disabled={!loaded} onChange={v => change({ learned: v })} />
        <Question id="rvn" text="In your own words" value={form.notes} max={MAX_REVIEW_NOTES} rows={5} placeholder={cfg.notesHint} disabled={!loaded} onChange={v => change({ notes: v })} />
      </section>

      {/* 3. Look forward */}
      <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Look forward">
        <div style={label}>3. LOOK FORWARD</div>
        <div style={{ fontSize: 14, color: 'var(--text)' }}>Your top priorities for {cfg.next}</div>
        {form.priorities.map((p, i) => (
          <input key={i} aria-label={`Priority ${i + 1}`} value={p} maxLength={200} disabled={!loaded} placeholder={`Priority ${i + 1}`} style={field}
            onChange={e => change({ priorities: form.priorities.map((x, k) => (k === i ? e.target.value : x)) })} />
        ))}
        {form.priorities.length < MAX_PRIORITIES && (
          <button type="button" onClick={() => change({ priorities: [...form.priorities, ''] })} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: GREEN, cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 14 }}>+ Add another</button>
        )}
      </section>

      {/* Mood over time: the ratings of every saved review of this rhythm, drawn as a line */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Mood view">
        {([['days', 'Mood by day'], ['reviews', `Mood by ${cfg.noun} (from your reviews)`]] as ['days' | 'reviews', string][]).map(([v, text]) => (
          <button key={v} type="button" aria-pressed={moodView === v} onClick={() => setMoodView(v)}
            style={{ padding: '6px 13px', borderRadius: 999, border: `1px solid ${moodView === v ? GREEN : 'var(--border)'}`, background: moodView === v ? 'rgba(52,211,153,0.14)' : 'none', color: moodView === v ? GREEN : 'var(--text-2, var(--text))', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>{text}</button>
        ))}
      </div>
      {moodView === 'days'
        ? <DailyMoodChart onOpenDay={d => { void send(); onOpenDay?.(d); }} />
        : <MoodChart reviews={history} cadence={cadence} currentStart={start} onOpen={d => { void send(); setAnchor(d); }} />}

      {/* Earlier reviews */}
      {history.length > 0 && (
        <section style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }} aria-label="Earlier reviews">
          <div style={label}>EARLIER {cfg.name.toUpperCase()} REVIEWS</div>
          {history.map(h => (
            <button key={h.periodStart} type="button" onClick={() => { void send(); setAnchor(h.periodStart); }}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 10, textAlign: 'left', background: 'none', border: 'none', borderTop: '1px solid var(--border)', padding: '9px 0', cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14 }}>
              <span style={{ fontWeight: h.periodStart === start ? 700 : 500 }}>{periodTitle(cadence, h.periodStart, h.periodEnd)}</span>
              <span style={{ color: 'var(--text-3)' }}>{h.rating > 0 ? RATINGS[h.rating - 1] : 'No rating'}</span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, color: 'var(--text)', cursor: 'pointer', display: 'inline-flex' };

function Stat({ value, text }: { value: string; text: string }) {
  return (
    <div style={{ background: 'var(--bg3, rgba(255,255,255,0.04))', borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 20, color: GREEN, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{text}</div>
    </div>
  );
}

function Question({ id, text, value, max, rows = 3, placeholder, disabled, onChange }: {
  id: string; text: string; value: string; max: number; rows?: number; placeholder?: string; disabled?: boolean; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} style={{ fontSize: 14, color: 'var(--text)', display: 'block', marginBottom: 6 }}>{text}</label>
      <textarea id={id} value={value} rows={rows} maxLength={max} disabled={disabled} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={{ ...field, resize: 'vertical' }} />
    </div>
  );
}

/** Add up the period from real data: routine days from My Routines, and practice interviews by date. */
async function computeLookBack(start: string, end: string): Promise<LookBack> {
  const months = new Set<string>();
  const [ys, ms] = parts(start); const [ye, me] = parts(end);
  let y = ys; let m = ms;
  while (y < ye || (y === ye && m <= me)) {
    months.add(`${y}-${String(m).padStart(2, '0')}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  const days: DaySummary[] = [];
  await Promise.all([...months].map(async m => {
    try { days.push(...(await routinesApi.month(m))); } catch { /* a month that cannot load adds nothing */ }
  }));
  const inRange = days.filter(d => d.date >= start && d.date <= end && d.total > 0);
  const interviews = (await planningApi.interviewDates()).filter(d => d >= start && d <= end).length;
  return {
    essentialsDone: inRange.reduce((n, d) => n + d.essentialsDone, 0),
    essentialsTotal: inRange.reduce((n, d) => n + d.essentialsTotal, 0),
    daysOpened: inRange.length,
    daysAllEssentials: inRange.filter(d => d.essentialsTotal > 0 && d.essentialsDone >= d.essentialsTotal).length,
    practiceInterviews: interviews,
  };
}
