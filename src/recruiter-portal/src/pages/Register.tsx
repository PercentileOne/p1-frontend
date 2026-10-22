// Recruiter sign-up (Francis, 2026-10-22: "free for 3 months, and no Contact Me step"). A recruiter creates their own account here and
// is given the self-service recruiter tier: free for the first months, can send interview-prep links (a monthly allowance), and cannot
// see candidate data, send client gifts or introductions until an admin approves them. The server decides all of that; this page only
// collects the details and posts role "recruiter-lite" (any other recruiter role is refused by the backend).
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ChairLogo } from '../components/LogoMark'
import { authApi, type ApiError } from '../api/authApi'

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, fontSize: 14, color: '#F0F4FF', fontFamily: 'inherit',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none',
}
const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(240,244,255,0.6)', margin: '0 0 6px', textAlign: 'left' }

// The API wraps a failure as {"error": "..."}; the portal's client hands over the raw body text.
function messageOf(err: unknown): string {
  const raw = (err as ApiError)?.error ?? (err as Error)?.message ?? ''
  try { const j = JSON.parse(raw) as { error?: string }; if (j.error) return j.error } catch { /* plain text */ }
  return raw || 'Something went wrong. Please try again.'
}

export default function Register() {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!first.trim() || !last.trim()) { setError('Please enter your first and last name.'); return }
    if (!email.includes('@')) { setError('Please enter your work email address.'); return }
    if (password.length < 8) { setError('Your password needs at least 8 characters.'); return }
    if (!agree) { setError('Please confirm the box about who you send prep links to.'); return }
    setBusy(true)
    try {
      await authApi.register({ email: email.trim(), password, firstName: first.trim(), lastName: last.trim(), role: 'recruiter-lite', next: '/recruiter' })
      setDone(true)
    } catch (err) {
      const msg = messageOf(err)
      // A brand-new account is reported as a "failure" by the shared sign-up so that every client shows its message; it is really the success.
      if (/^account created/i.test(msg)) setDone(true)
      else setError(msg)
    } finally { setBusy(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box',
      background: 'linear-gradient(135deg,#060a12 0%,#080d1a 50%,#0a0f1c 100%)', fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}><ChairLogo size={72} showText={false} /></div>

        {done ? (
          <>
            <h1 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: '#F0F4FF' }}>Check your email</h1>
            <p style={{ margin: '0 0 22px', fontSize: 14, lineHeight: 1.7, color: 'rgba(240,244,255,0.65)' }}>
              We've sent a link to <strong style={{ color: '#F0F4FF' }}>{email.trim()}</strong>. Click it to confirm your address, then sign in. Your free months start from today.
            </p>
            <Link to="/login" style={{ display: 'block', padding: '14px 20px', borderRadius: 12, textDecoration: 'none', fontSize: 15, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#4F8EF7,#6366f1)' }}>Go to sign in →</Link>
          </>
        ) : (
          <>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#F0F4FF' }}>Create your free recruiter account</h1>
            <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.65, color: 'rgba(240,244,255,0.6)' }}>
              Free for your first 3 months. Send candidates a prep link with their interview and they rehearse it out loud, scored, before the day.
              Up to 10 prep links a month while it's free.
            </p>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}><label style={label} htmlFor="rf">First name</label><input id="rf" style={field} value={first} onChange={e => setFirst(e.target.value)} autoComplete="given-name" /></div>
                <div style={{ flex: 1, minWidth: 0 }}><label style={label} htmlFor="rl">Last name</label><input id="rl" style={field} value={last} onChange={e => setLast(e.target.value)} autoComplete="family-name" /></div>
              </div>
              <div><label style={label} htmlFor="re">Work email</label><input id="re" type="email" style={field} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
              <div>
                <label style={label} htmlFor="rp">Password (8 characters or more)</label>
                <div style={{ position: 'relative' }}>
                  <input id="rp" type={show ? 'text' : 'password'} style={{ ...field, paddingRight: 44 }} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                  <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(240,244,255,0.55)', cursor: 'pointer', padding: 6 }}>
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', textAlign: 'left', fontSize: 12.5, lineHeight: 1.55, color: 'rgba(240,244,255,0.65)', cursor: 'pointer' }}>
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
                <span>I'll only send prep links to people I'm genuinely arranging an interview for.</span>
              </label>
              {error && <div role="alert" style={{ fontSize: 13, color: '#F59E0B', textAlign: 'left' }}>{error}</div>}
              <button type="submit" disabled={busy} style={{
                padding: '14px 20px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700, color: '#fff', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
                background: 'linear-gradient(135deg,#4F8EF7,#6366f1)', boxShadow: '0 8px 24px rgba(79,142,247,0.3)',
              }}>{busy ? 'Creating…' : 'Create free account →'}</button>
            </form>
            <p style={{ margin: '18px 0 0', fontSize: 12, lineHeight: 1.6, color: 'rgba(240,244,255,0.42)' }}>
              Searching and contacting candidates, client gifts and introductions are switched on once we've approved your account. Ask for that after you sign in.
            </p>
            <p style={{ margin: '14px 0 0', fontSize: 13, color: 'rgba(240,244,255,0.45)' }}>
              Already have an account? <Link to="/login" style={{ color: '#4F8EF7', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
