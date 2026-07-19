import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ExplainLogo } from '../components/LogoMark'

const COMPANIES = [
  'Vallum Associates',
  'Hays Recruitment',
  'Michael Page',
  'Robert Half',
  'Reed Talent Solutions',
  'Adecco Group',
  'Other',
]

type Phase = 'idle' | 'loading' | 'success'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', company: '', username: '', password: '' })
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.company || !form.username || !form.password) {
      setError('Please complete all fields.')
      return
    }
    setError('')
    setPhase('loading')
    setTimeout(() => {
      setPhase('success')
      setTimeout(() => navigate('/dashboard'), 5000)
    }, 1100)
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
        .ex-select option { background: #111318; color: #cbd5e1; }
      `}</style>

      {/* Ambient orbs */}
      <Orb style={{ width: 560, height: 560, top: '-14%', left: '-9%' }}  color="79,142,247" delay={0}  dur={18} />
      <Orb style={{ width: 380, height: 380, bottom: '-10%', right: '-8%' }} color="52,211,153" delay={5}  dur={22} />
      <Orb style={{ width: 260, height: 260, top: '42%', right: '16%' }}   color="79,142,247" delay={10} dur={26} />

      {/* Radial glow behind logo */}
      <div style={{
        position: 'absolute', top: '12%', left: '50%', transform: 'translateX(-50%)',
        width: 420, height: 420, borderRadius: '50%',
        background: 'radial-gradient(ellipse,rgba(79,142,247,0.11) 0%,transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 360,
        margin: '0 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>

        {/* Logo */}
        <ExplainLogo />

        {/* Brand name */}
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

        {/* Tagline */}
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

        {/* Card */}
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
            display: 'flex', flexDirection: 'column', gap: 12,
          }}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.7, ease: 'easeOut' }}
          whileHover={{ y: -2, transition: { duration: 0.3 } } as any}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Company */}
            <FieldWrap>
              <span style={iconStyle}>🏢</span>
              <select
                className="ex-select ex-input"
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                style={{ ...inputBase, color: form.company ? '#cbd5e1' : '#3d4451', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}
              >
                <option value="" disabled>Select your company</option>
                {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span style={{ color: '#4b5563', fontSize: 10, pointerEvents: 'none', marginLeft: 'auto' }}>▾</span>
            </FieldWrap>

            {/* Email */}
            <FieldWrap>
              <span style={iconStyle}>✉</span>
              <input
                type="email"
                className="ex-input"
                placeholder="Email address"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={inputBase}
              />
            </FieldWrap>

            {/* Username */}
            <FieldWrap>
              <span style={iconStyle}>👤</span>
              <input
                type="text"
                className="ex-input"
                placeholder="Username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                style={inputBase}
              />
            </FieldWrap>

            {/* Password */}
            <FieldWrap>
              <span style={iconStyle}>🔒</span>
              <input
                type="password"
                className="ex-input"
                placeholder="Password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={inputBase}
              />
            </FieldWrap>

            {error && (
              <div style={{ fontSize: 11, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '7px 11px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {/* Sign in */}
              <motion.button
                type="submit"
                disabled={phase !== 'idle'}
                style={{
                  width: '100%', height: 42, borderRadius: 10,
                  background: phase !== 'idle' ? 'rgba(79,142,247,0.5)' : 'linear-gradient(135deg,#3b7ef7 0%,#4F8EF7 100%)',
                  boxShadow: '0 4px 24px rgba(79,142,247,0.35)',
                  border: 'none', color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: phase !== 'idle' ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit', letterSpacing: '0.01em',
                  position: 'relative', overflow: 'hidden',
                }}
                whileHover={{ boxShadow: '0 4px 32px rgba(79,142,247,0.55)' } as any}
                whileTap={{ scale: 0.98 } as any}
              >
                {phase === 'loading' ? <Spinner /> : 'Sign In'}
                <motion.span
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 10,
                    background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)',
                  }}
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' } as any}
                  transition={{ duration: 0.6 }}
                />
              </motion.button>

              {/* Demo */}
              <motion.button
                type="button"
                onClick={() => {
                  setForm({ email: 'mike@vallum.co.uk', company: 'Vallum Associates', username: 'mafolabi', password: 'demo' })
                  setTimeout(() => handleSubmit({ preventDefault: () => {} } as any), 300)
                }}
                disabled={phase !== 'idle'}
                style={{
                  width: '100%', height: 38, borderRadius: 10,
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
                  color: '#64748b', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                whileHover={{ borderColor: 'rgba(255,255,255,0.14)', color: '#cbd5e1' } as any}
                whileTap={{ scale: 0.98 } as any}
              >
                Continue as Demo User
              </motion.button>
            </div>

            <p style={{ textAlign: 'center', fontSize: 10, color: '#334155', marginTop: 2 }}>
              By signing in you agree to Explain Terms &amp; Privacy Policy
            </p>
          </form>
        </motion.div>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {phase === 'success' && <SuccessOverlay company={form.company || 'Vallum Associates'} username={form.username || 'Mike'} />}
      </AnimatePresence>
    </div>
  )
}

/* ── SUCCESS OVERLAY ── */
function SuccessOverlay({ company, username }: { company: string; username: string }) {
  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
        background: 'rgba(6,10,18,0.96)', backdropFilter: 'blur(8px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <ExplainLogo size={100} withAnimation={false} />
        {/* Orbiting comet ring */}
        <motion.svg
          width={100} height={100} viewBox="0 0 100 100"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx={50} cy={50} r={43} fill="none"
            stroke="rgba(79,142,247,0.25)" strokeWidth="7"
            strokeLinecap="round" strokeDasharray="38 233"
          />
          <circle cx={50} cy={50} r={43} fill="none"
            stroke="rgba(99,179,255,0.92)" strokeWidth="2.5"
            strokeLinecap="round" strokeDasharray="20 251"
          />
        </motion.svg>
      </div>

      <motion.div
        style={{ textAlign: 'center' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>
          Welcome back, {username} —
        </p>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>
          Loading {company} portal…
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          {['Interview Packs', 'Candidates', 'Analytics'].map((label, i) => (
            <motion.div
              key={label}
              style={{
                fontSize: 10, color: '#4F8EF7',
                background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.2)',
                padding: '4px 10px', borderRadius: 20,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.3, duration: 0.4 }}
            >
              <motion.span
                style={{ width: 5, height: 5, borderRadius: '50%', background: '#4F8EF7', display: 'inline-block' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
              />
              {label}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── HELPERS ── */
function FieldWrap({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 8,
      background: '#111318', border: '1px solid rgba(148,163,184,0.12)',
      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
      transition: 'border-color 0.18s',
      cursor: 'text',
    }}>
      {children}
    </label>
  )
}

function Spinner() {
  return (
    <span style={{
      width: 15, height: 15, borderRadius: '50%',
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

const inputBase: React.CSSProperties = {
  flex: 1, minWidth: 0,
  background: 'transparent', border: 'none', outline: 'none',
  color: '#cbd5e1', fontSize: 13, fontWeight: 350,
  fontFamily: 'inherit', caretColor: '#4F8EF7',
  letterSpacing: '0.01em',
}

const iconStyle: React.CSSProperties = {
  fontSize: 13, color: '#4b5563', flexShrink: 0,
}
