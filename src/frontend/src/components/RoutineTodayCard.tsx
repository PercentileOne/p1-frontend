import { useEffect, useState } from 'react';
import { Sun } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { localDate } from '../api/routinesApi';

// The Dashboard's "today" card for My Routines (Francis, 2026-10-13). It only asks for a summary, so it never creates a day for someone who has not opened My Routines.
// The first time it is shown each day it carries "ready for you" wording; after that it quietly shows progress.
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';
const GREEN = '#34D399';

interface Summary { essentialsDone: number; essentialsTotal: number; done: number; total: number }

export function RoutineTodayCard({ onOpen }: { onOpen: () => void }) {
  const token = useAuthStore(s => s.token);
  const [s, setS] = useState<Summary | null>(null);
  const [started, setStarted] = useState(false);
  const date = localDate();
  const seenKey = `tic_routine_seen_${date}`;
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem(seenKey) === '1'; } catch { return true; } });

  useEffect(() => {
    if (!token) return;
    let alive = true;
    const ctl = new AbortController();
    const timer = window.setTimeout(() => ctl.abort(), 12000);
    fetch(`${API_BASE}/api/routines/day/${date}/summary`, { headers: { Authorization: `Bearer ${token}` }, signal: ctl.signal })
      .then(r => (r.ok ? r.json() : null))
      .then((b: { exists: boolean; summary: Summary } | null) => { if (alive && b) { setS(b.summary); setStarted(b.exists); } })
      .catch(() => { /* a card that cannot load simply stays away */ })
      .finally(() => window.clearTimeout(timer));
    return () => { alive = false; ctl.abort(); };
  }, [token, date]);

  if (!s || s.total === 0) return null;

  const useEss = s.essentialsTotal > 0;
  const done = useEss ? s.essentialsDone : s.done;
  const total = useEss ? s.essentialsTotal : s.total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const open = () => { try { localStorage.setItem(seenKey, '1'); } catch { /* fine */ } setSeen(true); onOpen(); };
  const fresh = !seen && !started;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20, padding: '16px 20px', borderRadius: 16,
      border: `1px solid ${fresh ? 'rgba(52,211,153,0.6)' : 'var(--border)'}`, background: fresh ? 'rgba(52,211,153,0.07)' : 'var(--bg2)',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(52,211,153,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN, flexShrink: 0 }}><Sun size={20} /></div>
      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{fresh ? 'Your routine for today is ready' : 'Today’s routine'}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
          {done} of {total} {useEss ? 'essentials' : 'items'} done{fresh ? '. Win the first 40 minutes.' : ''}
        </div>
        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', marginTop: 8, maxWidth: 320, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: GREEN }} />
        </div>
      </div>
      <button onClick={open} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#34D399,#059669)', color: '#fff', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
        {started ? 'Open my routine' : 'Start'}
      </button>
    </div>
  );
}
