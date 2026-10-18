import { useState } from 'react';
import RoutinesPage from './RoutinesPage';
import ReviewsTab from './ReviewsTab';
import GoalsTab from './GoalsTab';

// Routines & Systems (Francis, 2026-10-18): the My Routines page plus the regular reviews (the "systems") and a short list of goals.
// Routines is what you do each day; Systems is the look back at each rhythm; Goals is where it is all heading.

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
  function choose(t: Tab) {
    setTab(t);
    try { localStorage.setItem(TAB_KEY, t); } catch { /* the tab just will not be remembered */ }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div role="tablist" aria-label="Routines and systems" style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => choose(t.id)}
            style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? GREEN : 'transparent'}`, padding: '10px 16px', cursor: 'pointer', color: tab === t.id ? GREEN : 'var(--text-3)', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', marginBottom: -1 }}>
            {t.name}
          </button>
        ))}
      </div>
      {tab === 'routines' && <RoutinesPage />}
      {tab === 'systems' && <ReviewsTab />}
      {tab === 'goals' && <GoalsTab />}
    </div>
  );
}
