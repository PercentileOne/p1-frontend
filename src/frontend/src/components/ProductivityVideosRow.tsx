import { useState, useEffect, useCallback } from 'react';
import { Search, Star, X } from 'lucide-react';
import {
  searchProductivityVideos, getPinnedProductivityVideos, pinProductivityVideo, unpinProductivityVideo,
} from '../api/productivityVideosApi';
import type { TedTalk, TedTalkOrder } from '../api/tedTalksApi';

const SORT_TABS: { label: string; order: TedTalkOrder }[] = [
  { label: 'Best Match', order: 'relevance' },
  { label: 'Popular', order: 'viewCount' },
  { label: 'Latest', order: 'date' },
];

const SORT_STORAGE_KEY = 'ticProductivityRowSort';

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

function VideoCard({ v, pinned, busy, onTogglePin }: { v: TedTalk; pinned: boolean; busy: boolean; onTogglePin: () => void }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0a0a12' }}>
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
        onClick={onTogglePin}
        disabled={busy}
        title={pinned ? 'Unpin from your list' : 'Pin to your list'}
        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', opacity: busy ? 0.5 : 1 }}
      >
        <Star size={13} fill={pinned ? '#F59E0B' : 'none'} color={pinned ? '#F59E0B' : 'var(--text-3)'} />
        <span style={{ fontSize: 11, fontWeight: 700, color: pinned ? '#F59E0B' : 'var(--text-3)' }}>
          {pinned ? 'Pinned' : 'Pin'}
        </span>
      </button>
    </div>
  );
}

// Copied-then-trimmed from WatchAndLearnRow.tsx (the TED talks row on My Talks) — same
// search/sort/pin UX, pointed at general "success and productivity" videos instead of TED's own
// channel (Francis, 2026-09-13, for the Public Talks tab). Keeps its own pinned list — see
// productivityVideosApi.ts's own comment on why it doesn't share TED's.
export function ProductivityVideosRow() {
  const [pinned, setPinned] = useState<TedTalk[] | null>(null);
  const [pinnedModalOpen, setPinnedModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<TedTalkOrder>(loadStoredOrder);
  const [results, setResults] = useState<TedTalk[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [pinBusy, setPinBusy] = useState<Set<string>>(new Set());

  useEffect(() => { getPinnedProductivityVideos().then(setPinned); }, []);

  const runSearch = useCallback((q: string, ord: TedTalkOrder) => {
    setSearching(true);
    searchProductivityVideos(q, ord).then(r => { setResults(r); setSearching(false); });
  }, []);

  useEffect(() => { runSearch('', order); }, [runSearch, order]);

  const handleOrderChange = (ord: TedTalkOrder) => {
    setOrder(ord);
    try { localStorage.setItem(SORT_STORAGE_KEY, ord); } catch { /* ignore */ }
    runSearch(query, ord);
  };

  const handleSearchSubmit = () => runSearch(query, order);

  const pinnedIds = new Set((pinned ?? []).map(t => t.id));

  const togglePin = async (video: TedTalk) => {
    setPinBusy(prev => new Set(prev).add(video.id));
    try {
      const next = pinnedIds.has(video.id) ? await unpinProductivityVideo(video.id) : await pinProductivityVideo(video);
      setPinned(next);
    } finally {
      setPinBusy(prev => { const n = new Set(prev); n.delete(video.id); return n; });
    }
  };

  const showing = results ?? [];

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)' }}>
          Success & Productivity
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          <button onClick={() => setPinnedModalOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20,
            border: '1px solid rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.12)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#F59E0B',
          }}>
            <Star size={12} fill="#F59E0B" /> My Pinned ({(pinned ?? []).length})
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit(); }}
          placeholder="Search productivity & success videos…"
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

      <div className="productivity-row-scroll" style={{
        display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
      }}>
        <style>{`
          .productivity-row-scroll::-webkit-scrollbar, .productivity-row-grid::-webkit-scrollbar { height: 8px; width: 8px; }
          .productivity-row-scroll::-webkit-scrollbar-track, .productivity-row-grid::-webkit-scrollbar-track { background: var(--bg3); border-radius: 4px; }
          .productivity-row-scroll::-webkit-scrollbar-thumb, .productivity-row-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.22); border-radius: 4px; }
          .productivity-row-scroll::-webkit-scrollbar-thumb:hover, .productivity-row-grid::-webkit-scrollbar-thumb:hover { background: var(--text-3); }
        `}</style>
        {showing.length === 0 && !searching && (
          <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '20px 0' }}>No videos found — try a different search.</div>
        )}
        {searching && <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '20px 0' }}>Searching…</div>}
        {showing.map(v => (
          <div key={v.id} style={{ flex: '0 0 200px' }}>
            <VideoCard v={v} pinned={pinnedIds.has(v.id)} busy={pinBusy.has(v.id)} onTogglePin={() => togglePin(v)} />
          </div>
        ))}
      </div>

      {/* Pinned list modal — fixed-width columns (not 1fr), same fix as WatchAndLearnRow.tsx's
          modal so cards never shrink as more videos get pinned. */}
      {pinnedModalOpen && (
        <div
          onClick={() => setPinnedModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: 24 }}
        >
          {/* Single scroll container — same fix as WatchAndLearnRow.tsx's pinned modal: the
              grid's own maxHeight+overflow, nested inside a flex-column box, silently failed to
              constrain anything. Matches PracticeMCQOverlay.tsx's proven pattern instead: one
              element owns both the height cap and the scroll. The BACKDROP also needs
              alignItems:'flex-start' + its own overflowY:'auto' (not 'center' with no scroll) —
              a centered box taller than the viewport gets clipped on both its top AND bottom with
              no way to reach either edge by scrolling the box's own content (Francis, 2026-09-14:
              close button not reachable, couldn't scroll to the true bottom either). Header is
              sticky so it stays reachable while scrolling. */}
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 920, maxHeight: 850, overflowY: 'auto', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16 }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={16} fill="#F59E0B" color="#F59E0B" /> My Pinned Videos ({(pinned ?? []).length})
              </div>
              <button onClick={() => setPinnedModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            {/* 200px cards — matches the exact width the horizontal "Productivity" scroller above
                already uses for the same VideoCard (`flex: '0 0 200px'`, line ~167); grid and
                scroller must always show cards at the same size. Modal widened 780->920px so
                exactly 4 columns fit (842-1055px of content width gives 4, not 3 or 5). */}
            <div className="productivity-row-grid" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 200px)', justifyContent: 'start', gap: 14 }}>
              {(pinned ?? []).length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-3)', gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0' }}>
                  Nothing pinned yet — search for a video and tap the star to save it here.
                </div>
              ) : (
                (pinned ?? []).map(v => (
                  <VideoCard key={v.id} v={v} pinned={true} busy={pinBusy.has(v.id)} onTogglePin={() => togglePin(v)} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
