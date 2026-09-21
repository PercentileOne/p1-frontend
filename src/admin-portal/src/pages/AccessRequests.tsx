import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, RefreshCw, Phone, Mail, Copy, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { accessRequestsApi, type AccessRequest, type RequestStatus, type PaymentLinkResult } from '../api/accessRequestsApi'

// Recruiter / employer "Request access" queue (Francis, 2026-09-21). The steps he approved: a request arrives -> he calls them ->
// "Create organisation & invite" makes the organisation and first account (set-password email) -> "Send payment link" emails a Stripe
// Checkout for the monthly fee -> the webhook flips the request to Paid. Long values wrap (no horizontal scrolling).
const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }
const input: React.CSSProperties = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', minWidth: 0 }
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
const primary: React.CSSProperties = { ...btn, background: 'linear-gradient(135deg,#34D399,#047857)', color: '#fff', border: 'none' }
const wrap: React.CSSProperties = { overflowWrap: 'anywhere' }
const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const STATUS_STYLE: Record<RequestStatus, { label: string; color: string }> = {
  new: { label: 'New', color: '#4F8EF7' },
  contacted: { label: 'Contacted', color: '#FBBF24' },
  approved: { label: 'Account created', color: '#A78BFA' },
  paid: { label: 'Paid', color: '#34D399' },
  declined: { label: 'Declined', color: '#94A3B8' },
}

const TABS: { key: 'all' | RequestStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'approved', label: 'Account created' },
  { key: 'paid', label: 'Paid' },
  { key: 'declined', label: 'Declined' },
]

export default function AccessRequests() {
  const { token } = useAuth()
  const [rows, setRows] = useState<AccessRequest[]>([])
  const [tab, setTab] = useState<'all' | RequestStatus>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try { setRows(await accessRequestsApi.list(token)) } catch (e) { setError((e as Error).message) } finally { setLoading(false) }
  }, [token])
  useEffect(() => { void load() }, [load])

  const count = (k: 'all' | RequestStatus) => k === 'all' ? rows.length : rows.filter(r => r.status === k).length
  const shown = tab === 'all' ? rows : rows.filter(r => r.status === tab)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Access requests</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Recruiters and employers asking for an account. Call them, then create their organisation and send the payment link.</p>
        </div>
        <button style={btn} onClick={() => void load()} disabled={loading}><RefreshCw size={13} className={loading ? 'admin-spin' : ''} /> Refresh</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ ...btn, ...(tab === t.key ? { background: 'rgba(79,142,247,0.16)', borderColor: 'rgba(79,142,247,0.5)', color: 'var(--text)' } : {}) }}>
            {t.label} · {count(t.key)}
          </button>
        ))}
      </div>

      {error && <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, ...wrap }}>{error}</div>}
      {notice && <div style={{ fontSize: 12, color: '#34D399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, ...wrap }}>{notice}</div>}

      {loading && rows.length === 0
        ? <div style={{ display: 'flex', gap: 8, color: 'var(--text-3)' }}><Loader2 size={16} className="admin-spin" /> Loading…</div>
        : shown.length === 0
          ? <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '24px 0' }}>Nothing here yet.</div>
          : <div style={{ display: 'grid', gap: 14 }}>
              {shown.map(r => <RequestCard key={r.id} r={r} token={token!} onChanged={msg => { setNotice(msg); void load() }} onError={setError} />)}
            </div>}
    </div>
  )
}

function RequestCard({ r, token, onChanged, onError }: { r: AccessRequest; token: string; onChanged: (msg: string) => void; onError: (m: string) => void }) {
  const st = STATUS_STYLE[r.status]
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState(r.notes ?? '')
  const [price, setPrice] = useState(String(r.quotedMonthlyGbp ?? r.defaultSeatFeeGbp))
  const [link, setLink] = useState<PaymentLinkResult | null>(null)
  const [copied, setCopied] = useState(false)

  async function run<T>(fn: () => Promise<T>, done: (x: T) => string) {
    setBusy(true)
    onError('')
    try { const x = await fn(); onChanged(done(x)) } catch (e) { onError((e as Error).message) } finally { setBusy(false) }
  }
  const perSeat = parseFloat(price) || 0
  const total = perSeat * r.seats

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, ...wrap }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{r.company}</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>
            {r.name} · <span style={{ textTransform: 'capitalize' }}>{r.type}</span> · {r.seats} seat{r.seats === 1 ? '' : 's'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: st.color, background: `${st.color}1f`, border: `1px solid ${st.color}55`, borderRadius: 99, padding: '3px 10px' }}>{st.label}</span>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{fmt(r.createdAt)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '12px 0', fontSize: 13 }}>
        <a href={`tel:${r.phone}`} style={{ color: '#34D399', textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center', ...wrap }}><Phone size={13} /> {r.phone}</a>
        <a href={`mailto:${r.email}`} style={{ color: '#4F8EF7', textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center', ...wrap }}><Mail size={13} /> {r.email}</a>
      </div>
      {r.message && <div style={{ fontSize: 13, color: 'var(--text-2)', background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', marginBottom: 12, ...wrap }}>{r.message}</div>}

      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes from your call…" style={{ ...input, width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button style={btn} disabled={busy || notes === (r.notes ?? '')} onClick={() => void run(() => accessRequestsApi.update(token, r.id, { notes }), () => 'Notes saved.')}>Save notes</button>
        {r.status === 'new' && (
          <button style={btn} disabled={busy} onClick={() => void run(() => accessRequestsApi.update(token, r.id, { status: 'contacted' }), () => `${r.company} marked as contacted.`)}>Mark contacted</button>
        )}
        {r.status !== 'declined' && r.status !== 'paid' && (
          <button style={{ ...btn, color: '#94A3B8' }} disabled={busy} onClick={() => window.confirm(`Decline ${r.company}?`) && void run(() => accessRequestsApi.update(token, r.id, { status: 'declined' }), () => `${r.company} declined.`)}>Decline</button>
        )}
        {r.status === 'declined' && (
          <button style={btn} disabled={busy} onClick={() => void run(() => accessRequestsApi.update(token, r.id, { status: 'new' }), () => `${r.company} reopened.`)}>Reopen</button>
        )}
      </div>

      {r.status !== 'declined' && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 14, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', minWidth: 96 }}>1 · Account</div>
            {r.organisationId
              ? <span style={{ fontSize: 13, color: '#A78BFA' }}>Organisation created · <Link to={`/organisations/${r.organisationId}`} style={{ color: '#A78BFA' }}>open it</Link></span>
              : (
                <button
                  style={primary}
                  disabled={busy}
                  onClick={() => window.confirm(`Create the organisation "${r.company}" and invite ${r.email}?\n\nThey'll get an email with a link to set their password.`)
                    && void run(() => accessRequestsApi.createAccount(token, r.id), x => `${r.company} created — invite sent to ${x.email}.`)}
                >
                  Create organisation &amp; invite
                </button>
              )}
          </div>

          {r.status !== 'paid' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', minWidth: 96 }}>2 · Payment</div>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>£</span>
              <input value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" style={{ ...input, width: 84 }} aria-label="Monthly price per seat in pounds" />
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>per seat / month × {r.seats} = <strong style={{ color: 'var(--text)' }}>£{total.toFixed(2)}</strong>/month</span>
              <button
                style={primary}
                disabled={busy || perSeat <= 0}
                onClick={() => window.confirm(`Email a payment link for £${total.toFixed(2)}/month to ${r.email}?`)
                  && void run(() => accessRequestsApi.paymentLink(token, r.id, perSeat), x => {
                    setLink(x)
                    return x.emailed ? `Payment link emailed to ${r.email}.` : `Payment link created, but the email failed — copy it below and send it yourself.`
                  })}
              >
                {r.paymentLinkSentAt ? 'Send a fresh payment link' : 'Send payment link'}
              </button>
            </div>
          )}
          {r.paymentLinkSentAt && r.status !== 'paid' && !link && (
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Last link sent {fmt(r.paymentLinkSentAt)} — links last 24 hours.</div>
          )}
          {link && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1, minWidth: 0, ...wrap }}>{link.url}</span>
              <button style={btn} onClick={() => { void navigator.clipboard.writeText(link.url); setCopied(true); setTimeout(() => setCopied(false), 1800) }}>
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
          )}
          {r.status === 'paid' && r.paidAt && <div style={{ fontSize: 13, color: '#34D399' }}>Paid {fmt(r.paidAt)} — active.</div>}
        </div>
      )}
    </div>
  )
}
