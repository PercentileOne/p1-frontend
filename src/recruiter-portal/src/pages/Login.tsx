import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ExplainLogo } from '../components/LogoMark'
import { useAuth } from '../context/AuthContext'

type Phase = 'idle' | 'sending' | 'sent' | 'demo'

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) { setError('Please enter a valid email address.'); return; }
    setError('')
    setPhase('sending')
    try {
      const res = await fetch('/api/auth-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error || 'Failed to send link.'); setPhase('idle'); return; }
      setPhase('sent')
    } catch {
      setError('Network error — please try again.')
      setPhase('idle')
    }
  }

  async function handleDemo() {
    setPhase('demo')
    try {
      const res = await fetch('/api/auth-demo', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        signIn(data.token, data.email, data.name)
        navigate('/dashboard')
      } else {
        setPhase('idle')
      }
    } catch {
      setPhase('idle')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'linear-gradient(135deg,#060a12 0%,#080d1a 50%,#0a0f1e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        .ex-input::placeholder { color: #2d3441 !important; font-weight: 300; }
        .ex-input:-webkit-autofill,
        .ex-input:-webkit-autofill:hover,
        .ex-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #111318 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #4F8EF7 !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <Orb style={{ width: 560, height: 560, top: '-14%', left: '-9%' }}  color="79,142,247" delay={0}  dur={18} />
      <Orb style={{ width: 380, height: 380, bottom: '-10%', right: '-8%' }} color="52,211,153" delay={5}  dur={22} />
      <Orb style={{ width: 260, height: 260, top: '42%', right: '16%' }}   color="79,142,247" delay={10} dur={26} />

      <div style={{
        position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)',
        width: 420, height: 420, borderRadius: '50%',
        background: 'radial-gradient(ellipse,rgba(79,142,247,0.11) 0%,transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 360,
        margin: '0 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>
        <ExplainLogo />

        <motion.div
          style={{ textAlign: 'center', marginTop: -8 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.7, ease: 'easeOut' }}
        >
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.04em', color: '#e8eaf0' }}>
            <span style={{ color: '#4F8EF7' }}>www.</span>Explain<span style={{ color: '#4F8EF7' }}>.global</span>
          </div>
        </motion.div>

        <motion.div
          style={{ textAlign: 'center', marginTop: -10 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9, duration: 0.8, ease: 'easeOut' }}
        >
          <div style={{ fontSize: 19, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
            Recruiter Portal
          </div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
            The platform that turns every interview<br />into data your competitors don't have.
          </div>
        </motion.div>

        <motion.div
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.032)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 24,
            padding: '28px 28px 24px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.7, ease: 'easeOut' }}
        >
          <AnimatePresence mode="wait">

            {phase === 'sent' ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '8px 0' }}
              >
                <div style={{ fontSize: 36, marginBottom: 16 }}>📬</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Check your inbox</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                  We sent a sign-in link to<br />
                  <span style={{ color: '#4F8EF7', fontWeight: 600 }}>{email}</span>
                </div>
                <div style={{ fontSize: 12, color: '#334155', marginTop: 16 }}>
                  Link expires in 15 minutes.
                </div>
                <button
                  onClick={() => { setPhase('idle'); setEmail('') }}
                  style={{
                    marginTop: 20, background: 'transparent', border: 'none',
                    color: '#475569', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                    textDecoration: 'underline',
                  }}
                >
                  Use a different email
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSend}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                  Sign in with your email
                </div>

                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 8,
                  background: '#111318', border: '1px solid rgba(148,163,184,0.12)',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
                }}>
                  <span style={{ fontSize: 13, color: '#4b5563', flexShrink: 0 }}>✉</span>
                  <input
                    type="email"
                    className="ex-input"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
                      color: '#cbd5e1', fontSize: 13, fontFamily: 'inherit', caretColor: '#4F8EF7',
                    }}
                  />
                </label>

                {error && (
                  <div style={{ fontSize: 11, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '7px 11px' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <motion.button
                    type="submit"
                    disabled={phase === 'sending' || phase === 'demo'}
                    style={{
                      width: '100%', height: 42, borderRadius: 10,
                      background: 'linear-gradient(135deg,#3b7ef7 0%,#4F8EF7 100%)',
                      boxShadow: '0 4px 24px rgba(79,142,247,0.35)',
                      border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      opacity: phase !== 'idle' ? 0.7 : 1,
                    }}
                    whileHover={{ boxShadow: '0 4px 32px rgba(79,142,247,0.55)' } as any}
                    whileTap={{ scale: 0.98 } as any}
                  >
                    {phase === 'sending' ? <Spinner /> : 'Send Magic Link →'}
                  </motion.button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{ fontSize: 10, color: '#334155' }}>or</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleDemo}
                    disabled={phase === 'sending' || phase === 'demo'}
                    style={{
                      width: '100%', height: 38, borderRadius: 10,
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
                      color: phase === 'demo' ? '#4F8EF7' : '#64748b', fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.2s, color 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                    whileHover={{ borderColor: 'rgba(255,255,255,0.14)', color: '#cbd5e1' } as any}
                    whileTap={{ scale: 0.98 } as any}
                  >
                    {phase === 'demo' ? <><Spinner /> Loading demo…</> : 'Continue as Demo User'}
                  </motion.button>
                </div>

                <p style={{ textAlign: 'center', fontSize: 10, color: '#334155', marginTop: 2, lineHeight: 1.5 }}>
                  No password needed · We'll email you a secure sign-in link
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      width: 13, height: 13, borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.25)',
      borderTopColor: '#fff', display: 'inline-block',
      animation: 'exSpin 0.7s linear infinite',
    }} />
  )
}

function Orb({ style, color, delay, dur }: { style: React.CSSProperties; color: string; delay: number; dur: number }) {
  return (
    <motion.div
      style={{
        position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(ellipse,rgba(${color},0.09) 0%,transparent 70%)`,
        filter: 'blur(40px)',
        ...style,
      }}
      animate={{ x: [0, 28, -18, 0], y: [0, -22, 16, 0] }}
      transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}
