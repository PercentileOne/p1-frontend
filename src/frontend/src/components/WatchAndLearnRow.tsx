import { useState, useEffect, useCallback } from 'react';
import { Search, Star } from 'lucide-react';
import { searchTedTalks, getPinnedTalks, pinTalk, unpinTalk, type TedTalk, type TedTalkOrder } from '../api/tedTalksApi';

const SORT_TABS: { label: string; order: TedTalkOrder }[] = [
  { label: 'Best Match', order: 'relevance' },
  { label: 'Popular', order: 'viewCount' },
  { label: 'Latest', order: 'date' },
];

const SORT_STORAGE_KEY = 'ticWatchAndLearnSort';

function loadStoredOrder(): TedTalkOrder {
  try {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (stored === 'relevance' || stored === 'viewCount' || stored === 'date') return stored;
  } catch { /* localStorage unavailable — fall back to default */ }
  return 'relevance';
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K views`;
  return `${n} views`;
}

// Real TED-talk search (YouTube Data API, proxied server-side) plus a personal pinned list
// that survives across sessions/devices. Sort choice is remembered via localStorage — a pure
// per-browser UI preference, not worth a backend round-trip for.
export function WatchAndLearnRow() {
  const [pinned, setPinned] = useState<TedTalk[] | null>(null);
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<TedTalkOrder>(loadStoredOrder);
  const [results, setResults] = useState<TedTalk[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [pinBusy, setPinBusy] = useState<Set<string>>(new Set());

  useEffect(() => { getPinnedTalks().then(setPinned); }, []);

  const runSearch = useCallback((q: string, ord: TedTalkOrder) => {
    setSearching(true);
    searchTedTalks(q, ord).then(r => { setResults(r); setSearching(false); });
  }, []);

  const handleOrderChange = (ord: TedTalkOrder) => {
    setOrder(ord);
    try { localStorage.setItem(SORT_STORAGE_KEY, ord); } catch { /* ignore */ }
    // Re-run whatever's currently shown (a search, or nothing yet) under the new sort.
    if (results !== null || query.trim()) runSearch(query, ord);
  };

  const handleSearchSubmit = () => runSearch(query, order);

  const pinnedIds = new Set((pinned ?? []).map(t => t.id));

  const togglePin = async (talk: TedTalk) => {
    setPinBusy(prev => new Set(prev).add(talk.id));
    try {
      const next = pinnedIds.has(talk.id) ? await unpinTalk(talk.id) : await pinTalk(talk);
      setPinned(next);
    } finally {
      setPinBusy(prev => { const n = new Set(prev); n.delete(talk.id); return n; });
    }
  };

  // Pinned list shows by default; once a search has actually been run, results replace it.
  const showing = results ?? pinned ?? [];
  const isShowingResults = results !== null;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
          Watch & Learn {!isShowingResults && '— Your Pinned Talks'}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {SORT_TABS.map(tab => (
            <button key={tab.order} onClick={() => handleOrderChange(tab.order)} style={{
              padding: '5px 12px', borderRadius: 20, border: '1px solid',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              background: order === tab.order ? 'rgba(52,211,153,0.15)' : 'transparent',
              borderColor: order === tab.order ? 'rgba(52,211,153,0.5)' : 'var(--border)',
              color: order === tab.order ? '#34D399' : 'var(--text-3)',
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit(); }}
          placeholder="Search TED talks…"
          style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}
        />
        <button onClick={handleSearchSubmit} disabled={searching} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8,
          background: 'linear-gradient(135deg, #34D399, #4F8EF7)', color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 700, cursor: searching ? 'default' : 'pointer', fontFamily: 'inherit', opacity: searching ? 0.7 : 1,
        }}>
          <Search size={14} /> {searching ? 'Searching…' : 'Search'}
        </button>
      </div>

      <div className="watch-and-learn-scroll" style={{
        display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
      }}>
        <style>{`
          .watch-and-learn-scroll::-webkit-scrollbar { height: 8px; }
          .watch-and-learn-scroll::-webkit-scrollbar-track { background: var(--bg3); border-radius: 4px; }
          .watch-and-learn-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
          .watch-and-learn-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-3); }
        `}</style>
        {showing.length === 0 && !searching && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '20px 0' }}>
            {isShowingResults ? 'No talks found — try a different search.' : 'Loading your pinned talks…'}
          </div>
        )}
        {showing.map(v => (
          <div key={v.id} style={{ flex: '0 0 200px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{ position: 'relative', width: '100%', height: '110px', background: '#0a0a12' }}>
                <img src={v.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                {v.duration && (
                  <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                    {v.duration}
                  </div>
                )}
              </div>
              <div style={{ padding: '10px 12px 4px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, marginBottom: '4px' }}>{v.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{v.channel}{v.viewCount > 0 ? ` · ${fmtViews(v.viewCount)}` : ''}</div>
              </div>
            </a>
            <button
              onClick={() => togglePin(v)}
              disabled={pinBusy.has(v.id)}
              title={pinnedIds.has(v.id) ? 'Unpin from your list' : 'Pin to your list'}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: pinBusy.has(v.id) ? 'default' : 'pointer', fontFamily: 'inherit', opacity: pinBusy.has(v.id) ? 0.5 : 1 }}
            >
              <Star size={13} fill={pinnedIds.has(v.id) ? '#F59E0B' : 'none'} color={pinnedIds.has(v.id) ? '#F59E0B' : 'var(--text-3)'} />
              <span style={{ fontSize: 11, fontWeight: 700, color: pinnedIds.has(v.id) ? '#F59E0B' : 'var(--text-3)' }}>
                {pinnedIds.has(v.id) ? 'Pinned' : 'Pin'}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
