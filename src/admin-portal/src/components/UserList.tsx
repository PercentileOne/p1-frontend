import { useEffect, useState, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usersApi, type UserSummary, type ApiError } from '../api/usersApi'

export function UserList({ role, title, searchPlaceholder }: { role: string; title: string; searchPlaceholder: string }) {
  const { token } = useAuth()
  const [rows, setRows] = useState<UserSummary[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (q?: string) => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const res = await usersApi.list(token, { role, search: q, size: 200 })
      setRows(res.rows)
      setTotal(res.total)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [token, role])

  useEffect(() => { load() }, [load])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    load(search.trim() || undefined)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{total} account{total === 1 ? '' : 's'}</p>
      </div>

      <form onSubmit={handleSearchSubmit} style={{ marginBottom: 18 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '9px 14px', maxWidth: 360,
        }}>
          <Search size={15} color="var(--text-3)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' }}
          />
        </div>
      </form>

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
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Other roles', 'Joined'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(u => {
                const otherRoles = u.roles.filter(r => r !== role)
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)' }}>{`${u.firstName} ${u.lastName}`.trim() || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-3)', textTransform: 'capitalize' }}>{otherRoles.join(', ') || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
