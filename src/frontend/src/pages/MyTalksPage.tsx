import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronUp, ChevronDown, Trash2, Globe, Lock } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { WatchAndLearnRow } from '../components/WatchAndLearnRow';

interface TalkSummary {
  id: string;
  createdAt: string;
  subject: string | null;
  overallScore: number;
  isShared: boolean;
  hasVideo: boolean;
}

const FILTER_OPTS = ['All', 'Public', 'Private'] as const;
type FilterOpt = (typeof FILTER_OPTS)[number];
type SortKey = 'createdAt' | 'subject' | 'overallScore';
const PAGE_SIZE = 7;

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

// Copied then trimmed from MyInterviewsPage.tsx — same list/filter/sort/bulk-visibility
// pattern, one fewer column (Talks has a Subject, not a Role+Company pair).
export default function MyTalksPage() {
  const navigate = useNavigate();
  const authToken = useAuthStore(s => s.token);
  const candidateId = useAuthStore(s => s.user?.id);

  const [items, setItems] = useState<TalkSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterOpt>('All');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false);
  const [bulkConfirmTarget, setBulkConfirmTarget] = useState<boolean | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const apiBase = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';

  useEffect(() => {
    if (!authToken) return;
    fetch(`${apiBase}/api/talks`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((data: TalkSummary[]) => setItems(data))
      .catch(() => setError(true));
  }, [authToken, apiBase]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  }

  function handleDiscard(id: string) {
    setItems(prev => prev?.filter(i => i.id !== id) ?? null);
    if (candidateId) {
      fetch(`${apiBase}/api/talks/${encodeURIComponent(candidateId)}/${encodeURIComponent(id)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${authToken ?? ''}` },
      }).catch(() => { /* best-effort */ });
    }
  }

  async function toggleVisibility(item: TalkSummary) {
    if (!candidateId) return;
    const nextPublic = !item.isShared;
    setToggleError(null);
    setTogglingIds(prev => new Set(prev).add(item.id));
    setItems(prev => prev?.map(i => (i.id === item.id ? { ...i, isShared: nextPublic } : i)) ?? null);
    try {
      const res = await fetch(
        `${apiBase}/api/talks/${encodeURIComponent(candidateId)}/${encodeURIComponent(item.id)}/${nextPublic ? 'share' : 'unshare'}`,
        { method: 'POST', headers: { Authorization: `Bearer ${authToken ?? ''}` } },
      );
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setItems(prev => prev?.map(i => (i.id === item.id ? { ...i, isShared: !nextPublic } : i)) ?? null);
      setToggleError(`Couldn't update "${item.subject ?? 'that talk'}" — try again.`);
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  }

  async function applyBulkVisibility(isPublic: boolean) {
    if (!authToken) return;
    setBulkBusy(true);
    setToggleError(null);
    try {
      const res = await fetch(`${apiBase}/api/talks/visibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ isPublic }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setItems(prev => prev?.map(i => ({ ...i, isShared: isPublic })) ?? null);
      setBulkConfirmTarget(null);
    } catch {
      setToggleError("Couldn't update all your talks — try again.");
    } finally {
      setBulkBusy(false);
    }
  }

  const filtered = (items ?? [])
    .filter(i => filter === 'All' || (filter === 'Public' ? i.isShared : !i.isShared))
    .filter(i => (i.subject ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = sortKey === 'overallScore' ? a.overallScore : (a[sortKey] ?? '');
      const bv = sortKey === 'overallScore' ? b.overallScore : (b[sortKey] ?? '');
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const sharedCount = (items ?? []).filter(i => i.isShared).length;

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ opacity: 0.25, marginLeft: 4 }}>↕</span>;
    return sortDir === 'asc'
      ? <ChevronUp size={11} style={{ marginLeft: 3, verticalAlign: 'middle' }} />
      : <ChevronDown size={11} style={{ marginLeft: 3, verticalAlign: 'middle' }} />;
  }

  const sortableTh = (label: string, key: SortKey) => (
    <th key={key} style={{ ...thStyle, cursor: 'pointer' }} onClick={() => toggleSort(key)}>
      {label}<SortIcon k={key} />
    </th>
  );

  return (
    <div style={{ padding: '0 0 40px' }}>
      <WatchAndLearnRow />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>My Talks</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {(items ?? []).length} saved · {sharedCount} public
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {items && items.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setVisibilityMenuOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Talk Visibility <ChevronDown size={13} />
              </button>
              {visibilityMenuOpen && (
                <>
                  <div onClick={() => setVisibilityMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 21, minWidth: 240, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                    <button onClick={() => { setBulkConfirmTarget(true); setVisibilityMenuOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <Globe size={15} color="#34D399" /> Make all talks Public
                    </button>
                    <button onClick={() => { setBulkConfirmTarget(false); setVisibilityMenuOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <Lock size={15} color="var(--text-3)" /> Make all talks Private
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => navigate('/talk-pack/start')}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #34D399, #4F8EF7)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🎤 New Talk
          </button>
        </div>
      </div>

      {items === null && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 14, color: 'var(--text-3)' }}>
          <span style={{ fontSize: 26, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
          <div style={{ fontSize: 13 }}>Loading your talks…</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          Couldn't load your talks right now — try refreshing.
        </div>
      )}

      {items?.length === 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 32 }}>🎤</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No saved talks yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380 }}>
            Give a practice talk on any subject — Amina and Wayne will be right there with you — and choose "Save this talk" to see it here.
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <>
          {toggleError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              {toggleError}
              <button onClick={() => setToggleError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', display: 'flex', padding: 0 }}><X size={13} /></button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search subject…"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 36px 9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {FILTER_OPTS.map(f => (
                <button key={f} onClick={() => { setFilter(f); setPage(1); }} style={{
                  padding: '8px 14px', borderRadius: 20, border: '1px solid', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  background: filter === f ? 'rgba(79,142,247,0.15)' : 'transparent',
                  borderColor: filter === f ? 'rgba(79,142,247,0.5)' : 'var(--border)',
                  color: filter === f ? '#4F8EF7' : 'var(--text-3)',
                }}>{f}</button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {sortableTh('Date', 'createdAt')}
                    {sortableTh('Subject', 'subject')}
                    {sortableTh('Score', 'overallScore')}
                    <th style={thStyle}>Visibility</th>
                    <th style={thStyle} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item, i) => {
                    const pct = Math.round(item.overallScore);
                    const color = scoreColor(pct);
                    const isToggling = togglingIds.has(item.id);
                    return (
                      <tr key={item.id}
                        onClick={() => navigate(`/talk-summary/${item.id}`)}
                        style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
                      >
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(item.createdAt)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>🎤 {item.subject ?? 'Practice Talk'}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '4px 10px', borderRadius: 20 }}>
                            {pct} · {scoreLabel(pct)}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <button
                            onClick={e => { e.stopPropagation(); toggleVisibility(item); }}
                            disabled={isToggling}
                            title={item.isShared ? 'Public — click to make private.' : 'Private — click to make public.'}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: isToggling ? 'default' : 'pointer', padding: 0, opacity: isToggling ? 0.5 : 1, fontFamily: 'inherit' }}
                          >
                            <span style={{ width: 34, height: 18, borderRadius: 20, background: item.isShared ? '#34D399' : 'rgba(255,255,255,0.14)', position: 'relative', flexShrink: 0 }}>
                              <span style={{ position: 'absolute', top: 2, left: item.isShared ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: item.isShared ? '#34D399' : 'var(--text-3)' }}>
                              {item.isShared ? <Globe size={12} /> : <Lock size={12} />}
                              {item.isShared ? 'Public' : 'Private'}
                            </span>
                          </button>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button onClick={e => { e.stopPropagation(); navigate(`/talk-summary/${item.id}`); }} style={{ fontSize: 11, color: '#4F8EF7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>View →</button>
                            <button title="Discard" onClick={e => { e.stopPropagation(); handleDiscard(item.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2, opacity: 0.6 }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visible.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No talks match your filter.</div>}

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: page === 1 ? 'var(--text-3)' : 'var(--text-2)', cursor: page === 1 ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', background: n === page ? 'rgba(79,142,247,0.15)' : 'transparent', borderColor: n === page ? 'rgba(79,142,247,0.5)' : 'var(--border)', color: n === page ? '#4F8EF7' : 'var(--text-3)' }}>{n}</button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: page === totalPages ? 'var(--text-3)' : 'var(--text-2)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {bulkConfirmTarget !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => !bulkBusy && setBulkConfirmTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {bulkConfirmTarget ? <Globe size={20} color="#34D399" /> : <Lock size={20} color="var(--text-3)" />}
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Make all talks {bulkConfirmTarget ? 'Public' : 'Private'}?</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
              {bulkConfirmTarget
                ? `This makes all ${(items ?? []).length} of your talks visible via their share links/QR codes.`
                : `This immediately disables the share links/QR codes for all ${(items ?? []).length} of your talks. Nothing is deleted.`}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setBulkConfirmTarget(null)} disabled={bulkBusy} style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: bulkBusy ? 'default' : 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => applyBulkVisibility(bulkConfirmTarget)} disabled={bulkBusy} style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: bulkBusy ? 'default' : 'pointer', fontFamily: 'inherit', background: bulkConfirmTarget ? 'linear-gradient(135deg, #34D399, #059669)' : 'linear-gradient(135deg, #64748b, #475569)', opacity: bulkBusy ? 0.7 : 1 }}>
                {bulkBusy ? 'Updating…' : `Yes, make all ${bulkConfirmTarget ? 'Public' : 'Private'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
