import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronUp, ChevronDown, PartyPopper } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { Pagination } from '../components/Pagination';

// Candidate-side half of the Interview Gift loop — same "no claim/link step" shape as
// ReceivedPreps.tsx (GET /api/interview-preps/received): backend endpoint
// (GET /api/session-passes/received) matches purely on the logged-in user's own JWT email
// claim against every paid SessionPass — see Explain.Api.Features.SessionPasses. A gift pass
// isn't tied to a specific job/CV the way an interview prep is (it's a pool of practice
// sessions, purchased via src/viewme/public/gift-interview.html, not scoped to any one role),
// so unlike ReceivedPreps' "Review & Start" this just sends the candidate to a blank intake
// screen to set up their own interview.
interface ReceivedGift {
  id:                string;
  recipientName:     string;
  source:            string; // "gift" | "self"
  senderName:        string | null;
  sessionsTotal:      number;
  sessionsUsed:        number;
  sessionsRemaining: number;
  expiresAt:         string | null;
}

const FILTER_OPTS = ['All', 'Expiring soon'] as const;
type FilterOpt = (typeof FILTER_OPTS)[number];
type SortKey = 'expiresAt' | 'senderName' | 'sessionsRemaining';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';
const EXPIRING_SOON_MS = 2 * 24 * 60 * 60 * 1000; // 2 days — matches the shortest tier (gift-3day)

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left',
  whiteSpace: 'nowrap', userSelect: 'none',
};

export default function ReceivedGifts() {
  const navigate = useNavigate();
  const token = useAuthStore(s => s.token);

  const [gifts,   setGifts]   = useState<ReceivedGift[] | null>(null);
  const [error,   setError]   = useState(false);
  const [filter,  setFilter]  = useState<FilterOpt>('All');
  const [search,  setSearch]  = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('expiresAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page,    setPage]    = useState(1);
  const [pageSize, setPageSize] = useState(7);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/session-passes/received`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((data: ReceivedGift[]) => setGifts(data))
      .catch(() => setError(true));
  }, [token]);

  // No pre-filled job/CV context to hand over (unlike ReceivedPreps' reviewAndStart) — a gift
  // pass is just a pool of sessions, not scoped to a specific role. Sends the candidate to the
  // same blank intake screen every self-directed interview starts from.
  function startInterview() {
    navigate('/interview-pack/start');
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  const now = Date.now();
  const filtered = (gifts ?? [])
    .filter(g => filter === 'All' || (g.expiresAt && new Date(g.expiresAt).getTime() - now <= EXPIRING_SOON_MS))
    .filter(g => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (g.senderName ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalSessionsRemaining = (gifts ?? []).reduce((sum, g) => sum + g.sessionsRemaining, 0);

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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Interview Gifts</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          {(gifts ?? []).length} received · {totalSessionsRemaining} practice session{totalSessionsRemaining === 1 ? '' : 's'} available
        </p>
      </div>

      {gifts === null && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 14, color: 'var(--text-3)' }}>
          <span style={{ fontSize: 26, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
          <div style={{ fontSize: 13 }}>Loading your interview gifts…</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          Couldn't load your interview gifts right now — try refreshing.
        </div>
      )}

      {gifts?.length === 0 && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
          padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
        }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PartyPopper size={22} color="#34D399" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No interview gifts yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380 }}>
            When someone sends you an Interview Gift, it'll show up here — signed in with this same email address.
          </div>
        </div>
      )}

      {gifts && gifts.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by sender…"
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
                  background: filter === f ? 'rgba(52,211,153,0.15)' : 'transparent',
                  borderColor: filter === f ? 'rgba(52,211,153,0.5)' : 'var(--border)',
                  color: filter === f ? '#34D399' : 'var(--text-3)', transition: 'all 0.15s',
                }}>{f}</button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {sortableTh('From', 'senderName')}
                    {sortableTh('Sessions left', 'sessionsRemaining')}
                    {sortableTh('Expires', 'expiresAt')}
                    <th style={thStyle} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((gift, i) => {
                    const expired = gift.expiresAt ? new Date(gift.expiresAt).getTime() < now : false;
                    return (
                      <tr key={gift.id}
                        onClick={startInterview}
                        style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
                      >
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>
                          {gift.source === 'gift' ? `🎁 ${gift.senderName ?? 'Someone'}` : 'Self-purchased'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                            {gift.sessionsRemaining} / {gift.sessionsTotal}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: expired ? '#EF4444' : 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(gift.expiresAt)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <button onClick={e => { e.stopPropagation(); startInterview(); }} style={{ fontSize: 11, color: '#34D399', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>Start Interview →</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {visible.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No interview gifts match your filter.</div>}

            <Pagination
              page={page} totalPages={totalPages} onPageChange={setPage}
              pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }}
              rangeStart={(page - 1) * pageSize + 1} rangeEnd={Math.min(page * pageSize, filtered.length)} total={filtered.length}
              accentColor="#34D399" accentColorRgb="52,211,153"
            />
          </div>
        </>
      )}
    </div>
  );
}
