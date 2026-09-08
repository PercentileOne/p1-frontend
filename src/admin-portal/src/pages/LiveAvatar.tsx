import { useCallback, useEffect, useState } from 'react'
import { Loader2, Radio, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { liveAvatarSettingsApi, type LiveAvatarSetting, type ApiError } from '../api/liveAvatarSettingsApi'

export default function LiveAvatar() {
  const { token } = useAuth()
  const [setting, setSetting] = useState<LiveAvatarSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      setSetting(await liveAvatarSettingsApi.get(token))
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load the LiveAvatar setting.')
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
      setSetting(await liveAvatarSettingsApi.update(token, !setting.enabled))
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Live Avatar</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, maxWidth: 640 }}>
            The kill switch for HeyGen LiveAvatar — Amina (HR) and Wayne (technical) both run as
            real-time video avatars in the candidate interview room. Off means every interview
            falls back instantly to its pre-LiveAvatar path (static photo + ElevenLabs voice),
            no redeploy needed — use this if HeyGen usage or cost needs a fast circuit breaker.
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
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Radio size={16} color={setting.enabled ? '#34D399' : 'var(--text-3)'} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  Live avatars in the interview room
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {setting.enabled ? 'On — Amina and Wayne appear as real-time video' : 'Off — static photo + voice only, everywhere'}
                </p>
              </div>
            </div>
            <InlineToggle checked={setting.enabled} onChange={toggle} disabled={saving} />
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
