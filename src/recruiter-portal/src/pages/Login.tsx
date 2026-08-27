import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChairLogo } from '../components/LogoMark'
import { useAuth } from '../context/AuthContext'
import { authApi, type ApiError } from '../api/authApi'

type Phase = 'idle' | 'loading'

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setError('')
    setPhase('loading')
    try {
      const { token } = await authApi.login({ email: trimmed, password })
      await signIn(token)
      navigate('/dashboard')
    } catch (err) {
      const e = err as ApiError | Error
      setError('error' in e ? e.error : e.message || 'Sign in failed — please try again.')
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
        @keyframes exSpin { to { transform: rotate(360deg); } }
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
        <ChairLogo size={96} showText={false} />

        <motion.div
          style={{ textAlign: 'center', marginTop: -8 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: 'easeOut' }}
        >
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.04em', color: '#e8eaf0' }}>
            InterviewMe<span style={{ color: '#4F8EF7' }}>.global</span>
          </div>
        </motion.div>

        <motion.div
          style={{ textAlign: 'center', marginTop: -10 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.8, ease: 'easeOut' }}
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
          transition={{ delay: 0.75, duration: 0.7, ease: 'easeOut' }}
        >
          <AnimatePresence mode="wait">
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                Sign in to your account
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
                  style={{
                    flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
                    color: '#cbd5e1', fontSize: 13, fontFamily: 'inherit', caretColor: '#4F8EF7',
                  }}
                />
              </label>

              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 8,
                background: '#111318', border: '1px solid rgba(148,163,184,0.12)',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
              }}>
                <span style={{ fontSize: 13, color: '#4b5563', flexShrink: 0 }}>🔒</span>
                <input
                  type="password"
                  className="ex-input"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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

              <motion.button
                type="submit"
                disabled={phase === 'loading'}
                style={{
                  width: '100%', height: 42, borderRadius: 10,
                  background: 'linear-gradient(135deg,#3b7ef7 0%,#4F8EF7 100%)',
                  boxShadow: '0 4px 24px rgba(79,142,247,0.35)',
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.01em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: phase !== 'idle' ? 0.7 : 1, marginTop: 4,
                }}
                whileHover={{ boxShadow: '0 4px 32px rgba(79,142,247,0.55)' } as any}
                whileTap={{ scale: 0.98 } as any}
              >
                {phase === 'loading' ? <Spinner /> : 'Sign In →'}
              </motion.button>

              <p style={{ textAlign: 'center', fontSize: 12, color: '#334155', marginTop: 6 }}>
                New recruiter?{' '}
                <Link to="/register" style={{ color: '#4F8EF7', fontWeight: 600, textDecoration: 'none' }}>
                  Create an account
                </Link>
              </p>
            </motion.form>
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
