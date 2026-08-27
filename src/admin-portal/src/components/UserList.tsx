import { useEffect, useState, useCallback, useMemo } from 'react'
import { Search, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usersApi, type UserSummary, type ApiError } from '../api/usersApi'

type SortKey = 'name' | 'email' | 'roles' | 'joined'
type SortDir = 'asc' | 'desc'
const PAGE_SIZE = 10

export function UserList({ role, title, searchPlaceholder }: { role: string; title: string; searchPlaceholder: string }) {
  const { token } = useAuth()
  const [rows, setRows] = useState<UserSummary[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('joined')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await usersApi.list(token, { role, size: 200 })
      setRows(res.rows)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [token, role])

  useEffect(() => { load() }, [load])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = term
      ? rows.filter(u =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
        )
      : rows

    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`) * dir
        case 'email':
          return a.email.localeCompare(b.email) * dir
        case 'roles':
          return a.roles.filter(r => r !== role).join(',').localeCompare(b.roles.filter(r => r !== role).join(',')) * dir
        case 'joined':
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
      }
    })
  }, [rows, search, sortKey, sortDir, role])

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE))
  const pageRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          {visibleRows.length} of {rows.length} account{rows.length === 1 ? '' : 's'}
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
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder={searchPlaceholder}
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
        <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>No accounts yet.</div>
      ) : visibleRows.length === 0 ? (
        <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>No accounts match "{search}".</div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <SortableHeader label="Name" sortKeyName="name" />
                <SortableHeader label="Email" sortKeyName="email" />
                <SortableHeader label="Other roles" sortKeyName="roles" />
                <SortableHeader label="Joined" sortKeyName="joined" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map(u => {
                const otherRoles = u.roles.filter(r => r !== role)
                return (
                  <tr
                    key={u.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>{`${u.firstName} ${u.lastName}`.trim() || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-3)', textTransform: 'capitalize' }}>{otherRoles.join(', ') || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, visibleRows.length)} of {visibleRows.length}
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
                    color: n === page ? 'var(--blue)' : 'var(--text-3)',
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
      )}
    </div>
  )
}
