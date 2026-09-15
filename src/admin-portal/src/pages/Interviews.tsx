import { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, Loader2, ChevronUp, ChevronDown, Video, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { interviewsApi, SHARED_VIEW_BASE, type AdminInterview, type ApiError } from '../api/interviewsApi'
import { Pagination } from '../components/Pagination'

type SortKey = 'candidate' | 'subject' | 'questions' | 'score' | 'date'
type SortDir = 'asc' | 'desc'

export default function Interviews() {
  const { token } = useAuth()
  const [rows, setRows] = useState<AdminInterview[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await interviewsApi.list(token, { size: 1000 })
      setRows(res.rows)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load interviews.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortKey(key); setSortDir(key === 'date' || key === 'score' ? 'desc' : 'asc') }
    setPage(1)
  }

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = term
      ? rows.filter(r =>
          r.candidateName.toLowerCase().includes(term) ||
          (r.role ?? '').toLowerCase().includes(term) ||
          (r.company ?? '').toLowerCase().includes(term)
        )
      : rows

    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'candidate': return a.candidateName.localeCompare(b.candidateName) * dir
        case 'subject': return (a.role ?? '').localeCompare(b.role ?? '') * dir
        case 'questions': return (a.questionCount - b.questionCount) * dir
        case 'score': return (a.overallScore - b.overallScore) * dir
        case 'date': return a.createdAt.localeCompare(b.createdAt) * dir
      }
    })
  }, [rows, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize))
  const pageRows = visibleRows.slice((page - 1) * pageSize, page * pageSize)

  function SortableHeader({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) {
    const active = sortKey === sortKeyName
    return (
      <th
        onClick={() => toggleSort(sortKeyName)}
        style={{
          textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: active ? 'var(--blue)' : 'var(--text-3)', cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          {label}
          {active && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </span>
      </th>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Interviews</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          {visibleRows.length} of {rows.length} session{rows.length === 1 ? '' : 's'} — every completed interview across every candidate.
        </p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '9px 14px', maxWidth: 360,
        }}>
          <Search size={15} color="var(--text-3)" />
          <input
            type="text"
            autoComplete="off"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by candidate, role, or company…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', caretColor: 'var(--blue)' }}
          />
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
          <Loader2 size={16} className="admin-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>No interviews saved yet.</div>
      ) : visibleRows.length === 0 ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>No interviews match "{search}".</div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <SortableHeader label="Candidate" sortKeyName="candidate" />
                <SortableHeader label="Subject" sortKeyName="subject" />
                <SortableHeader label="Questions" sortKeyName="questions" />
                <SortableHeader label="Score" sortKeyName="score" />
                <SortableHeader label="Date & Time" sortKeyName="date" />
                <th style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left' }}>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map(r => (
                <tr
                  key={r.id}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>{r.candidateName}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>
                    {r.role || '—'}
                    {r.company && <span style={{ color: 'var(--text-3)' }}> · {r.company}</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{r.questionCount}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontWeight: 700, color: r.overallScore >= 70 ? 'var(--green)' : r.overallScore >= 40 ? '#F59E0B' : '#EF4444' }}>
                      {Math.round(r.overallScore)}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{formatDateTime(r.createdAt)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                        color: r.isShared ? 'var(--green)' : 'var(--text-3)',
                        background: r.isShared ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
                      }}>
                        {r.isShared ? 'Shared' : 'Private'}
                      </span>
                      {r.hasVideo && <Video size={13} color="var(--text-3)" />}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {r.isShared && r.shareToken ? (
                      <a
                        href={`${SHARED_VIEW_BASE}/${r.shareToken}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--blue)', textDecoration: 'none' }}
                      >
                        View <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }} title="Only shared interviews can be opened from here">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page} totalPages={totalPages} onPageChange={setPage}
            pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }}
            rangeStart={(page - 1) * pageSize + 1} rangeEnd={Math.min(page * pageSize, visibleRows.length)} total={visibleRows.length}
          />
        </div>
      )}
    </div>
  )
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
