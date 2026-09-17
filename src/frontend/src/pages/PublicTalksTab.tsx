import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Star, User } from 'lucide-react';
import { fetchPublicTalks, fetchPinnedPublicTalks, pinPublicTalk, unpinPublicTalk, type PublicTalkSummary } from '../api/talksApi';
import { ProductivityVideosRow } from '../components/ProductivityVideosRow';

type SortOrder = 'newest' | 'topScore';
const SORT_TABS: { label: string; order: SortOrder }[] = [
  { label: 'Newest', order: 'newest' },
  { label: 'Top Score', order: 'topScore' },
];

function scoreColor(pct: number) {
  if (pct >= 70) return '#34D399';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

function scoreLabel(pct: number) {
  if (pct >= 80) return 'Excellent';
  if (pct >= 70) return 'Strong';
  if (pct >= 50) return 'Good';
  return 'Developing';
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left',
  whiteSpace: 'nowrap', userSelect: 'none',
};

// Copied-then-trimmed from MyTalksPage.tsx's own table — same visual language, but browsing
// every candidate's Public talks instead of just the signed-in candidate's own: no Visibility
// column (nothing here is private), no Discard action (not the owner), and a "By {firstName}"
// column instead. "View" reuses /shared-talk/:token unchanged — the same destination the My
// Talks tab's own share button already produces, so viewing a public talk has zero new exposure
// beyond what marking it Public already granted.
export default function PublicTalksTab() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PublicTalkSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<SortOrder>('newest');
  // Pinned Public Talks — "do you think people will want to Pin/Save Public Talks to their own
  // library" (Francis, 2026-09-17). Kept as a Set of talk ids for O(1) lookups per row; the
  // "Pinned" filter reuses this same page/table rather than a separate list, matching the
  // Sort/Search chrome already here.
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [pinBusy, setPinBusy] = useState<Set<string>>(new Set());

  const load = useCallback((q: string) => {
    fetchPublicTalks(q).then(setItems).catch(() => setError(true));
  }, []);

  useEffect(() => { load(''); }, [load]);
  useEffect(() => { fetchPinnedPublicTalks().then(talks => setPinnedIds(new Set(talks.map(t => t.id)))); }, []);

  async function togglePin(item: PublicTalkSummary) {
    const isPinned = pinnedIds.has(item.id);
    setPinBusy(prev => new Set(prev).add(item.id));
    setPinnedIds(prev => {
      const next = new Set(prev);
      isPinned ? next.delete(item.id) : next.add(item.id);
      return next;
    });
    try {
      if (isPinned) await unpinPublicTalk(item.id);
      else await pinPublicTalk(item.id, item.candidateId);
    } finally {
      setPinBusy(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  }

  const sorted = [...(items ?? [])]
    .filter(item => !showPinnedOnly || pinnedIds.has(item.id))
    .sort((a, b) =>
      order === 'topScore' ? b.overallScore - a.overallScore : (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div>
      <ProductivityVideosRow />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') load(search); }}
            placeholder="Search subject…"
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 36px 9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
          {search && (
            <button onClick={() => { setSearch(''); load(''); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
              <X size={14} />
            </button>
          )}
        </div>
        <button onClick={() => load(search)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8,
          background: 'linear-gradient(135deg, #34D399, #4F8EF7)', color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <Search size={14} /> Search
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {SORT_TABS.map(tab => (
            <button key={tab.order} onClick={() => setOrder(tab.order)} style={{
              padding: '8px 14px', borderRadius: 20, border: '1px solid',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              background: order === tab.order ? 'rgba(79,142,247,0.15)' : 'transparent',
              borderColor: order === tab.order ? 'rgba(79,142,247,0.5)' : 'var(--border)',
              color: order === tab.order ? '#4F8EF7' : 'var(--text-3)',
            }}>{tab.label}</button>
          ))}
          <button onClick={() => setShowPinnedOnly(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 20, border: '1px solid',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            background: showPinnedOnly ? 'rgba(245,158,11,0.15)' : 'transparent',
            borderColor: showPinnedOnly ? 'rgba(245,158,11,0.5)' : 'var(--border)',
            color: showPinnedOnly ? '#F59E0B' : 'var(--text-3)',
          }}>
            <Star size={12} fill={showPinnedOnly ? '#F59E0B' : 'none'} /> Pinned
          </button>
        </div>
      </div>

      {items === null && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 14, color: 'var(--text-3)' }}>
          <span style={{ fontSize: 26, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
          <div style={{ fontSize: 13 }}>Loading public talks…</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          Couldn't load public talks right now — try refreshing.
        </div>
      )}

      {items?.length === 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 32 }}>🌍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No public talks yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380 }}>
            Be the first — make one of yours Public from the My Talks tab.
          </div>
        </div>
      )}

      {items && items.length > 0 && sorted.length === 0 && showPinnedOnly && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 32 }}>⭐</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Nothing pinned yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380 }}>
            Click the star on any talk below to save it here for later.
          </div>
        </div>
      )}

      {items && items.length > 0 && sorted.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Subject</th>
                  <th style={thStyle}>By</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, i) => {
                  const pct = Math.round(item.overallScore);
                  const color = scoreColor(pct);
                  const viewHref = item.shareToken ? `/shared-talk/${item.shareToken}` : null;
                  const isPinned = pinnedIds.has(item.id);
                  const isPinBusy = pinBusy.has(item.id);
                  return (
                    <tr key={item.id}
                      onClick={() => viewHref && navigate(viewHref)}
                      style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: viewHref ? 'pointer' : 'default' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
                    >
                      <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(item.createdAt)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>🎤 {item.subject ?? 'Practice Talk'}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12 }}>
                        {/* Links to the talker's own profile — "because you might want to
                            Connect/Friend them" (Francis, 2026-09-17). Same /profile/:userId
                            route ProfilePage.tsx already serves for viewing another candidate. */}
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/profile/${item.candidateId}`); }}
                          title={`View ${item.authorFullName}'s profile`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 12, color: 'var(--text-2)' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#4F8EF7')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
                        >
                          <User size={12} /> {item.authorFullName}
                        </button>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '4px 10px', borderRadius: 20 }}>
                          {pct} · {scoreLabel(pct)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                          <button
                            onClick={e => { e.stopPropagation(); togglePin(item); }}
                            disabled={isPinBusy}
                            title={isPinned ? 'Remove from your pinned talks' : 'Pin to your library'}
                            style={{ background: 'none', border: 'none', cursor: isPinBusy ? 'default' : 'pointer', padding: 0, display: 'flex', opacity: isPinBusy ? 0.5 : 1 }}
                          >
                            <Star size={14} color={isPinned ? '#F59E0B' : 'var(--text-3)'} fill={isPinned ? '#F59E0B' : 'none'} />
                          </button>
                          {viewHref && (
                            <button onClick={e => { e.stopPropagation(); navigate(viewHref); }} style={{ fontSize: 11, color: '#4F8EF7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>View →</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
