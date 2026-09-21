import { useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// "Where does each location service think this IP is?" (Francis, 2026-09-21) — for choosing between MaxMind, IPinfo and Geoapify on
// real visitor addresses. Leave the box empty to check the address you're browsing from right now.
const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'http://localhost:5000'
const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }

interface Guess { country: string | null; city: string | null; region: string | null; accuracyKm: number | null }
interface Result { ip: string; maxmind: Guess | null; ipinfo: Guess | null; geoapify: Guess | null }

const PROVIDERS: { key: 'maxmind' | 'ipinfo' | 'geoapify'; label: string; note: string }[] = [
  { key: 'maxmind', label: 'MaxMind (current)', note: 'Built-in database' },
  { key: 'geoapify', label: 'Geoapify', note: 'Needs Geo__GeoapifyKey' },
  { key: 'ipinfo', label: 'IPinfo', note: 'Needs Geo__IpInfoToken (city is a paid plan)' },
]

export default function LocationCheck() {
  const { token } = useAuth()
  const [ip, setIp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  async function check() {
    setBusy(true); setError('')
    try {
      const res = await fetch(`${EXPLAIN_API_BASE}/api/admin/geo-check${ip.trim() ? `?ip=${encodeURIComponent(ip.trim())}` : ''}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? res.statusText)
      }
      setResult(await res.json() as Result)
    } catch (e) { setError((e as Error).message || 'Could not check that address.'); setResult(null) }
    finally { setBusy(false) }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Location check</h1>
      <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, marginBottom: 20 }}>
        What each location service thinks an IP address is. Leave the box empty to check the address you are on right now.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <input
          value={ip} onChange={e => setIp(e.target.value)} onKeyDown={e => e.key === 'Enter' && void check()}
          placeholder="e.g. 81.2.69.142 (optional)"
          style={{ flex: '1 1 260px', minWidth: 0, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
        <button
          onClick={() => void check()} disabled={busy}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', color: 'var(--text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {busy ? <Loader2 size={14} className="admin-spin" /> : <MapPin size={14} />} {ip.trim() ? 'Check this IP' : 'Check my IP'}
        </button>
      </div>

      {error && <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>{error}</div>}

      {result && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, overflowWrap: 'anywhere' }}>Results for <strong style={{ color: 'var(--text)' }}>{result.ip}</strong></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {PROVIDERS.map(p => {
              const g = result[p.key]
              return (
                <div key={p.key} style={card}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{p.label}</div>
                  {g && (g.city || g.country) ? (
                    <>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '8px 0 4px', overflowWrap: 'anywhere' }}>{g.city ?? 'No city'}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{[g.region && g.region !== g.city ? g.region : null, g.country].filter(Boolean).join(', ')}</div>
                      {g.accuracyKm ? <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>Claims about ±{Math.round(g.accuracyKm * 0.621371)} mi</div> : null}
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-3)', margin: '10px 0 4px' }}>No answer — {p.note}</div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
