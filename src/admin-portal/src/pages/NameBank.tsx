import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { nameBankSettingsApi, type NameBankSetting, type ApiError } from '../api/nameBankSettingsApi'

export default function NameBank() {
  const { token } = useAuth()
  const [setting, setSetting] = useState<NameBankSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      setSetting(await nameBankSettingsApi.get(token))
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load Name Bank settings.')
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
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Name Bank</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
          Auto-generates a personalised "Hi &lt;name&gt;, I'm James" video via D-ID the first time a new candidate name shows up, then reuses it forever. Off means every candidate gets the generic line — including names already cached.
        </p>
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
      ) : setting ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
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
      ) : null}
    </div>
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

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return 'never'
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
