import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Search, Loader2, ChevronUp, ChevronDown, Plus, Lock, Unlock, MailWarning } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usersApi, type UserSummary, type ApiError } from '../api/usersApi'
import { FormField, inputStyle, buttonStyle } from '../pages/Organisations'
import { Pagination } from './Pagination'

type SortKey = 'name' | 'email' | 'roles' | 'joined'
type SortDir = 'asc' | 'desc'

export function UserList({ role, title, entityLabel, searchPlaceholder }: {
  role: 'candidate' | 'recruiter' | 'employer'; title: string; entityLabel: string; searchPlaceholder: string
}) {
  const { token } = useAuth()
  const [rows, setRows] = useState<UserSummary[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('joined')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [showCreate, setShowCreate] = useState(false)

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

  const [actionError, setActionError] = useState('')
  const [actingOn, setActingOn] = useState<string | null>(null)

  async function handleLock(u: UserSummary) {
    if (!token) return
    const reason = window.prompt(`Lock ${u.email}? Optionally note why (shown to other admins, never to the user):`)
    if (reason === null) return // cancelled
    setActingOn(u.id)
    setActionError('')
    try {
      await usersApi.lock(token, u.id, reason || undefined)
      setRows(rs => rs.map(r => r.id === u.id ? { ...r, isLocked: true, lockedReason: reason || null } : r))
    } catch (err) {
      setActionError((err as ApiError).error ?? 'Failed to lock account.')
    } finally {
      setActingOn(null)
    }
  }

  async function handleUnlock(u: UserSummary) {
    if (!token) return
    setActingOn(u.id)
    setActionError('')
    try {
      await usersApi.unlock(token, u.id)
      setRows(rs => rs.map(r => r.id === u.id ? { ...r, isLocked: false, lockedReason: null } : r))
    } catch (err) {
      setActionError((err as ApiError).error ?? 'Failed to unlock account.')
    } finally {
      setActingOn(null)
    }
  }

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
            {visibleRows.length} of {rows.length} account{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          New {entityLabel}
        </button>
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

      {(error || actionError) && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {error || actionError}
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
                <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Status</th>
                <th style={{ padding: '10px 16px' }} />
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
                    <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{new Date(u.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.isLocked ? (
                        <span title={u.lockedReason ?? undefined} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '3px 8px' }}>
                          <Lock size={11} /> Locked
                        </span>
                      ) : !u.emailVerified ? (
                        <span title="Hasn't clicked their verification email yet" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, padding: '3px 8px' }}>
                          <MailWarning size={11} /> Unverified
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Active</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => u.isLocked ? handleUnlock(u) : handleLock(u)}
                        disabled={actingOn === u.id}
                        title={u.isLocked ? 'Unlock account' : 'Lock account'}
                        style={{
                          background: 'none', border: '1px solid var(--border)', borderRadius: 7,
                          color: u.isLocked ? '#34D399' : 'var(--text-3)', cursor: actingOn === u.id ? 'default' : 'pointer',
                          padding: '5px 7px', display: 'inline-flex', alignItems: 'center',
                          opacity: actingOn === u.id ? 0.5 : 1,
                        }}
                      >
                        {actingOn === u.id ? <Loader2 size={13} className="admin-spin" /> : u.isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination
            page={page} totalPages={totalPages} onPageChange={setPage}
            pageSize={pageSize} onPageSizeChange={n => { setPageSize(n); setPage(1) }}
            rangeStart={(page - 1) * pageSize + 1} rangeEnd={Math.min(page * pageSize, visibleRows.length)} total={visibleRows.length}
          />
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          role={role}
          entityLabel={entityLabel}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}

function CreateUserModal({ role, entityLabel, onClose, onCreated }: {
  role: 'candidate' | 'recruiter' | 'employer'; entityLabel: string; onClose: () => void; onCreated: () => void
}) {
  const { token } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const mouseDownOnBackdropRef = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!name.trim()) { setError('Name is required.'); return }
    if (!email.trim() || !email.includes('@')) { setError('A valid email is required.'); return }
    setSaving(true)
    setError('')
    try {
      await usersApi.create(token, { email: email.trim(), name: name.trim(), role })
      onCreated()
    } catch (err) {
      setError((err as ApiError).error ?? `Failed to create ${entityLabel.toLowerCase()}.`)
      setSaving(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onMouseDown={e => { mouseDownOnBackdropRef.current = e.target === e.currentTarget }}
      onClick={e => { if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 440, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>New {entityLabel}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Creates the account and emails them a link to set their own password.</p>
          {(role === 'recruiter' || role === 'employer') && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
              Belongs to a company or agency? Add them from that organisation's page instead, so they're linked to it.
            </p>
          )}
        </div>

        <FormField label="Name">
          <input type="text" autoComplete="off" value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="e.g. Jordan Reyes" />
        </FormField>
        <FormField label="Email">
          <input type="text" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="jordan@example.com" />
        </FormField>

        {error && <div style={{ fontSize: 12, color: '#EF4444' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ ...buttonStyle, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...buttonStyle, background: 'var(--blue)', color: '#fff', border: 'none', flex: 1, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating…' : `Create ${entityLabel.toLowerCase()}`}
          </button>
        </div>
      </form>
    </div>
  )
}
