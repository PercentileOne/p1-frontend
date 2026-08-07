import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email.includes('@')) setSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060A12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 36, justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', background: '#060a12' }}>
            <img src="https://explain.global/images/mastermind-chair.png" alt="Explain" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            interview<span style={{ color: '#4F8EF7' }}>me</span><span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: 13 }}>.global</span>
          </span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '32px 28px' }}>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>📬</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Check your inbox</div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                We sent an access link to<br />
                <span style={{ color: '#4F8EF7', fontWeight: 600 }}>{email}</span>
              </div>
              <div style={{ fontSize: 12, color: '#334155', marginTop: 16 }}>Link expires in 15 minutes.</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Employer & Recruiter Access</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                  Search verified candidates by role. Watch real interviews. Send chat invitations. From <strong style={{ color: '#e2e8f0' }}>£599/month</strong>.
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Sign in with your work email</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#111318', border: '1px solid rgba(148,163,184,0.12)' }}>
                  <span style={{ fontSize: 13, color: '#4b5563' }}>✉</span>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#cbd5e1', fontSize: 13, fontFamily: 'inherit', caretColor: '#4F8EF7' }}
                  />
                </label>
                <button type="submit" style={{ height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#3b7ef7,#4F8EF7)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(79,142,247,0.3)' }}>
                  Send Access Link →
                </button>
              </form>

              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 12, color: '#334155', marginBottom: 12 }}>What you get with search access:</div>
                {[
                  'Search any role, seniority, or skill',
                  'Watch full scored interviews',
                  'See CV and candidate profile',
                  'Send direct Chat invitations',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b', marginBottom: 7 }}>
                    <span style={{ color: '#34D399', fontSize: 11 }}>✓</span> {item}
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 11, color: '#334155', marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>
                Not an employer? <a href="https://explain.global" style={{ color: '#4F8EF7', textDecoration: 'none' }}>Create your candidate profile →</a>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
