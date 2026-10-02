import { useCallback, useEffect, useState } from 'react'
import { Copy, FileSearch, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cvAnalyzerApi } from '../api/cvAnalyzerApi'
import type { ApiError, CvAnalyzerReply, CvPlaceCount } from '../api/cvAnalyzerApi'

// "How many people have used the CV Analyzer, and where from?" (Francis, 2026-10-02). Counts start from the day this shipped. Nothing here
// holds CV content, names or emails from the analyses themselves — the only personal details on this page are from people who TICKED A BOX.

const RANGES = [7, 30, 90] as const

const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 22px' }
const h3: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }
const th: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)' }
const td: React.CSSProperties = { fontSize: 13, color: 'var(--text-2)', padding: '8px', borderBottom: '1px solid var(--border)' }

function placeLabel(p: CvPlaceCount): string {
  return [p.city, p.region && p.region !== p.city ? p.region : null, p.country].filter(Boolean).join(', ')
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function Tile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{ ...card, flex: '1 1 160px', minWidth: 150 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function CvAnalyzer() {
  const { token } = useAuth()
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<CvAnalyzerReply | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      setData(await cvAnalyzerApi.get(token, days))
    } catch (err) {
      setError((err as ApiError).error ?? 'Failed to load the CV Analyzer numbers.')
    } finally {
      setLoading(false)
    }
  }, [token, days])

  useEffect(() => { void load() }, [load])

  async function remove(id: string, email: string) {
    if (!token) return
    if (!window.confirm(`Remove ${email} from the email list? This deletes their address and name.`)) return
    try {
      await cvAnalyzerApi.removeOptIn(token, id)
      setData(d => (d ? { ...d, optIns: d.optIns.filter(o => o.id !== id) } : d))
    } catch (err) {
      setError((err as ApiError).error ?? 'Could not remove that address.')
    }
  }

  async function copyEmails() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.optIns.map(o => (o.name ? `${o.name} <${o.email}>` : o.email)).join(', '))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked — nothing to do */ }
  }

  const s = data?.summary
  const maxDay = Math.max(1, ...(s?.byDay.map(d => d.analyses) ?? [1]))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSearch size={20} /> CV Analyzer
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, maxWidth: 680 }}>
            How many CV analyses were run, by how many different people, and roughly where from (country and town are an IP-based guess, often wrong on mobile).
            Counted from 2 October 2026. Nothing here contains anyone's CV, name or email unless they ticked the box to join the email list.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {RANGES.map(r => (
            <button key={r} onClick={() => setDays(r)} style={{
              fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${days === r ? '#34D399' : 'var(--border)'}`, background: days === r ? 'rgba(52,211,153,0.12)' : 'var(--bg3)',
              color: days === r ? '#34D399' : 'var(--text-2)',
            }}>{r} days</button>
          ))}
          <button onClick={() => void load()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', cursor: loading ? 'default' : 'pointer' }}>
            <RefreshCw size={13} className={loading ? 'admin-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>{error}</div>
      )}

      {loading && !data ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>
          <Loader2 size={16} className="admin-spin" /> Loading…
        </div>
      ) : s ? (
        <>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
            <Tile label="Analyses" value={s.analyses} sub={`last ${s.days} days`} />
            <Tile label="Different people" value={s.visitors} sub="counted once each" />
            <Tile label="Signed in" value={s.signedInAnalyses} sub="candidate / recruiter accounts" />
            <Tile label="Not signed in" value={s.anonymousAnalyses} sub="mostly the public page" />
            <Tile label="On the email list" value={data?.optIns.length ?? 0} sub="ticked the box" />
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <div style={h3}>Analyses per day</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90 }}>
              {s.byDay.map(d => (
                <div key={d.day} title={`${d.day}: ${d.analyses} analyses, ${d.visitors} people`}
                  style={{ flex: 1, minWidth: 2, height: `${Math.max(d.analyses > 0 ? 6 : 1, (d.analyses / maxDay) * 100)}%`, background: d.analyses > 0 ? '#34D399' : 'var(--border)', borderRadius: 2 }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>
              <span>{s.byDay[0]?.day}</span><span>{s.byDay[s.byDay.length - 1]?.day}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div style={card}>
              <div style={h3}>Countries</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Country</th><th style={th}>Analyses</th><th style={th}>People</th></tr></thead>
                <tbody>
                  {s.byCountry.length === 0 && <tr><td style={td} colSpan={3}>Nothing yet.</td></tr>}
                  {s.byCountry.map(c => <tr key={c.country}><td style={{ ...td, color: 'var(--text)' }}>{c.country}</td><td style={td}>{c.analyses}</td><td style={td}>{c.visitors}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div style={card}>
              <div style={h3}>Towns (top 50)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Place</th><th style={th}>Analyses</th><th style={th}>People</th></tr></thead>
                <tbody>
                  {s.byTown.length === 0 && <tr><td style={td} colSpan={3}>Nothing yet.</td></tr>}
                  {s.byTown.map((p, i) => <tr key={i}><td style={{ ...td, color: 'var(--text)' }}>{placeLabel(p)}</td><td style={td}>{p.analyses}</td><td style={td}>{p.visitors}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div style={card}>
              <div style={h3}>Where they used it</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Page</th><th style={th}>Analyses</th></tr></thead>
                <tbody>
                  {s.bySource.length === 0 && <tr><td style={td} colSpan={2}>Nothing yet.</td></tr>}
                  {s.bySource.map(x => (
                    <tr key={x.source}>
                      <td style={{ ...td, color: 'var(--text)' }}>{{ marketing: 'Public page (marketing site)', candidate: 'Candidate portal', recruiter: 'Recruiter portal', other: 'Other' }[x.source] ?? x.source}</td>
                      <td style={td}>{x.analyses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
              <div style={{ ...h3, marginBottom: 0 }}>Email list — people who ticked the box</div>
              {data && data.optIns.length > 0 && (
                <button onClick={() => void copyEmails()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
                  <Copy size={12} /> {copied ? 'Copied ✓' : 'Copy all'}
                </button>
              )}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>
              Each person agreed to hear from us; the exact wording they agreed to is stored with them. Remove anyone who asks to come off.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Name</th><th style={th}>Email</th><th style={th}>Agreed</th><th style={th} /></tr></thead>
              <tbody>
                {data?.optIns.length === 0 && <tr><td style={td} colSpan={4}>No one yet.</td></tr>}
                {data?.optIns.map(o => (
                  <tr key={o.id}>
                    <td style={{ ...td, color: 'var(--text)' }}>{o.name ?? '—'}</td>
                    <td style={td}>{o.email}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }} title={o.consentText}>{formatWhen(o.consentedAt)}</td>
                    <td style={td}>
                      <button aria-label={`Remove ${o.email}`} title="Remove from the list" onClick={() => void remove(o.id, o.email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}
