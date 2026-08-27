import { useEffect, useState, useCallback, useRef } from 'react'
import { Loader2, Bell, Plus, Trash2, Pause, Play, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { alertsApi, type Alert, type AlertMatch, type ApiError } from '../api/alertsApi'
import { searchCareers, type Career } from '../api/careersApi'

export default function Alerts() {
  const { token } = useAuth()
  const [tab, setTab] = useState<'alerts' | 'matches'>('alerts')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [matches, setMatches] = useState<AlertMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [a, m] = await Promise.all([alertsApi.list(token), alertsApi.matches(token)])
      setAlerts(a)
      setMatches(m)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load alerts.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const unviewedCount = matches.filter(m => !m.viewed).length

  async function togglePause(a: Alert) {
    if (!token) return
    const updated = await alertsApi.update(token, a.id, { status: a.status === 'active' ? 'paused' : 'active' })
    setAlerts(prev => prev.map(x => x.id === updated.id ? updated : x))
  }

  async function remove(id: string) {
    if (!token) return
    await alertsApi.remove(token, id)
    setAlerts(prev => prev.filter(x => x.id !== id))
  }

  async function openMatches() {
    setTab('matches')
    if (!token) return
    const unviewed = matches.filter(m => !m.viewed)
    if (unviewed.length === 0) return
    await Promise.all(unviewed.map(m => alertsApi.markMatchViewed(token, m.id)))
    setMatches(prev => prev.map(m => ({ ...m, viewed: true })))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', margin: 0 }}>Alerts</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Get notified the moment a candidate clears your bar — no more checking back.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <Plus size={14} /> New Alert
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {(['alerts', 'matches'] as const).map(t => (
          <button
            key={t}
            onClick={() => t === 'matches' ? openMatches() : setTab(t)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 4px', marginRight: 20, background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t ? 'var(--blue)' : 'transparent'}`,
              color: tab === t ? 'var(--text)' : 'var(--text-3)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {t === 'alerts' ? `My Alerts (${alerts.length})` : 'Match History'}
            {t === 'matches' && unviewedCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#06210f', background: '#F59E0B', borderRadius: 20, padding: '1px 7px' }}>{unviewedCount}</span>
            )}
          </button>
        ))}
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
      ) : tab === 'alerts' ? (
        alerts.length === 0 ? (
          <EmptyState icon={<Bell size={28} />} text="No alerts yet. Create one and we'll tell you the moment a matching candidate interviews." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map(a => (
              <div key={a.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, opacity: a.status === 'paused' ? 0.55 : 1 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {a.role} <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>· {a.minScore}%+</span>
                    {a.location && (
                      <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>
                        {' · '}{a.radiusMiles ? `within ${a.radiusMiles}mi of ${a.location}` : a.location}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                    {a.matchCount} match{a.matchCount === 1 ? '' : 'es'}
                    {a.lastMatchAt && ` · last ${new Date(a.lastMatchAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                    {' · '}{a.notifyEmail ? 'Email + in-app' : 'In-app only'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: a.status === 'active' ? '#34D399' : 'var(--text-3)', background: a.status === 'active' ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 20, textTransform: 'capitalize' }}>
                    {a.status}
                  </span>
                  <button onClick={() => togglePause(a)} title={a.status === 'active' ? 'Pause' : 'Resume'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 4 }}>
                    {a.status === 'active' ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <button onClick={() => remove(a.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 4 }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        matches.length === 0 ? (
          <EmptyState icon={<Bell size={28} />} text="No matches yet — they'll land here the moment a candidate clears one of your alerts." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {matches.map(m => (
              <div key={m.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {m.candidateName} <span style={{ color: 'var(--text-3)', fontWeight: 500 }}> — {m.role}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
                    {new Date(m.matchedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: m.overallScore >= 75 ? '#34D399' : m.overallScore >= 60 ? '#F59E0B' : '#EF4444' }}>
                  {m.overallScore}%
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {creating && (
        <CreateAlertModal
          onClose={() => setCreating(false)}
          onCreated={a => { setAlerts(prev => [a, ...prev]); setCreating(false) }}
        />
      )}
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 220, color: 'var(--text-3)', textAlign: 'center', gap: 10 }}>
      <div style={{ opacity: 0.5 }}>{icon}</div>
      <div style={{ fontSize: 13, maxWidth: 320 }}>{text}</div>
    </div>
  )
}

function CreateAlertModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: Alert) => void }) {
  const { token } = useAuth()
  const mouseDownOnBackdropRef = useRef(false)
  const [role, setRole] = useState('')
  const [minScore, setMinScore] = useState('90')
  const [location, setLocation] = useState('')
  const [radiusMiles, setRadiusMiles] = useState('')
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyInApp, setNotifyInApp] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Role type-ahead — same real-careers-database search InterviewPackStart.tsx uses for job
  // titles on the candidate side, so "Role" here isn't free text guessing at a taxonomy that
  // the matching engine's role comparison (RoleMatches in Features/Alerts/Endpoint.cs) then
  // has to fuzzy-match against loosely. Never blocks free text — picking a suggestion just
  // fills the field with a known-good title.
  const [roleSuggestions, setRoleSuggestions] = useState<Career[]>([])
  const [showRoleSuggestions, setShowRoleSuggestions] = useState(false)
  const [searchingRole, setSearchingRole] = useState(false)
  const roleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const roleRequestIdRef = useRef(0)

  const handleRoleChange = useCallback((value: string) => {
    setRole(value)
    if (roleDebounceRef.current) clearTimeout(roleDebounceRef.current)
    if (value.trim().length < 2) {
      roleRequestIdRef.current++
      setRoleSuggestions([])
      setShowRoleSuggestions(false)
      setSearchingRole(false)
      return
    }
    roleDebounceRef.current = setTimeout(async () => {
      const requestId = ++roleRequestIdRef.current
      setSearchingRole(true)
      setShowRoleSuggestions(true)
      const results = await searchCareers(value, 8)
      if (requestId !== roleRequestIdRef.current) return
      setSearchingRole(false)
      setRoleSuggestions(results)
      setShowRoleSuggestions(results.length > 0)
    }, 180)
  }, [])

  const selectRoleSuggestion = useCallback((c: Career) => {
    setRole(c.title)
    setShowRoleSuggestions(false)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!role.trim()) { setError('A role is required.'); return }
    setSaving(true)
    setError('')
    try {
      const alert = await alertsApi.create(token, {
        role: role.trim(),
        minScore: Number(minScore) || 0,
        location: location.trim() || undefined,
        radiusMiles: location.trim() && radiusMiles ? Number(radiusMiles) : undefined,
        notifyEmail,
        notifyInApp,
      })
      onCreated(alert)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to create alert.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      onMouseDown={e => { mouseDownOnBackdropRef.current = e.target === e.currentTarget }}
      onClick={e => { if (e.target === e.currentTarget && mouseDownOnBackdropRef.current) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>New talent alert</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><X size={16} /></button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, marginBottom: 18 }}>We'll notify you when a candidate's interview clears this bar.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Role">
            <div style={{ position: 'relative' }}>
              <input
                type="text" autoComplete="off" value={role}
                onChange={e => handleRoleChange(e.target.value)}
                onFocus={() => { if (roleSuggestions.length > 0) setShowRoleSuggestions(true) }}
                onBlur={() => setTimeout(() => setShowRoleSuggestions(false), 150)}
                placeholder="e.g. DevOps Lead"
                style={inputStyle}
              />
              {showRoleSuggestions && (searchingRole || roleSuggestions.length > 0) && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#0d0c1e', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 10, overflowY: 'auto', overflowX: 'hidden', maxHeight: 236, zIndex: 20, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                  {searchingRole ? (
                    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-3)' }}>
                      <Loader2 size={13} className="admin-spin" /> Searching…
                    </div>
                  ) : roleSuggestions.map(c => (
                    <div
                      key={c.id}
                      onMouseDown={() => selectRoleSuggestion(c)}
                      style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,142,247,0.1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.category}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="Minimum score">
            <input type="number" min={0} max={100} value={minScore} onChange={e => setMinScore(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Location">
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" autoComplete="off" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. London — optional" style={{ ...inputStyle, flex: 1 }} />
              <select
                value={radiusMiles}
                onChange={e => setRadiusMiles(e.target.value)}
                disabled={!location.trim()}
                style={{ ...inputStyle, width: 150, flexShrink: 0, cursor: location.trim() ? 'pointer' : 'not-allowed', opacity: location.trim() ? 1 : 0.5 }}
              >
                <option value="">Exact area</option>
                <option value="5">Within 5 miles</option>
                <option value="10">Within 10 miles</option>
                <option value="20">Within 20 miles</option>
                <option value="50">Within 50 miles</option>
                <option value="100">Within 100 miles</option>
              </select>
            </div>
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={notifyEmail} onChange={e => setNotifyEmail(e.target.checked)} /> Email me on match
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
            <input type="checkbox" checked={notifyInApp} onChange={e => setNotifyInApp(e.target.checked)} /> Show in Match History
          </label>

          {error && <div style={{ fontSize: 12, color: '#EF4444' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', background: 'var(--blue)', color: '#fff', border: 'none', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Creating…' : 'Create alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', caretColor: 'var(--blue)', width: '100%', boxSizing: 'border-box',
}
