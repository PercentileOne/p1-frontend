import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_DAY_NOTE, planningApi } from '../api/planningApi';

// "Notes for this day" (Francis, 2026-10-18): a free-text note on any day in My Routines. Saved by itself a moment after typing stops (no Save button),
// and kept as plain text per day so it can be searched later. Render it with key={date}, so each day gets a fresh box and the last words typed are saved on the way out.

const GREEN = '#34D399';

export function DayNotes({ date }: { date: string }) {
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const textRef = useRef('');
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    planningApi.dayNote(date)
      .then(r => { if (alive) { const t = typeof r?.text === 'string' ? r.text : ''; textRef.current = t; setText(t); } })
      .catch(() => { /* an unreadable note simply shows empty; typing still works */ })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [date]);

  const send = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    if (!dirty.current) return;
    dirty.current = false;
    try {
      await planningApi.saveDayNote(date, textRef.current);
      if (!dirty.current) setState('saved');
    } catch (e) {
      dirty.current = true; setState('idle');
      setError((e as Error).message || 'Your note could not be saved. Check your connection.');
    }
  }, [date]);

  function change(v: string) {
    textRef.current = v; setText(v);
    dirty.current = true; setState('saving'); setError('');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void send(); }, 1000);
  }

  // Closing the tab, or leaving this day, must not lose the last words typed.
  useEffect(() => {
    const onHide = () => { if (dirty.current) { dirty.current = false; planningApi.saveDayNoteOnExit(date, textRef.current); } };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      if (dirty.current) { dirty.current = false; planningApi.saveDayNoteOnExit(date, textRef.current); }
    };
  }, [date]);

  return (
    <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <label htmlFor="dayNotes" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.06em' }}>NOTES FOR THIS DAY</label>
        <span aria-live="polite" style={{ fontSize: 12, color: GREEN, minHeight: 16 }}>{state === 'saving' ? <span style={{ color: 'var(--text-3)' }}>Saving…</span> : state === 'saved' ? 'Saved' : ''}</span>
      </div>
      <textarea id="dayNotes" value={text} rows={4} maxLength={MAX_DAY_NOTE} disabled={!loaded} onChange={e => change(e.target.value)}
        placeholder="Anything you want to remember about this day: what happened, how it felt, who you met."
        style={{
          width: '100%', marginTop: 8, background: 'var(--bg3, rgba(255,255,255,0.04))', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
          color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5,
        }} />
      {error && <div role="alert" style={{ color: '#EF4444', fontSize: 13, marginTop: 6 }}>{error}</div>}
    </div>
  );
}
