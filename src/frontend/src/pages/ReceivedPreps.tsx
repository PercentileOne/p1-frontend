import { reportPrepProgress } from '../api/prepProgress';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronUp, ChevronDown, Gift, FileText } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { Pagination } from '../components/Pagination';
import { useIsPhone } from '../hooks/useIsPhone';

// Candidate-side half of the recruiter → candidate interview-prep loop. Backend endpoint
// (GET /api/interview-preps/received) matches purely on the logged-in user's own JWT email
// claim against every recruiter's sent preps — see Explain.Api.Features.InterviewPreps.
interface ReceivedPrep {
  id:            string;
  recruiterId:   string;
  recruiterName: string;
  title:         string | null;
  firstName:     string;
  lastName:      string;
  role:          string;
  level:         string;
  round:         string | null;
  salaryExpectation: string | null;
  interviewDate: string;
  jobSpecText:   string;
  cvText:        string | null;
  cvFileName:    string | null;
  cvFileUrl:     string | null; // short-lived SAS URL — the real uploaded file, not the extracted text
  specialFocus:  string[] | null;
  status:        string;
  createdAt:     string;
}

const FILTER_OPTS = ['All', 'Upcoming', 'Past'] as const;
type FilterOpt = (typeof FILTER_OPTS)[number];
type SortKey = 'interviewDate' | 'role' | 'recruiterName' | 'level';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.theinterviewchair.com';

function levelColor(level: string) {
  return level === 'Standard' ? '#34D399' : level === 'Pro' ? '#F59E0B' : level === 'Expert' ? '#EF4444' : '#4F8EF7';
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

export default function ReceivedPreps() {
  const navigate = useNavigate();
  const phone = useIsPhone();
  const token = useAuthStore(s => s.token);

  const [preps,   setPreps]   = useState<ReceivedPrep[] | null>(null);
  const [error,   setError]   = useState(false);
  const [filter,  setFilter]  = useState<FilterOpt>('All');
  const [search,  setSearch]  = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('interviewDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page,    setPage]    = useState(1);
  const [pageSize, setPageSize] = useState(7);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/interview-preps/received`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((data: ReceivedPrep[]) => setPreps(data))
      .catch(() => setError(true));
  }, [token]);

  // Straight to the real intake/review screen, not straight into the interview — the
  // candidate gets a last look at role/CV/difficulty (and can change any of it) before
  // clicking Start themselves, same principle as the recruiter side not auto-launching.
  function reviewAndStart(prep: ReceivedPrep) {
    reportPrepProgress({ id: prep.id, recruiterId: prep.recruiterId }, 'opened');   // the recruiter can see that the prep was opened
    navigate('/interview-pack/start', {
      state: {
        jobTitle: prep.role,
        jobSpec: prep.jobSpecText,
        cvText: prep.cvText ?? undefined,
        cvFileUrl: prep.cvFileUrl ?? undefined,
        cvFileName: prep.cvFileName ?? undefined,
        difficulty: prep.level,
        interviewRound: prep.round ?? undefined,
        salaryExpectation: prep.salaryExpectation ?? undefined,
        specialFocus: prep.specialFocus ?? undefined,
        interviewDate: prep.interviewDate,
        prepId: prep.id,
        prepRecruiterId: prep.recruiterId,
        recruiterName: prep.recruiterName,
      },
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  const now = Date.now();
  const filtered = (preps ?? [])
    .filter(p => filter === 'All' || (filter === 'Upcoming' ? new Date(p.interviewDate).getTime() >= now : new Date(p.interviewDate).getTime() < now))
    .filter(p => {
      const q = search.toLowerCase();
      if (!q) return true;
      return p.role.toLowerCase().includes(q) || p.recruiterName.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const upcomingCount = (preps ?? []).filter(p => new Date(p.interviewDate).getTime() >= now).length;

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
        <h1 style={{ fontSize: phone ? 19 : 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Interview Preps</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          {(preps ?? []).length} received · {upcomingCount} upcoming
        </p>
      </div>

      {preps === null && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 14, color: 'var(--text-3)' }}>
          <span style={{ fontSize: 26, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
          <div style={{ fontSize: 13 }}>Loading your interview preps…</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          Couldn't load your interview preps right now — try refreshing.
        </div>
      )}

      {preps?.length === 0 && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
          padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
        }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gift size={22} color="#34D399" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No interview preps yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380 }}>
            When a recruiter sets up interview practice for you, it'll show up here.
          </div>
        </div>
      )}

      {preps && preps.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search role or recruiter…"
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
            {/* Phones (2026-10-11): one card per prep; the whole card opens it. */}
            {phone && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {visible.map(prep => {
                  const color = levelColor(prep.level);
                  return (
                    <div key={prep.id} onClick={() => reviewAndStart(prep)} style={{ padding: 16, borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', overflowWrap: 'anywhere' }}>{prep.role}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2, overflowWrap: 'anywhere' }}>🎁 {prep.recruiterName}</div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 4 }}>{fmtDate(prep.interviewDate)}</div>
                        </div>
                        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '4px 10px', borderRadius: 20 }}>{prep.level}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                        {prep.cvFileUrl && (
                          <a href={prep.cvFileUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                            style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#34D399', background: 'rgba(52,211,153,0.1)', padding: '0 12px', borderRadius: 10, textDecoration: 'none', minWidth: 0 }}>
                            <FileText size={13} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>CV</span>
                          </a>
                        )}
                        <button onClick={e => { e.stopPropagation(); reviewAndStart(prep); }}
                          style={{ flex: 1, minWidth: 0, minHeight: 44, background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.4)', borderRadius: 10, color: '#34D399', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                          Review &amp; Start →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!phone && <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {sortableTh('Interview Date', 'interviewDate')}
                    {sortableTh('Role', 'role')}
                    {sortableTh('From', 'recruiterName')}
                    {sortableTh('Difficulty', 'level')}
                    <th style={thStyle}>CV</th>
                    <th style={thStyle} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((prep, i) => {
                    const color = levelColor(prep.level);
                    return (
                      <tr key={prep.id}
                        onClick={() => reviewAndStart(prep)}
                        style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
                      >
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(prep.interviewDate)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{prep.role}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>🎁 {prep.recruiterName}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '4px 10px', borderRadius: 20 }}>
                            {prep.level}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {prep.cvFileUrl
                            ? (
                              <a
                                href={prep.cvFileUrl} target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                title={prep.cvFileName ?? 'View CV'}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#34D399', background: 'rgba(52,211,153,0.1)', padding: '3px 8px', borderRadius: 20, textDecoration: 'none', maxWidth: 160 }}
                              >
                                <FileText size={11} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prep.cvFileName ?? 'View CV'}</span>
                              </a>
                            )
                            : prep.cvText
                              ? <span style={{ fontSize: 11, fontWeight: 600, color: '#34D399', background: 'rgba(52,211,153,0.1)', padding: '3px 8px', borderRadius: 20 }}>✓ Loaded</span>
                              : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <button onClick={e => { e.stopPropagation(); reviewAndStart(prep); }} style={{ fontSize: 11, color: '#34D399', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>Review &amp; Start →</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}
            {visible.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No interview preps match your filter.</div>}

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
