import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, X, Trash2, Volume2 } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { Pagination } from '../components/Pagination';
import QuestionBankAnswerModal from '../components/QuestionBankAnswerModal';
import { listQuestionBank, deleteQuestionBankEntry, type QuestionBankEntry } from '../api/questionBankApi';

// Copied from MyInterviewsPage.tsx's own search/sort/pagination shape (this codebase's
// established "copy then trim" convention) — trimmed of visibility toggling, which doesn't
// apply here.
type SortKey = 'savedAt' | 'questionText' | 'jobTitle' | 'difficulty';

function difficultyColor(d: string | null) {
  return d === 'Expert' ? '#EF4444' : d === 'Pro' ? '#F59E0B' : d === 'Beginner' ? '#4F8EF7' : '#34D399';
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

export default function QuestionBankPage() {
  const authToken = useAuthStore(s => s.token);

  const [items, setItems] = useState<QuestionBankEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('savedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<QuestionBankEntry | null>(null);

  useEffect(() => {
    if (!authToken) return;
    listQuestionBank(authToken)
      .then(setItems)
      .catch(() => setError(true));
  }, [authToken]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  }

  function handleDelete(id: string) {
    setItems(prev => prev?.filter(i => i.id !== id) ?? null);
    if (selected?.id === id) setSelected(null);
    if (authToken) void deleteQuestionBankEntry(authToken, id);
  }

  const filtered = (items ?? [])
    .filter(i => {
      const q = search.toLowerCase();
      if (!q) return true;
      return i.questionText.toLowerCase().includes(q)
        || (i.jobTitle ?? '').toLowerCase().includes(q)
        || (i.company ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
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
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Question Bank</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {(items ?? []).length} saved answer{(items ?? []).length === 1 ? '' : 's'} — every question you clicked "Save & Continue" on during a practice interview.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          Couldn't load your question bank — try refreshing.
        </div>
      )}

      {items === null && !error && (
        <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>Loading…</div>
      )}

      {items && items.length === 0 && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
          padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
        }}>
          <div style={{ fontSize: 32 }}>💡</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Nothing saved yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380 }}>
            During a practice interview, click "Tell Me The Answer" and then "Save & Continue" to build your own library of model answers here.
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0, position: 'relative' }}>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search question, job title, or company…"
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
              <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {sortableTh('Saved', 'savedAt')}
                    {sortableTh('Question', 'questionText')}
                    {sortableTh('Job Title', 'jobTitle')}
                    {sortableTh('Difficulty', 'difficulty')}
                    <th style={thStyle} />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item, i) => (
                    <tr key={item.id}
                      onClick={() => setSelected(item)}
                      style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 1 ? 'rgba(255,255,255,0.025)' : 'transparent')}
                    >
                      <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmtDate(item.savedAt)}</td>
                      <td style={{ padding: '14px 16px', maxWidth: 380 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.questionText}>
                          {item.questionText}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-2)' }}>{item.jobTitle ?? '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {item.difficulty ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: difficultyColor(item.difficulty), background: `${difficultyColor(item.difficulty)}18`, padding: '4px 10px', borderRadius: 20 }}>
                            {item.difficulty}
                          </span>
                        ) : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                          <button onClick={e => { e.stopPropagation(); setSelected(item); }} title="Listen" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#34D399', display: 'flex', padding: 2 }}>
                            <Volume2 size={14} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(item.id); }} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2, opacity: 0.6 }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visible.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No saved answers match your search.</div>}

            <Pagination
              page={page} totalPages={totalPages} onPageChange={setPage}
              pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }}
              rangeStart={(page - 1) * pageSize + 1} rangeEnd={Math.min(page * pageSize, filtered.length)} total={filtered.length}
            />
          </div>
        </>
      )}

      {selected && <QuestionBankAnswerModal entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
