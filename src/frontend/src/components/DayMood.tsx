import { useEffect, useRef, useState } from 'react';
import { planningApi } from '../api/planningApi';
import { MOOD_COLOURS, MOOD_LABELS } from '../utils/mood';

// "How are you today?" (Francis, 2026-10-18): one tap per day, Rough to Great, the same scale and colours as a review's rating. It feeds the Systems tab's mood chart.
// Tap the chosen mood again to clear it. Render with key={date}, so each day starts fresh.

export function DayMood({ date }: { date: string }) {
  const [rating, setRating] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const seq = useRef(0);

  useEffect(() => {
    let alive = true;
    planningApi.moods(date, date)
      .then(list => { if (alive && Array.isArray(list)) setRating(list.find(m => m.date === date)?.rating ?? 0); })
      .catch(() => { /* an unreadable mood simply shows as not chosen */ })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [date]);

  async function choose(value: number) {
    const next = rating === value ? 0 : value;
    const mine = ++seq.current;
    setRating(next); setState('saving'); setError('');
    try {
      await planningApi.setMood(date, next);
      if (seq.current === mine) setState('saved');
    } catch (e) {
      if (seq.current === mine) { setState('idle'); setError((e as Error).message || 'That did not save. Try again.'); }
    }
  }

  return (
    <div role="group" aria-label="How are you today?" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em' }}>HOW ARE YOU TODAY?</span>
        <span aria-live="polite" style={{ fontSize: 12, minHeight: 16, color: '#34D399' }}>{state === 'saving' ? <span style={{ color: 'var(--text-3)' }}>Saving…</span> : state === 'saved' ? 'Saved' : ''}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {MOOD_LABELS.map((label, i) => {
          const on = rating === i + 1;
          const colour = MOOD_COLOURS[i];
          return (
            <button key={label} type="button" aria-pressed={on} disabled={!loaded} onClick={() => void choose(i + 1)}
              style={{
                padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: on ? 800 : 600,
                border: `1px solid ${on ? colour : 'var(--border)'}`, background: on ? `${colour}2E` : 'transparent', color: on ? colour : 'var(--text-2, var(--text))',
              }}>{label}</button>
          );
        })}
      </div>
      {error && <div role="alert" style={{ color: '#EF4444', fontSize: 13 }}>{error}</div>}
    </div>
  );
}
