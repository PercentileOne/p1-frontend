import { useCallback, useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { avatarProviderSettingsApi, type AvatarProviderResponse } from '../api/avatarProviderSettingsApi'

// Who draws the interviewer faces: Spatius, the only provider since HeyGen was retired on 2026-10-11. Two independent shares: the public "Try it live" demo,
// and FULL interviews / My Talks. Anyone outside a share gets the interviewer's photo and voice.

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit',
  background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)',
}
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }

export function AvatarProviderCard() {
  const { token } = useAuth()
  const [data, setData] = useState<AvatarProviderResponse | null>(null)
  const [percent, setPercent] = useState(100)
  const [fullPercent, setFullPercent] = useState(0)
  const [hr, setHr] = useState('')
  const [tech, setTech] = useState('')
  const [michelle, setMichelle] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    try {
      const r = await avatarProviderSettingsApi.get(token)
      setData(r)
      setPercent(r.setting.spatiusPercent); setFullPercent(r.setting.spatiusFullPercent ?? 0)
      setHr(r.setting.spatiusAvatarHr ?? ''); setTech(r.setting.spatiusAvatarTechnical ?? ''); setMichelle(r.setting.spatiusAvatarMichelle ?? '')
    } catch { setMsg({ ok: false, text: 'Could not load the avatar provider setting.' }) }
  }, [token])
  useEffect(() => { void load() }, [load])

  async function save() {
    if (!token) return
    setSaving(true); setMsg(null)
    try {
      await avatarProviderSettingsApi.update(token, {
        provider: 'spatius', spatiusPercent: percent, spatiusFullPercent: fullPercent, fallbackToHeygen: false,
        spatiusAvatarHr: hr.trim(), spatiusAvatarTechnical: tech.trim(), spatiusAvatarMichelle: michelle.trim(),
      })
      setMsg({ ok: true, text: 'Saved — takes effect on the next demo visitor and the next interview started.' })
      await load()
    } catch (e) { setMsg({ ok: false, text: (e as { error?: string }).error ?? 'Save failed.' }) }
    finally { setSaving(false) }
  }

  if (!data) return <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '20px 0' }}><Loader2 size={16} className="admin-spin" /> Loading…</div>

  const missingId = !tech.trim()

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', marginTop: 20 }}>
      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Avatar provider</p>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, marginBottom: 14, maxWidth: 680 }}>
        Spatius draws the interviewers' faces on the visitor's device (about 1c a minute). HeyGen was retired on 2026-10-11, so there is no automatic backup: if a face
        can't start, the person sees the interviewer's photo and hears their voice. To try faces yourself whatever the percentage, add <code>?force=spatius</code> to the
        interview-room address while signed in as admin.
      </p>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Share of FULL interviews that get Spatius: <b>{fullPercent}%</b> <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(0% = photo and voice only; needs all three avatar IDs below; rolled once per interview. Phones get faces too, after a tap)</span></label>
        <input type="range" min={0} max={100} value={fullPercent} onChange={e => setFullPercent(Number(e.target.value))} style={{ width: '100%' }} />
        {fullPercent > 0 && !(hr.trim() && tech.trim() && michelle.trim()) && <span style={{ fontSize: 11.5, color: '#f59e0b' }}>All three avatar IDs are needed below, or interviews stay on photo and voice.</span>}
      </div>

      <div>
        <label style={label}>Share of demo visitors who get Spatius: <b>{percent}%</b> <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(the rest get the interviewer's photo and voice)</span></label>
        <input type="range" min={0} max={100} value={percent} onChange={e => setPercent(Number(e.target.value))} style={{ width: '100%', marginBottom: 14 }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 6 }}>
          <div><label style={label}>Wayne (technical) — Spatius avatar ID <span style={{ color: '#f59e0b' }}>used by the demo</span></label><input value={tech} onChange={e => setTech(e.target.value)} style={field} placeholder="paste from your Spatius dashboard" /></div>
          <div><label style={label}>Amina (HR) — Spatius avatar ID</label><input value={hr} onChange={e => setHr(e.target.value)} style={field} placeholder="for full interviews" /></div>
          <div><label style={label}>Michelle (welcome) — Spatius avatar ID</label><input value={michelle} onChange={e => setMichelle(e.target.value)} style={field} placeholder="for full interviews" /></div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button onClick={() => void save()} disabled={saving || missingId}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 800, color: '#04120c', background: '#34D399', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: saving || missingId ? 'default' : 'pointer', opacity: saving || missingId ? 0.55 : 1 }}>
          <Save size={13} /> {saving ? 'Saving…' : 'Save'}
        </button>
        <span style={{ fontSize: 11.5, color: data.spatiusConfigured ? '#34D399' : '#f59e0b' }}>
          {data.spatiusConfigured ? '✓ Spatius account keys are set on the API' : '⚠ Spatius keys are not set on the API yet — nobody will see a live face until they are'}
        </span>
        {missingId && <span style={{ fontSize: 11.5, color: '#f59e0b' }}>Add Wayne's Spatius avatar ID to save.</span>}
        {msg && <span style={{ fontSize: 11.5, color: msg.ok ? '#34D399' : '#EF4444' }}>{msg.text}</span>}
      </div>
      {data.setting.updatedBy && <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 12 }}>Last changed {new Date(data.setting.updatedAt).toLocaleString('en-GB')}</p>}
    </div>
  )
}
