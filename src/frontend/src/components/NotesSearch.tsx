import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { planningApi } from '../api/planningApi';
import type { SearchResult } from '../api/planningApi';

// Search your own words (Francis, 2026-10-18): day notes, favourite-day notes, reviews and goals. Every word typed has to appear in the item. Results open at the day, the review or the goal.

const GREEN = '#34D399';
const KIND_LABEL: Record<string, string> = { day: 'Day note', favourite: 'Favourite day', review: 'Review', goal: 'Goal' };

export const MIN_SEARCH = 2;
export function searchTerms(q: string): string[] {
  return Array.from(new Set(q.toLowerCase().split(/\s+/).filter(Boolean))).slice(0, 6);
}

function prettyDate(date: string): string {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function whereText(r: SearchResult): string {
  if (r.kind === 'review') return `${r.cadence.charAt(0).toUpperCase()}${r.cadence.slice(1)} review · ${prettyDate(r.date)}`;
  if (r.kind === 'goal') return KIND_LABEL.goal;
  return `${KIND_LABEL[r.kind]} · ${prettyDate(r.date)}`;
}

/** The text with each searched word picked out. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>;
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'));
  return <>{parts.map((p, i) => (i % 2 === 1 ? <mark key={i} style={{ background: 'rgba(52,211,153,0.28)', color: 'inherit', borderRadius: 3, padding: '0 1px' }}>{p}</mark> : <span key={i}>{p}</span>))}</>;
}

export function NotesSearch({ query, onQueryChange, onOpen }: { query: string; onQueryChange: (q: string) => void; onOpen: (r: SearchResult) => void }) {
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState('');
  const seq = useRef(0);
  const q = query.trim();
  const active = q.length >= MIN_SEARCH;

  useEffect(() => {
    if (!active) { setResults(null); setError(''); return; }
    const mine = ++seq.current;
    setError('');
    const timer = window.setTimeout(() => {
      planningApi.search(q)
        .then(r => { if (seq.current === mine) setResults(Array.isArray(r) ? r : []); })
        .catch(e => { if (seq.current === mine) { setResults([]); setError((e as Error).message || 'Search did not work. Try again.'); } });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [q, active]);

  const terms = searchTerms(q);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-3)' }} />
        <input type="search" aria-label="Search your notes, reviews and goals" value={query} onChange={e => onQueryChange(e.target.value)}
          placeholder="Search your notes, reviews and goals"
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 38px 10px 36px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => onQueryChange('')} style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        )}
      </div>

      {active && (
        <div role="region" aria-label="Search results" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results === null && !error && <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Searching…</div>}
          {error && <div role="alert" style={{ color: '#EF4444', fontSize: 13.5 }}>{error}</div>}
          {results !== null && !error && results.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Nothing found for “{q}”. Try fewer or different words.</div>}
          {results !== null && results.length > 0 && <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{results.length} result{results.length === 1 ? '' : 's'}, newest first</div>}
          {(results ?? []).map(r => (
            <button key={`${r.kind}-${r.date}-${r.id}-${r.field}`} type="button" onClick={() => onOpen(r)}
              style={{ textAlign: 'left', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 12, color: GREEN, fontWeight: 700, letterSpacing: '0.02em' }}>{whereText(r)}{r.kind === 'day' || r.field === 'Goal' || !r.field ? '' : ` · ${r.field}`}</span>
              {r.kind === 'goal' && <span style={{ fontWeight: 800, fontSize: 15 }}><Highlight text={r.title} terms={terms} /></span>}
              <span style={{ fontSize: 14, color: 'var(--text-2, var(--text))', overflowWrap: 'anywhere', lineHeight: 1.5 }}><Highlight text={r.snippet} terms={terms} /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
