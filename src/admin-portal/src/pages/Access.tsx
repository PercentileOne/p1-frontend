import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck, ShieldOff, UserPlus, Trash2, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { accessApi, type AccessOverview, type AccessGrant, type UsageRow, type ApiError } from '../api/accessApi'

// Who gets in free, how many interviews people get, and the master switch (Francis, 2026-09-21). Nothing here blocks anyone until
// "Enforcement" is switched ON — until then the system only RECORDS, and this page shows who WOULD have been turned away.
const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }
const input: React.CSSProperties = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
const danger: React.CSSProperties = { ...btn, color: '#EF4444', borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }
const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

type Tab = 'staff' | 'free' | 'usage'

export default function Access() {
  const { token } = useAuth()
  const [data, setData] = useState<AccessOverview | null>(null)
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [tab, setTab] = useState<Tab>('staff')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ email: '', kind: 'staff' as 'staff' | 'comp', reason: '' })
  const [caps, setCaps] = useState({ dailyCap: 3, monthlyCap: 10, tasterEnabled: true })

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError('')
    try {
      const [o, u] = await Promise.all([accessApi.overview(token), accessApi.usage(token)])
      setData(o); setUsage(u)
      setCaps({ dailyCap: o.settings.dailyCap, monthlyCap: o.settings.monthlyCap, tasterEnabled: o.settings.tasterEnabled })
    } catch (e) { setError((e as ApiError).error ?? 'Failed to load.') }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { void load() }, [load])

  async function run(fn: () => Promise<unknown>, done: string) {
    if (!token) return
    setBusy(true); setError(''); setNotice('')
    try { await fn(); setNotice(done); await load() }
    catch (e) { setError((e as ApiError).error ?? 'Something went wrong.') }
    finally { setBusy(false) }
  }

  if (loading && !data) return <div style={{ display: 'flex', gap: 8, color: 'var(--text-3)', padding: 24 }}><Loader2 size={16} className="admin-spin" /> Loading…</div>
  if (!data) return <div style={{ color: '#EF4444', padding: 24 }}>{error || 'Could not load.'}</div>

  const enforce = data.settings.enforce
  const active = (k: string) => data.grants.filter(g => g.kind === k && !g.revokedAt)
  const list: AccessGrant[] = tab === 'staff' ? active('staff') : [...active('comp'), ...active('complimentary')]

  function toggleEnforce() {
    const turningOn = !enforce
    const msg = turningOn
      ? `Turn enforcement ON?\n\nFrom now, people without a subscription, pass, staff or complimentary access will be stopped at "Start Interview" and shown the paywall (after their one free interview).\n\nHave you (1) created the Stripe price and (2) re-run "Grant complimentary to all current accounts"?`
      : 'Turn enforcement OFF? Everyone will be able to start interviews again (starts are still recorded).'
    if (!window.confirm(msg)) return
    void run(() => accessApi.saveSettings(token!, { ...data!.settings, enforce: turningOn }), `Enforcement is now ${turningOn ? 'ON' : 'OFF'}.`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Access</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Who can start interviews, how many, and who gets in free.</p>
        </div>
        <button style={btn} onClick={() => void load()} disabled={loading}><RefreshCw size={13} className={loading ? 'admin-spin' : ''} /> Refresh</button>
      </div>

      {error && <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>{error}</div>}
      {notice && <div style={{ fontSize: 12, color: '#34D399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>{notice}</div>}

      {/* Master switch */}
      <div style={{ ...card, marginBottom: 16, borderColor: enforce ? 'rgba(52,211,153,0.45)' : 'rgba(245,158,11,0.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {enforce ? <ShieldCheck size={28} color="#34D399" /> : <ShieldOff size={28} color="#F59E0B" />}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Enforcement is {enforce ? 'ON' : 'OFF'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.5 }}>
              {enforce
                ? 'People need a subscription, pass, staff or complimentary access (or their one free interview) to start an interview.'
                : 'Everyone can start interviews — starts are only recorded. Last 7 days: '}
              {!enforce && <strong style={{ color: 'var(--text-2)' }}>{data.last7Days.started} started, {data.last7Days.wouldHaveBeenBlocked} would have been turned away.</strong>}
            </div>
          </div>
          <button onClick={toggleEnforce} disabled={busy} style={enforce ? danger : { ...btn, color: '#34D399', borderColor: 'rgba(52,211,153,0.4)' }}>
            Turn enforcement {enforce ? 'OFF' : 'ON'}
          </button>
        </div>
      </div>

      {/* Numbers */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 12 }}>Limits &amp; free interview</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: 'var(--text-2)' }}>Interviews per day<br />
            <input type="number" min={0} max={100} value={caps.dailyCap} onChange={e => setCaps(c => ({ ...c, dailyCap: Number(e.target.value) }))} style={{ ...input, width: 100, marginTop: 4 }} /></label>
          <label style={{ fontSize: 12, color: 'var(--text-2)' }}>Interviews per month (subscribers)<br />
            <input type="number" min={0} max={1000} value={caps.monthlyCap} onChange={e => setCaps(c => ({ ...c, monthlyCap: Number(e.target.value) }))} style={{ ...input, width: 100, marginTop: 4 }} /></label>
          <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 9 }}>
            <input type="checkbox" checked={caps.tasterEnabled} onChange={e => setCaps(c => ({ ...c, tasterEnabled: e.target.checked }))} /> One free interview per email</label>
          <button style={btn} disabled={busy} onClick={() => void run(() => accessApi.saveSettings(token!, { enforce, ...caps }), 'Limits saved.')}>Save limits</button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-3)', margin: '-6px 0 16px 2px' }}>
        Interview passes (gifts &amp; one-off): <strong style={{ color: 'var(--text-2)' }}>{data.passes.paid} paid</strong> of {data.passes.total} created · {data.passes.sessionsRemaining} session(s) still to use.
      </div>

      {/* Free access lists */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {([['staff', `Staff (${data.counts.staff})`], ['free', `Complimentary & comps (${data.counts.complimentary + data.counts.comps})`], ['usage', 'Recent starts']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ ...btn, color: tab === t ? 'var(--blue)' : 'var(--text-3)', borderColor: tab === t ? 'var(--blue)' : 'var(--border)' }}>{label}</button>
        ))}
      </div>

      {tab !== 'usage' && (
        <>
          <div style={{ ...card, marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <UserPlus size={16} color="var(--text-3)" />
            <input placeholder="Email address" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ ...input, flex: '1 1 220px' }} />
            <select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value as 'staff' | 'comp' }))} style={input}>
              <option value="staff">Staff (unlimited)</option>
              <option value="comp">Comp (free, daily limit)</option>
            </select>
            <input placeholder="Reason (optional)" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ ...input, flex: '1 1 180px' }} />
            <button style={btn} disabled={busy || !form.email.trim()} onClick={() => void run(async () => { await accessApi.addGrant(token!, form); setForm(f => ({ ...f, email: '', reason: '' })) }, 'Access granted.')}>Add</button>
          </div>

          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {list.length === 0 ? <div style={{ padding: 20, fontSize: 13, color: 'var(--text-3)' }}>Nobody here yet.</div> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Email', 'Kind', 'Reason', 'Granted', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>)}
                </tr></thead>
                <tbody>{list.map(g => (
                  <tr key={g.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text)' }}>{g.email}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-2)' }}>{g.kind}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-3)' }}>{g.reason || '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{fmt(g.grantedAt)} · {g.grantedBy}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <button style={danger} disabled={busy} title="Revoke this access" onClick={() => window.confirm(`Revoke ${g.kind} access for ${g.email}?`) && void run(() => accessApi.revokeGrant(token!, g.id), 'Access revoked.')}><Trash2 size={12} /> Revoke</button>
                    </td>
                  </tr>))}</tbody>
              </table>
            )}
          </div>

          {tab === 'free' && (
            <div style={{ ...card, marginTop: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>
                Every account that existed when the paywall was built (<strong>{data.counts.totalAccounts}</strong> accounts now) was given complimentary access, so nobody already using the product is locked out.
                Re-run this just before switching enforcement on to include accounts created since; or revoke it all when you're ready for everyone to subscribe.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button style={btn} disabled={busy} onClick={() => void run(async () => { const r = await accessApi.grantAllExisting(token!); setNotice(`Granted complimentary access to ${r.granted} more account(s).`) }, '')}>Grant complimentary to all current accounts</button>
                <button style={danger} disabled={busy} onClick={() => window.confirm('Revoke ALL complimentary access? Those accounts will need a subscription, pass, or their one free interview. Staff and individual comps are not affected.') && void run(async () => { const r = await accessApi.revokeComplimentary(token!); setNotice(`Revoked complimentary access for ${r.revoked} account(s).`) }, '')}>Revoke ALL complimentary access</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'usage' && (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {usage.length === 0 ? <div style={{ padding: 20, fontSize: 13, color: 'var(--text-3)' }}>No interviews started since tracking began.</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['When', 'Account', 'Counted as', 'Would have been blocked'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>)}
              </tr></thead>
              <tbody>{usage.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', opacity: u.voidedAt ? 0.45 : 1 }}>
                  <td style={{ padding: '10px 16px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{fmt(u.startedAt)}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text)' }}>{u.email}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-2)' }}>{u.source}</td>
                  <td style={{ padding: '10px 16px', color: u.wouldBlock ? '#F59E0B' : 'var(--text-3)' }}>{u.wouldBlock ? 'Yes' : '—'}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
