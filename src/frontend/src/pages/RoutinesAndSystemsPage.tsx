import { useState } from 'react';
import RoutinesPage from './RoutinesPage';
import ReviewsTab from './ReviewsTab';
import GoalsTab from './GoalsTab';
import { MIN_SEARCH, NotesSearch } from '../components/NotesSearch';
import type { Cadence, SearchResult } from '../api/planningApi';

// Routines & Systems (Francis, 2026-10-18): the My Routines page plus the regular reviews (the "systems") and a short list of goals.
// Routines is what you do each day; Systems is the look back at each rhythm; Goals is where it is all heading. A search box above them finds your own words in all three.

type Tab = 'routines' | 'systems' | 'goals';
const GREEN = '#34D399';
const TAB_KEY = 'tic_routines_tab';
const TABS: { id: Tab; name: string }[] = [
  { id: 'routines', name: 'Routines' },
  { id: 'systems', name: 'Systems' },
  { id: 'goals', name: 'Goals' },
];

function remembered(): Tab {
  try { const v = localStorage.getItem(TAB_KEY); if (v === 'routines' || v === 'systems' || v === 'goals') return v; } catch { /* storage can be blocked */ }
  return 'routines';
}

export default function RoutinesAndSystemsPage() {
  const [tab, setTab] = useState<Tab>(remembered);
  const [query, setQuery] = useState('');
  // Opening a search result: where to land, and a counter so the page starts afresh at that day or period.
  const [jump, setJump] = useState<{ n: number; date?: string; cadence?: Cadence }>({ n: 0 });
  const searching = query.trim().length >= MIN_SEARCH;

  function choose(t: Tab) {
    setTab(t);
    try { localStorage.setItem(TAB_KEY, t); } catch { /* the tab just will not be remembered */ }
  }
  function open(r: SearchResult) {
    setQuery('');
    if (r.kind === 'review') { setTab('systems'); setJump(j => ({ n: j.n + 1, date: r.date, cadence: r.cadence as Cadence })); }
    else if (r.kind === 'goal') { setTab('goals'); setJump(j => ({ n: j.n + 1 })); }
    else { setTab('routines'); setJump(j => ({ n: j.n + 1, date: r.date })); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <NotesSearch query={query} onQueryChange={setQuery} onOpen={open} />
      {!searching && (
        <>
          <div role="tablist" aria-label="Routines and systems" style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)' }}>
            {TABS.map(t => (
              <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => choose(t.id)}
                style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? GREEN : 'transparent'}`, padding: '10px 16px', cursor: 'pointer', color: tab === t.id ? GREEN : 'var(--text-3)', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', marginBottom: -1 }}>
                {t.name}
              </button>
            ))}
          </div>
          {tab === 'routines' && <RoutinesPage key={`r${jump.n}`} initialDate={jump.cadence ? undefined : jump.date} />}
          {tab === 'systems' && <ReviewsTab key={`s${jump.n}`} initialCadence={jump.cadence} initialDate={jump.cadence ? jump.date : undefined} onOpenDay={d => { setTab('routines'); setJump(j => ({ n: j.n + 1, date: d })); }} />}
          {tab === 'goals' && <GoalsTab />}
        </>
      )}
    </div>
  );
}
