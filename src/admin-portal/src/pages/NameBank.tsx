import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles, RefreshCw, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { nameBankSettingsApi, type NameBankSetting, type NameGreeting, type ApiError } from '../api/nameBankSettingsApi'

export default function NameBank() {
  const { token } = useAuth()
  const [setting, setSetting] = useState<NameBankSetting | null>(null)
  const [greetings, setGreetings] = useState<NameGreeting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [s, g] = await Promise.all([
        nameBankSettingsApi.get(token),
        nameBankSettingsApi.listGreetings(token),
      ])
      setSetting(s)
      setGreetings(g)
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load Name Bank data.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function toggle() {
    if (!token || !setting) return
    setSaving(true)
    setError('')
    try {
      setSetting(await nameBankSettingsApi.update(token, !setting.autoGenerateEnabled))
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to update the setting.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Name Bank</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, maxWidth: 640 }}>
            Auto-generates a personalised "Hi &lt;name&gt;, I'm James" video via D-ID the first time a new candidate name shows up, then reuses it forever. Off means every candidate gets the generic line — including names already cached.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
            color: 'var(--text-2)', background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 12px', cursor: loading ? 'default' : 'pointer', flexShrink: 0,
          }}
        >
          <RefreshCw size={13} className={loading ? 'admin-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && !setting ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
          <Loader2 size={16} className="admin-spin" /> Loading…
        </div>
      ) : setting ? (
        <>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={16} color={setting.autoGenerateEnabled ? '#34D399' : 'var(--text-3)'} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    Auto-generate personalised greetings
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {setting.autoGenerateEnabled ? 'On — new names trigger a real D-ID clip' : 'Off — everyone gets the generic line'}
                  </p>
                </div>
              </div>
              <InlineToggle checked={setting.autoGenerateEnabled} onChange={toggle} disabled={saving} />
            </div>
            {setting.updatedBy && (
              <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                Last changed {formatDate(setting.updatedAt)}
              </p>
            )}
          </div>

          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
            Cached & attempted greetings {greetings.length > 0 && `(${greetings.length})`}
          </h2>

          {greetings.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '48px 0', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 }}>
              <Sparkles size={22} strokeWidth={1.5} />
              Nothing generated yet.
            </div>
          ) : (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Speaker</th>
                    <th style={thStyle}>Difficulty</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Uses</th>
                    <th style={thStyle}>Attempts</th>
                    <th style={thStyle}>Generated</th>
                    <th style={thStyle}>Last used</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {greetings.map(g => (
                    <tr key={g.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{g.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{g.speaker}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>{g.difficulty}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusPill status={g.status} failureReason={g.failureReason} />
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 700 }}>{g.useCount}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>{g.attemptCount}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{formatDate(g.generatedAt)}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{g.lastUsedAt ? formatDate(g.lastUsedAt) : '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {g.status === 'ready' && g.videoUrl && (
                          <a href={g.videoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#4F8EF7', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            View clip
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function StatusPill({ status, failureReason }: { status: NameGreeting['status']; failureReason: string | null }) {
  const styleFor = {
    ready:   { color: '#34D399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  Icon: CheckCircle2, label: 'Ready' },
    pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  Icon: Clock,        label: 'Pending' },
    failed:  { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   Icon: XCircle,      label: 'Failed' },
  }[status]
  const { color, bg, border, Icon, label } = styleFor
  return (
    <span
      title={failureReason ?? undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 700, color, background: bg,
        border: `1px solid ${border}`, borderRadius: 7, padding: '3px 9px',
      }}
    >
      <Icon size={11} /> {label}
    </span>
  )
}

function InlineToggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      style={{
        width: 40, height: 22, borderRadius: 999, border: 'none', position: 'relative', flexShrink: 0,
        background: checked ? '#34D399' : 'var(--bg3)',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.15s',
        }}
      />
    </button>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--text-3)',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return 'never'
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
