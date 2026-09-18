import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, Trash2, X, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CvAnalysisModal } from '../components/CvAnalysisModal';
import { savedToRoleRows } from '../components/CvAnalysisResultsView';
import { fetchCvAnalysisHistory, deleteCvAnalysisHistoryRecord, type CvAnalysisHistoryRecord } from '../api/cvAnalysisApi';
import { Pagination } from '../components/Pagination';

type SortKey = 'createdAt' | 'candidateName' | 'topRole' | 'topSalary';

const thStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left',
  whiteSpace: 'nowrap', userSelect: 'none',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtK(n: number) {
  return n >= 1000 ? `£${Math.round(n / 1000)}k` : `£${n}`;
}

// Copy-trimmed from the candidate portal's real, working MyInterviewsPage.tsx pattern (Francis
// confirmed this is the "familiar style" he means, live 2026-09-18) — fetch-on-mount,
// client-side search/sort/pagination, same table visual language. This is the recruiter portal's
// "CV Analyzer" nav destination; the live upload/analyze flow (CvAnalysisModal) is reached from
// here via "+ Analyze New CV" or by clicking a saved row.
export default function CvAnalysisHistory() {
  const { token } = useAuth();

  const [items, setItems] = useState<CvAnalysisHistoryRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);

  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [viewing, setViewing] = useState<CvAnalysisHistoryRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function load() {
    if (!token) return;
    fetchCvAnalysisHistory(token).then(setItems).catch(() => setError(true));
  }

  useEffect(load, [token]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    setItems(prev => prev?.filter(r => r.id !== id) ?? null);
    setDeleteConfirm(null);
    try { await deleteCvAnalysisHistoryRecord(id, token); } catch { load(); }
  }

  const topRoleOf = (r: CvAnalysisHistoryRecord) => r.roleMatches[0]?.careerTitle ?? null;
  const topSalaryOf = (r: CvAnalysisHistoryRecord) => r.roleMatches[0]?.salaryUkStarting ?? 0;

  const filtered = (items ?? [])
    .filter(r => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (r.candidateName ?? '').toLowerCase().includes(q) || (topRoleOf(r) ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = sortKey === 'topRole' ? (topRoleOf(a) ?? '') : sortKey === 'topSalary' ? topSalaryOf(a) : sortKey === 'candidateName' ? (a.candidateName ?? '') : a.createdAt;
      const bv = sortKey === 'topRole' ? (topRoleOf(b) ?? '') : sortKey === 'topSalary' ? topSalaryOf(b) : sortKey === 'candidateName' ? (b.candidateName ?? '') : b.createdAt;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

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
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>CV Analyzer</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {(items ?? []).length} saved analyses
          </p>
        </div>
        <button
          onClick={() => setShowAnalyzeModal(true)}
          style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #34D399, #4F8EF7)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          + Analyze New CV
        </button>
      </div>

      {items === null && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 14, color: 'var(--text-3)' }}>
          <span style={{ fontSize: 26, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
          <div style={{ fontSize: 13 }}>Loading your saved analyses…</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          Couldn't load your saved analyses right now — try refreshing.
        </div>
      )}

      {items?.length === 0 && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
          padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
        }}>
          <div style={{ fontSize: 32 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No saved analyses yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380 }}>
            Analyse a candidate's CV and click "Save to List" to see it here — searchable, sortable, and shareable with colleagues.
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0, position: 'relative' }}>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search candidate name or role…"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 36px 9px 14px', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {sortableTh('Date', 'createdAt')}
                    {sortableTh('Candidate', 'candidateName')}
                    {sortableTh('Top Role', 'topRole')}
                    {sortableTh('Top Salary', 'topSalary')}
                    <th style={thStyle}>Shared</th>
                    <th style={thStyle} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, i) => {
                    const topRole = topRoleOf(r);
                    const topSalary = r.roleMatches[0];
                    return (
                      <tr key={r.id}
                        onClick={() => setViewing(r)}
                        style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
                      >
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.candidateName ?? 'Unnamed candidate'}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{topRole ?? '—'}</td>
                        <td style={{ padding: '14px 16px', fontSize: 12, color: '#34D399', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {topSalary ? `${fmtK(topSalary.salaryUkStarting)} – ${fmtK(topSalary.salaryUkExpert)}` : '—'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {r.isShared
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#A78BFA' }}><Share2 size={12} /> Shared</span>
                            : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button onClick={e => { e.stopPropagation(); setViewing(r); }} style={{ fontSize: 11, color: '#4F8EF7', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, whiteSpace: 'nowrap' }}>View →</button>
                            <button
                              title="Delete"
                              onClick={e => { e.stopPropagation(); setDeleteConfirm(r.id); }}
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
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No saved analyses match your search.</div>
            )}
            <Pagination
              page={page} totalPages={totalPages} onPageChange={setPage}
              pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1); }}
              rangeStart={(page - 1) * pageSize + 1} rangeEnd={Math.min(page * pageSize, filtered.length)} total={filtered.length}
              accentColor="#34D399" accentColorRgb="52,211,153"
            />
          </div>
        </>
      )}

      {/* Analyze a new CV */}
      {showAnalyzeModal && (
        <CvAnalysisModal
          onClose={() => setShowAnalyzeModal(false)}
          onSaved={load}
        />
      )}

      {/* View a saved record */}
      {viewing && (
        <CvAnalysisModal
          onClose={() => setViewing(null)}
          initialData={{
            result: viewing.analysis,
            roleRows: savedToRoleRows(viewing.roleMatches),
            recordId: viewing.id,
            isShared: viewing.isShared,
            shareToken: viewing.shareToken,
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <>
          <div onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'var(--bg2)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '16px', padding: '28px', width: '320px', zIndex: 101, textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗑️</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Delete this analysis?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '24px' }}>
              This cannot be undone. If it's been shared, the link will stop working too.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', color: 'var(--text-2)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{ flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', padding: '10px', color: '#EF4444', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
