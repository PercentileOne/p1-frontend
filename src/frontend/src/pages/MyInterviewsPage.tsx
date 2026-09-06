import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronUp, ChevronDown, Trash2, Globe, Lock } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';

interface InterviewSummary {
  id: string;
  createdAt: string;
  role: string | null;
  company: string | null;
  overallScore: number;
  isShared: boolean;
  hasVideo: boolean;
}

const FILTER_OPTS = ['All', 'Public', 'Private'] as const;
type FilterOpt = (typeof FILTER_OPTS)[number];
type SortKey = 'createdAt' | 'role' | 'company' | 'overallScore';
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

export default function MyInterviewsPage() {
  const navigate = useNavigate();
  const authToken = useAuthStore(s => s.token);
  const candidateId = useAuthStore(s => s.user?.id);
  const firstName = useAuthStore(s => s.user?.firstName);

  const [items, setItems] = useState<InterviewSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterOpt>('All');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  // Per-row visibility toggle — optimistic, reverted on failure.
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Bulk "make everything public/private" — the top-level control. Two steps: pick a target
  // visibility from the dropdown, then confirm, since it can affect every interview at once.
  const [visibilityMenuOpen, setVisibilityMenuOpen] = useState(false);
  const [bulkConfirmTarget, setBulkConfirmTarget] = useState<boolean | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const apiBase = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';

  useEffect(() => {
    if (!authToken) return;
    fetch(`${apiBase}/api/interviews`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((data: InterviewSummary[]) => setItems(data))
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
      fetch(`${apiBase}/api/interviews/${encodeURIComponent(candidateId)}/${encodeURIComponent(id)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${authToken ?? ''}` },
      }).catch(() => { /* best-effort */ });
    }
  }

  // This candidate's own switch for whether recruiters/employers can find and watch this
  // specific interview (Candidate Search + its public share link/QR both key off isShared).
  // Reversible any time — unlike the old one-way "Save" flow, going private again immediately
  // pulls it out of search and 404s the existing share link without deleting anything.
  async function toggleVisibility(item: InterviewSummary) {
    if (!candidateId) return;
    const nextPublic = !item.isShared;
    setToggleError(null);
    setTogglingIds(prev => new Set(prev).add(item.id));
    setItems(prev => prev?.map(i => (i.id === item.id ? { ...i, isShared: nextPublic } : i)) ?? null);
    try {
      const res = await fetch(
        `${apiBase}/api/interviews/${encodeURIComponent(candidateId)}/${encodeURIComponent(item.id)}/${nextPublic ? 'share' : 'unshare'}`,
        { method: 'POST', headers: { Authorization: `Bearer ${authToken ?? ''}` } },
      );
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setItems(prev => prev?.map(i => (i.id === item.id ? { ...i, isShared: !nextPublic } : i)) ?? null);
      setToggleError(`Couldn't update "${item.role ?? 'that interview'}" — try again.`);
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  }

  async function applyBulkVisibility(isPublic: boolean) {
    if (!authToken) return;
    setBulkBusy(true);
    setToggleError(null);
    try {
      const res = await fetch(`${apiBase}/api/interviews/visibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ isPublic }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setItems(prev => prev?.map(i => ({ ...i, isShared: isPublic })) ?? null);
      setBulkConfirmTarget(null);
    } catch {
      setToggleError("Couldn't update all your interviews — try again.");
    } finally {
      setBulkBusy(false);
    }
  }

  const filtered = (items ?? [])
    .filter(i => filter === 'All' || (filter === 'Public' ? i.isShared : !i.isShared))
    .filter(i => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (i.role ?? '').toLowerCase().includes(q) || (i.company ?? '').toLowerCase().includes(q);
    })
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>My Interviews</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {(items ?? []).length} saved · {sharedCount} public
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {items && items.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setVisibilityMenuOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
                  color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                Interview Visibility <ChevronDown size={13} />
              </button>
              {visibilityMenuOpen && (
                <>
                  <div onClick={() => setVisibilityMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 21, minWidth: 240,
                    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => { setBulkConfirmTarget(true); setVisibilityMenuOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <Globe size={15} color="#34D399" /> Make all interviews Public
                    </button>
                    <button
                      onClick={() => { setBulkConfirmTarget(false); setVisibilityMenuOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <Lock size={15} color="var(--text-3)" /> Make all interviews Private
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => navigate('/interview-pack/start', { state: { preferredName: firstName } })}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #34D399, #4F8EF7)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🎙️ Practice Interview
          </button>
        </div>
      </div>

      {items === null && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 14, color: 'var(--text-3)' }}>
          <span style={{ fontSize: 26, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
          <div style={{ fontSize: 13 }}>Loading your interviews…</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          Couldn't load your interviews right now — try refreshing.
        </div>
      )}

      {items?.length === 0 && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
          padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
        }}>
          <div style={{ fontSize: 32 }}>🎙️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No saved interviews yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380 }}>
            Finish a practice interview and choose "Save this interview" to see it here — replay, share link, and QR code included.
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
                placeholder="Search role or company…"
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
                  color: filter === f ? '#4F8EF7' : 'var(--text-3)', transition: 'all 0.15s',
                }}>{f}</button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {sortableTh('Date', 'createdAt')}
                    {sortableTh('Role', 'role')}
                    {sortableTh('Company', 'company')}
                    {sortableTh('Score', 'overallScore')}
                    <th style={thStyle}>Recording</th>
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
                        onClick={() => navigate(`/interview-summary/${item.id}`)}
                        style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
                      >
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(item.createdAt)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.role ?? 'Practice Interview'}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{item.company ?? '—'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '4px 10px', borderRadius: 20 }}>
                            {pct} · {scoreLabel(pct)}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {item.hasVideo
                            ? <span style={{ fontSize: 11, fontWeight: 600, color: '#4F8EF7', background: 'rgba(79,142,247,0.1)', padding: '3px 8px', borderRadius: 20 }}>🎬 Video</span>
                            : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {/* A real, reversible toggle — not a one-way "Shared" label. Clicking it
                              flips isShared via /share or /unshare immediately, which is exactly
                              what controls whether this interview shows up in recruiter/employer
                              Candidate Search and whether its share link/QR still resolves. */}
                          <button
                            onClick={e => { e.stopPropagation(); toggleVisibility(item); }}
                            disabled={isToggling}
                            title={item.isShared ? 'Public — visible in Candidate Search and via its share link. Click to make private.' : 'Private — hidden from Candidate Search, share link disabled. Click to make public.'}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: isToggling ? 'default' : 'pointer', padding: 0, opacity: isToggling ? 0.5 : 1, fontFamily: 'inherit' }}
                          >
                            <span style={{ width: 34, height: 18, borderRadius: 20, background: item.isShared ? '#34D399' : 'rgba(255,255,255,0.14)', position: 'relative', flexShrink: 0, transition: 'background 0.15s' }}>
                              <span style={{ position: 'absolute', top: 2, left: item.isShared ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.15s' }} />
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: item.isShared ? '#34D399' : 'var(--text-3)' }}>
                              {item.isShared ? <Globe size={12} /> : <Lock size={12} />}
                              {item.isShared ? 'Public' : 'Private'}
                            </span>
                          </button>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button onClick={e => { e.stopPropagation(); navigate(`/interview-summary/${item.id}`); }} style={{ fontSize: 11, color: '#4F8EF7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>View →</button>
                            <button
                              title="Discard"
                              onClick={e => { e.stopPropagation(); handleDiscard(item.id); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2, opacity: 0.6 }}
                            >
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
            {visible.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No interviews match your filter.</div>}

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: page === 1 ? 'var(--text-3)' : 'var(--text-2)', cursor: page === 1 ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: page === 1 ? 0.4 : 1 }}
                  >← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)} style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                      background: n === page ? 'rgba(79,142,247,0.15)' : 'transparent',
                      borderColor: n === page ? 'rgba(79,142,247,0.5)' : 'var(--border)',
                      color: n === page ? '#4F8EF7' : 'var(--text-3)',
                    }}>{n}</button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: page === totalPages ? 'var(--text-3)' : 'var(--text-2)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: page === totalPages ? 0.4 : 1 }}
                  >Next →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Bulk visibility confirmation — deliberately a second step, since "make everything
          public" can affect every interview at once. */}
      {bulkConfirmTarget !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => !bulkBusy && setBulkConfirmTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {bulkConfirmTarget ? <Globe size={20} color="#34D399" /> : <Lock size={20} color="var(--text-3)" />}
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                Make all interviews {bulkConfirmTarget ? 'Public' : 'Private'}?
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
              {bulkConfirmTarget
                ? `This makes all ${(items ?? []).length} of your interviews visible in Candidate Search and reactivates any share links/QR codes you've generated for them.`
                : `This immediately hides all ${(items ?? []).length} of your interviews from Candidate Search and disables their share links/QR codes. Nothing is deleted — you can make them public again any time.`}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setBulkConfirmTarget(null)} disabled={bulkBusy} style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 13, fontWeight: 700, cursor: bulkBusy ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={() => applyBulkVisibility(bulkConfirmTarget)} disabled={bulkBusy} style={{
                flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none', color: '#fff', fontSize: 13, fontWeight: 800, cursor: bulkBusy ? 'default' : 'pointer', fontFamily: 'inherit',
                background: bulkConfirmTarget ? 'linear-gradient(135deg, #34D399, #059669)' : 'linear-gradient(135deg, #64748b, #475569)',
                opacity: bulkBusy ? 0.7 : 1,
              }}>
                {bulkBusy ? 'Updating…' : `Yes, make all ${bulkConfirmTarget ? 'Public' : 'Private'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
