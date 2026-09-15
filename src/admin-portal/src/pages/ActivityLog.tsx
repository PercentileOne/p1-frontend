import { useEffect, useState, useCallback } from 'react'
import { Search, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { eventsApi, type SystemEvent, type ApiError } from '../api/eventsApi'

// Same sortBy values the backend's SortableFields whitelist accepts (Features/Events/Admin/
// Endpoint.cs) — Location sorts by country, not the combined "city, country" display string,
// since Cosmos can only ORDER BY one indexed property at a time.
type SortKey = 'createdAt' | 'email' | 'eventType' | 'page' | 'portal' | 'country'
type SortDir = 'asc' | 'desc'

// Same visual conventions as UserList.tsx (search pill, table, pager) — but SERVER-side
// filtering/pagination, not client-side over one fetched batch, since event volume won't fit
// in one request the way a user list does. Only searches the hot 10-day Cosmos window — see
// Features/Events/Admin/Endpoint.cs's own top comment on why deep historical search over the
// permanent archive is a deliberate v2 problem, not solved here.
const PAGE_SIZE = 50
const PORTALS = ['', 'candidate', 'recruiter', 'employer', 'admin'] as const

const inputStyle: React.CSSProperties = {
  flex: 1, background: 'transparent', border: 'none', outline: 'none',
  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', caretColor: 'var(--blue)',
}
const selectStyle: React.CSSProperties = {
  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
}

export default function ActivityLog() {
  const { token } = useAuth()
  const [rows, setRows] = useState<SystemEvent[]>([])
  const [total, setTotal] = useState(0)
  const [email, setEmail] = useState('')
  const [eventType, setEventType] = useState('')
  const [portal, setPortal] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await eventsApi.list(token, {
        email: email.trim() || undefined,
        eventType: eventType.trim() || undefined,
        portal: portal || undefined,
        sortBy: sortKey, sortDir,
        page, size: PAGE_SIZE,
      })
      setRows(res.rows)
      setTotal(res.total)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load activity.')
    } finally {
      setLoading(false)
    }
  }, [token, email, eventType, portal, sortKey, sortDir, page])

  // Same toggle contract as UserList.tsx's own sortable columns: click an inactive column to
  // sort ascending by it, click the active one again to flip direction. Re-fetches from page 1
  // since this is server-side pagination — a stale later page after a sort change would be
  // showing the wrong slice entirely, not just a wrong order.
  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function fmt(iso: string) {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Activity Log</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          {total.toLocaleString()} event{total === 1 ? '' : 's'} in the last 10 days — real-time, not delayed like Google Analytics.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '9px 14px', flex: '1 1 240px', minWidth: 0,
        }}>
          <Search size={15} color="var(--text-3)" />
          <input
            type="text" autoComplete="off" value={email}
            onChange={e => { setEmail(e.target.value); setPage(1) }}
            placeholder="Search by user email…"
            style={inputStyle}
          />
        </div>
        <input
          type="text" autoComplete="off" value={eventType}
          onChange={e => { setEventType(e.target.value); setPage(1) }}
          placeholder="Event type…"
          style={{ ...selectStyle, flex: '1 1 160px', minWidth: 0 }}
        />
        <select value={portal} onChange={e => { setPortal(e.target.value); setPage(1) }} style={selectStyle}>
          {PORTALS.map(p => <option key={p} value={p}>{p ? p[0].toUpperCase() + p.slice(1) : 'All portals'}</option>)}
        </select>
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
        <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>No events match these filters.</div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <SortableHeader label="When" sortKeyName="createdAt" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortableHeader label="User" sortKeyName="email" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortableHeader label="Event" sortKeyName="eventType" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortableHeader label="Page" sortKeyName="page" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortableHeader label="Portal" sortKeyName="portal" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <SortableHeader label="Location" sortKeyName="country" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {rows.map(e => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(79,142,247,0.08)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{fmt(e.createdAt)}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{e.email ?? <span style={{ color: 'var(--text-3)' }}>Anonymous</span>}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>{e.eventType}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-3)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.page ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-3)', textTransform: 'capitalize' }}>{e.portal ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {e.city && e.country ? `${e.city}, ${e.country}` : e.country ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: page === 1 ? 'var(--text-3)' : 'var(--text-2)', cursor: page === 1 ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: page === 1 ? 0.4 : 1 }}
                >← Prev</button>
                <span style={{ fontSize: 12, color: 'var(--text-3)', padding: '6px 4px' }}>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: page === totalPages ? 'var(--text-3)' : 'var(--text-2)', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: page === totalPages ? 0.4 : 1 }}
                >Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Same look/click-to-toggle contract as UserList.tsx's own SortableHeader — copied rather than
// shared since that one owns its sort state internally and this page's lives in ActivityLog
// itself (server-side sort/paging here vs. UserList's client-side, per this file's own top
// comment on why).
function SortableHeader({ label, sortKeyName, sortKey, sortDir, onToggle }: {
  label: string; sortKeyName: SortKey; sortKey: SortKey; sortDir: SortDir; onToggle: (key: SortKey) => void
}) {
  const active = sortKey === sortKeyName
  return (
    <th
      onClick={() => onToggle(sortKeyName)}
      style={{
        textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: active ? 'var(--blue)' : 'var(--text-3)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label}
        {active && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  )
}
