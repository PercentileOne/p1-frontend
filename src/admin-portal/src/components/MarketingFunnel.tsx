import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { eventsApi, type FunnelResponse, type FunnelReply, type ApiError } from '../api/eventsApi'

// "What do visitors actually do?" (Francis, 2026-09-26: lots of visits from GA4, no sign-ups — was it people or bots, and where do
// the real ones stop?). Sits above the Activity Log. Numbers are per VISIT (one browser tab), from the last few days of marketing-site
// events (Cosmos keeps 10). "Real visitors" = visits where the page saw a genuine click/tap/key/scroll/mouse movement — crawlers that
// just load the page never do, so `visits − real` is the bot/no-interaction share. See src/viewme/public/track.js.

const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }
const h3: React.CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }
const selectStyle: React.CSSProperties = {
  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px',
  color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
}
const chip: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: 99, padding: '5px 11px', cursor: 'pointer', fontFamily: 'inherit',
}
const th: React.CSSProperties = { textAlign: 'left', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '4px 8px 6px 0' }
const td: React.CSSProperties = { fontSize: 12.5, color: 'var(--text-2)', padding: '5px 8px 5px 0', borderTop: '1px solid var(--border)' }

const RAW_EVENT_TYPES = ['page_view', 'interaction', 'menu_click', 'cta_click', 'link_click', 'section_view', 'scroll_depth', 'try_submit', 'modal_open', 'page_leave']

const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '—')

export function MarketingFunnel({ onBrowse }: { onBrowse: (eventType: string) => void }) {
  const { token } = useAuth()
  const [days, setDays] = useState(7)
  const [data, setData] = useState<FunnelResponse | null>(null)
  const [excluded, setExcluded] = useState<{ ips: string[]; visits: number }>({ ips: [], visits: 0 })
  const [yourIp, setYourIp] = useState<string | null>(null)
  const [ipText, setIpText] = useState('')
  const [ipMsg, setIpMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError('')
    try {
      const r: FunnelReply = await eventsApi.funnel(token, days)
      setData(r.funnel); setExcluded({ ips: r.ignoredIps, visits: r.excludedVisits }); setIpText(r.ignoredIps.join(', '))
    }
    catch (err) { setError((err as ApiError).error ?? 'Failed to load the visitor funnel.') }
    finally { setLoading(false) }
  }, [token, days])
  useEffect(() => { void load() }, [load])
  useEffect(() => { if (token) eventsApi.getIgnoredIps(token).then(r => setYourIp(r.yourIp)).catch(() => { /* the button just won't offer the current address */ }) }, [token])

  async function saveIps(list: string[]) {
    if (!token) return
    setIpMsg('')
    try {
      const r = await eventsApi.setIgnoredIps(token, list)
      setIpText(r.ips.join(', ')); setIpMsg(r.ips.length ? 'Saved — your visits from these addresses are now left out.' : 'Saved — no addresses are being ignored.')
      await load()
    } catch (err) { setIpMsg((err as ApiError).error ?? 'Could not save.') }
  }
  const parsedIps = () => ipText.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean)

  const visits = data?.steps.find(s => s.key === 'visits')?.sessions ?? 0
  const real = data?.steps.find(s => s.key === 'human')?.sessions ?? 0

  return (
    <div style={{ ...card, marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Visitor funnel — marketing site</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            What visitors do, and how many are real people. A "real" visitor is one who clicked, tapped, scrolled or moved a mouse; crawlers that only load the page are not counted.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={days} onChange={e => setDays(Number(e.target.value))} style={selectStyle}>
            {[1, 3, 7, 10].map(d => <option key={d} value={d}>Last {d} day{d === 1 ? '' : 's'}</option>)}
          </select>
          <button onClick={() => void load()} disabled={loading} style={{ ...selectStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? <Loader2 size={13} className="admin-spin" /> : <RefreshCw size={13} />} Refresh
          </button>
        </div>
      </div>

      {error && <div style={{ fontSize: 12, color: '#EF4444' }}>{error}</div>}

      {data && (
        <>
          {/* The funnel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {data.steps.map((s, i) => (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text)' }}>{s.label}</span>
                  <span style={{ color: 'var(--text-2)', fontWeight: 700 }}>
                    {s.sessions.toLocaleString()}
                    {i > 1 && <span style={{ color: 'var(--text-3)', fontWeight: 500 }}> · {pct(s.sessions, real)} of real visitors</span>}
                    {i === 1 && <span style={{ color: 'var(--text-3)', fontWeight: 500 }}> · {pct(s.sessions, visits)} of visits</span>}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${visits > 0 ? Math.max(2, (s.sessions / visits) * 100) : 0}%`, background: i === 0 ? '#64748B' : 'linear-gradient(90deg,#34D399,#047857)', borderRadius: 4 }} />
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {visits - real > 0 && <>{(visits - real).toLocaleString()} of {visits.toLocaleString()} visits ({pct(visits - real, visits)}) never did anything a person does — most likely crawlers/bots. </>}
              {data.medianSecondsOnPage !== null && <>Real visitors' typical time on a page: {Math.round(data.medianSecondsOnPage)}s.</>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div>
              <div style={h3}>Phone vs desktop</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Device</th><th style={th}>Visits</th><th style={th}>Real</th><th style={th}>Tried it</th></tr></thead>
                <tbody>{data.devices.map(d => (
                  <tr key={d.device}><td style={{ ...td, textTransform: 'capitalize', color: 'var(--text)' }}>{d.device}</td><td style={td}>{d.visits}</td><td style={td}>{d.real}</td><td style={td}>{d.tried}</td></tr>
                ))}</tbody>
              </table>
            </div>

            <div>
              <div style={h3}>Where visitors came from</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Source</th><th style={th}>Visits</th><th style={th}>Real</th></tr></thead>
                <tbody>{data.sources.length === 0 && <tr><td style={td} colSpan={3}>No data yet</td></tr>}
                  {data.sources.map(s => (
                    <tr key={s.source}><td style={{ ...td, color: 'var(--text)', overflowWrap: 'anywhere' }}>{s.source}</td><td style={td}>{s.visits}</td><td style={td}>{s.real}</td></tr>
                  ))}</tbody>
              </table>
            </div>

            <div>
              <div style={h3}>"Try it live" page (candidate app)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td style={td}>Visits to /try</td><td style={td}>{data.tryPage.visits}</td></tr>
                  <tr><td style={td}>…of which opened on a phone/tablet</td><td style={td}>{data.tryPage.phoneVisits}</td></tr>
                  <tr><td style={td}>Started (typed a role)</td><td style={td}>{data.tryPage.started} <span style={{ color: 'var(--text-3)' }}>({data.tryPage.startedOnPhone} on a phone)</span></td></tr>
                  <tr><td style={td}>Heard the first question</td><td style={td}>{data.tryPage.firstQuestion}</td></tr>
                  <tr><td style={td}>Finished and got a score</td><td style={td}>{data.tryPage.completed} <span style={{ color: 'var(--text-3)' }}>({data.tryPage.completedOnPhone} on a phone)</span></td></tr>
                  <tr><td style={td}>Hit an error / limit</td><td style={td}>{data.tryPage.blocked}</td></tr>
                </tbody>
              </table>
            </div>

            <div>
              <div style={h3}>Sections real visitors reached</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Section</th><th style={th}>Visitors</th></tr></thead>
                <tbody>{data.sections.length === 0 && <tr><td style={td} colSpan={2}>No data yet</td></tr>}
                  {data.sections.map(s => <tr key={s.section}><td style={{ ...td, color: 'var(--text)' }}>{s.section}</td><td style={td}>{s.visitors}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={h3}>What real visitors clicked (different people, not raw clicks)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Clicked</th><th style={th}>Where</th><th style={th}>Goes to</th><th style={th}>Visitors</th></tr></thead>
              <tbody>{data.topClicks.length === 0 && <tr><td style={td} colSpan={4}>No clicks recorded yet — real visitors are only counted from now on.</td></tr>}
                {data.topClicks.map((c, i) => (
                  <tr key={i}>
                    <td style={{ ...td, color: 'var(--text)', overflowWrap: 'anywhere' }}>{c.label || '(unlabelled)'}</td>
                    <td style={td}>{c.area}</td>
                    <td style={{ ...td, overflowWrap: 'anywhere', color: 'var(--text-3)' }}>{c.href || '—'}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{c.visitors}</td>
                  </tr>
                ))}</tbody>
            </table>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={h3}>Ignore my own visits</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
              Visits from these IP addresses are left out of every number above — past and future. Add your home, your dialysis unit, anywhere you test from.
              Addresses can change (especially on a phone), so also open the site once with <code>?notrack=1</code> on each device.
              {excluded.visits > 0 && <> <strong style={{ color: 'var(--text-2)' }}>{excluded.visits} visit{excluded.visits === 1 ? '' : 's'}</strong> currently left out.</>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input value={ipText} onChange={e => setIpText(e.target.value)} placeholder="e.g. 37.209.211.222, 81.2.3.4" autoComplete="off"
                style={{ ...selectStyle, flex: '1 1 280px', minWidth: 0, cursor: 'text' }} />
              <button style={selectStyle} onClick={() => void saveIps(parsedIps())}>Save</button>
              {yourIp && !parsedIps().includes(yourIp) && (
                <button style={selectStyle} onClick={() => void saveIps([...parsedIps(), yourIp])}>Add my current address ({yourIp})</button>
              )}
            </div>
            {ipMsg && <div style={{ fontSize: 12, color: ipMsg.startsWith('Saved') ? '#34D399' : '#EF4444', marginTop: 6 }}>{ipMsg}</div>}
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={h3}>Browse the raw events</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {RAW_EVENT_TYPES.map(t => <button key={t} style={chip} onClick={() => onBrowse(t)}>{t}</button>)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
