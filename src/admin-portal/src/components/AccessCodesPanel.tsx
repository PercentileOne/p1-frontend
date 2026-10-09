import { Fragment, useCallback, useEffect, useState } from 'react'
import { Copy, Loader2, Plus } from 'lucide-react'

// Invite codes (2026-10-09): give someone a code (or a link that carries it) and they register with their own email and password and get free access. Redeeming a code adds the same
// "comp" access an admin could add by hand above, so it shows up in the Complimentary list too, and can be revoked there.
const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'http://localhost:5000'
const REGISTER_LINK = 'https://login.theinterviewchair.com/register?code='

interface Redemption { email: string; at: string }
interface AccessCode {
  id: string; label: string; active: boolean; maxUses: number | null; uses: number; expiresAt: string | null; grantDays: number | null
  createdAt: string; createdBy: string; redemptions: Redemption[]
}

const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }
const input: React.CSSProperties = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

async function call<T>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let message = res.statusText
    try { const j = await res.json() as { error?: string }; message = j.error ?? message } catch { /* not JSON */ }
    throw new Error(message || `Request failed (${res.status})`)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : {}) as T
}

export function AccessCodesPanel({ token }: { token: string }) {
  const [codes, setCodes] = useState<AccessCode[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [form, setForm] = useState({ label: '', code: '', maxUses: '', expires: '', grantDays: '' })

  const load = useCallback(async () => {
    try { setCodes(await call<AccessCode[]>(token, '/api/admin/access-codes')) }
    catch (e) { setError((e as Error).message) }
  }, [token])
  useEffect(() => { void load() }, [load])

  const body = (c: { label: string; code?: string; maxUses: string; expires: string; grantDays: string }, active?: boolean) => ({
    code: c.code?.trim() || null, label: c.label.trim(), active,
    maxUses: c.maxUses.trim() ? Number(c.maxUses) : null,
    expiresAt: c.expires ? new Date(`${c.expires}T23:59:59`).toISOString() : null,
    grantDays: c.grantDays.trim() ? Number(c.grantDays) : null,
  })

  async function create() {
    setBusy(true); setError(''); setNotice('')
    try {
      const made = await call<AccessCode>(token, '/api/admin/access-codes', 'POST', body(form))
      setForm({ label: '', code: '', maxUses: '', expires: '', grantDays: '' })
      setNotice(`Code ${made.id} created.`)
      await load()
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  async function toggle(c: AccessCode) {
    setBusy(true); setError(''); setNotice('')
    try {
      await call(token, `/api/admin/access-codes/${encodeURIComponent(c.id)}`, 'PUT', body({
        label: c.label, maxUses: c.maxUses?.toString() ?? '', grantDays: c.grantDays?.toString() ?? '', expires: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      }, !c.active))
      await load()
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  function copy(text: string, what: string) {
    void navigator.clipboard?.writeText(text).then(() => setNotice(`${what} copied.`)).catch(() => setNotice(text))
  }

  return (
    <div>
      <div style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 12px 2px', lineHeight: 1.55, maxWidth: 760 }}>
        Give someone an invite code, or the link below that carries it. They register with <b>their own email and password</b> and get free access straight away. A code only works for new
        candidate accounts. Recruiters and employers are still set up by you (use the Access list above for them). Switching a code off stops new sign-ups with it; people who already
        used it keep their access until you revoke it in the Complimentary list.
      </div>

      <div style={{ ...card, marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ fontSize: 12, color: 'var(--text-2)', flex: '1 1 200px' }}>Who is it for? (a name for you)<br />
          <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Chinaza, marketing" style={{ ...input, width: '100%', marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, color: 'var(--text-2)', width: 150 }}>Code (blank = make one)<br />
          <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="XYZ123" maxLength={24} style={{ ...input, width: '100%', marginTop: 4, fontFamily: 'ui-monospace, monospace' }} /></label>
        <label style={{ fontSize: 12, color: 'var(--text-2)', width: 120 }}>How many people<br />
          <input type="number" min={1} value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="no limit" style={{ ...input, width: '100%', marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, color: 'var(--text-2)', width: 150 }}>Code stops working on<br />
          <input type="date" value={form.expires} onChange={e => setForm(f => ({ ...f, expires: e.target.value }))} style={{ ...input, width: '100%', marginTop: 4 }} /></label>
        <label style={{ fontSize: 12, color: 'var(--text-2)', width: 150 }}>Free access lasts (days)<br />
          <input type="number" min={1} value={form.grantDays} onChange={e => setForm(f => ({ ...f, grantDays: e.target.value }))} placeholder="no end" style={{ ...input, width: '100%', marginTop: 4 }} /></label>
        <button style={{ ...btn, background: '#34D399', color: '#04120c', border: 'none', padding: '10px 16px' }} disabled={busy || form.label.trim().length < 2} onClick={() => void create()}><Plus size={14} /> Create code</button>
      </div>

      {error && <div style={{ color: '#EF4444', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
      {notice && <div style={{ color: '#34D399', fontSize: 12.5, marginBottom: 10 }}>{notice}</div>}
      {!codes && !error && <div style={{ display: 'flex', gap: 8, color: 'var(--text-3)', fontSize: 13 }}><Loader2 size={16} className="admin-spin" /> Loading…</div>}

      {codes && (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {codes.length === 0 ? <div style={{ padding: 20, fontSize: 13, color: 'var(--text-3)' }}>No codes yet.</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Code', 'For', 'Used', 'Code ends', 'Free access', 'Status', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {codes.map(c => (
                  <Fragment key={c.id}>
                    <tr style={{ borderTop: '1px solid var(--border)', opacity: c.active ? 1 : 0.55 }}>
                      <td style={{ padding: '10px 16px', fontFamily: 'ui-monospace, monospace', fontWeight: 800, color: 'var(--text)' }}>{c.id}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-2)' }}>{c.label}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-2)' }}>{c.uses}{c.maxUses ? ` of ${c.maxUses}` : ''}
                        {c.redemptions.length > 0 && <button style={{ ...btn, marginLeft: 8, padding: '3px 8px', fontSize: 11 }} onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? 'Hide' : 'Who'}</button>}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-3)' }}>{day(c.expiresAt)}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-3)' }}>{c.grantDays ? `${c.grantDays} days` : 'no end'}</td>
                      <td style={{ padding: '10px 16px', color: c.active ? '#34D399' : 'var(--text-3)', fontWeight: 700 }}>{c.active ? 'On' : 'Off'}</td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <button style={btn} onClick={() => copy(`${REGISTER_LINK}${c.id}`, 'Link')}><Copy size={12} /> Copy link</button>{' '}
                        <button style={btn} onClick={() => copy(c.id, 'Code')}>Copy code</button>{' '}
                        <button style={btn} disabled={busy} onClick={() => void toggle(c)}>{c.active ? 'Switch off' : 'Switch on'}</button>
                      </td>
                    </tr>
                    {open === c.id && (
                      <tr><td colSpan={7} style={{ padding: '8px 16px 14px', fontSize: 12.5, color: 'var(--text-2)', background: 'var(--bg3)' }}>
                        {c.redemptions.map(r => <div key={r.email + r.at}>{r.email} <span style={{ color: 'var(--text-3)' }}>· {day(r.at)}</span></div>)}
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
