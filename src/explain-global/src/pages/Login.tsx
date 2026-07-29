import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { login, type UserRole, type AuthError } from '../lib/mockAuth';
import { MiniInterviewRoom } from '../components/MiniInterviewRoom';

const ROLES: { value: UserRole; label: string; description: string; icon: string }[] = [
  { value: 'Candidate', label: 'Candidate',  description: 'Practice interviews & track progress', icon: '🎯' },
  { value: 'Recruiter', label: 'Recruiter',  description: 'Manage candidates & interview packs',  icon: '🔍' },
  { value: 'Client',    label: 'Client',     description: 'Review talent & hiring pipelines',      icon: '🏢' },
];

const ROLE_ACCENT: Record<UserRole, string> = {
  Candidate: '#34D399',
  Recruiter: '#a78bfa',
  Client:    '#4F8EF7',
};

export default function Login() {
  const [role, setRole]         = useState<UserRole>('Candidate');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState('');

  const accent = ROLE_ACCENT[role];

  useEffect(() => { setError(null); }, [role, email, password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const result = await login(email.trim(), password, role);

      // Show redirect state before navigating
      setRedirecting(true);
      setRedirectTarget(result.redirectTo);

      // Brief pause so the user sees the success state, then redirect
      setTimeout(() => {
        window.location.href = result.redirectTo;
      }, 1800);

    } catch (err) {
      const authErr = err as AuthError;
      setError(authErr.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (redirecting) {
    return (
      <div style={{ minHeight: '100vh', background: '#05040f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg, ${accent}33, ${accent}11)`, border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
            ✓
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Signed in successfully</div>
          <div style={{ fontSize: 13, color: '#6060a0' }}>Taking you to your portal…</div>
          <div style={{ fontSize: 11, color: '#3a3a60', marginTop: 4 }}>{redirectTarget}</div>
        </motion.div>
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
          style={{ display: 'flex', gap: 6 }}
        >
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ scale: [0.8, 1.2, 0.8] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.2 }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#05040f', display: 'flex' }}>

      {/* Left panel — branding */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          flex: 1, display: 'none',
          flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px 56px',
          background: 'linear-gradient(160deg, #0d0b1e 0%, #080812 100%)',
          borderRight: '1px solid rgba(120,80,255,0.12)',
          position: 'relative', overflow: 'hidden',
        }}
        className="auth-left-panel"
      >
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(ellipse, ${accent}18 0%, transparent 70%)`, pointerEvents: 'none', transition: 'background 0.6s' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(79,142,247,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/assets/explain-logo.svg" width={36} height={36} alt="Explain" style={{ borderRadius: '50%' }} />
            <span style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.02em' }}>
              explain<span style={{ color: '#7b5cf5' }}>.global</span>
            </span>
          </Link>
        </div>

        {/* Central message */}
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={role} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: accent, marginBottom: 16 }}>
                ✦ {role.toUpperCase()} PORTAL
              </div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 20, letterSpacing: '-0.03em' }}>
                {role === 'Candidate' && <>Your next role<br /><span style={{ color: accent }}>starts here.</span></>}
                {role === 'Recruiter' && <>Place great<br /><span style={{ color: accent }}>candidates faster.</span></>}
                {role === 'Client'    && <>Build the team<br /><span style={{ color: accent }}>you deserve.</span></>}
              </h2>
              <p style={{ fontSize: 15, color: '#7070a0', lineHeight: 1.75 }}>
                {role === 'Candidate' && 'Practice with AI interviewers. Track your scores. See every gap. Land the role.'}
                {role === 'Recruiter' && 'Send candidates a prep link. Review scores before the real interview. Close faster.'}
                {role === 'Client'    && 'Commission interview packs. Review pre-screened candidates. Hire with confidence.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Mini interview room */}
          <div style={{ marginTop: 36 }}>
            <MiniInterviewRoom />
          </div>
        </div>

        {/* Footer */}
        <div style={{ fontSize: 11, color: '#3a3a60' }}>
          © 2026 Explain Global Ltd · All rights reserved
        </div>
      </motion.div>

      {/* Right panel — form */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 32px' }}
      >
        {/* Mobile logo */}
        <div style={{ marginBottom: 40 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/assets/explain-logo.svg" width={28} height={28} alt="Explain" style={{ borderRadius: '50%' }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '-0.02em' }}>
              explain<span style={{ color: '#7b5cf5' }}>.global</span>
            </span>
          </Link>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>Welcome back</h1>
        <p style={{ fontSize: 14, color: '#6060a0', marginBottom: 32 }}>
          Sign in to your account · <Link to="/register" style={{ color: accent, textDecoration: 'none', fontWeight: 600, transition: 'color 0.2s' }}>Create one instead</Link>
        </p>

        {/* Role selector */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#5050a0', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10, display: 'block' }}>Account type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {ROLES.map(r => {
              const active = role === r.value;
              const ac = ROLE_ACCENT[r.value];
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${active ? ac + '55' : 'rgba(255,255,255,0.08)'}`,
                    background: active ? `${ac}12` : 'rgba(255,255,255,0.03)',
                    transition: 'all 0.2s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{r.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? ac : '#6060a0' }}>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Email */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#5050a0', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.10)'}`,
                borderRadius: 10, padding: '12px 16px',
                fontSize: 14, color: '#fff',
                outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = accent + '66'}
              onBlur={e => e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.10)'}
            />
          </div>

          {/* Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#5050a0', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Password</label>
              <button type="button" style={{ background: 'none', border: 'none', fontSize: 12, color: accent, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                Forgot password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.10)'}`,
                  borderRadius: 10, padding: '12px 44px 12px 16px',
                  fontSize: 14, color: '#fff',
                  outline: 'none', transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = accent + '66'}
                onBlur={e => e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.10)'}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#5050a0' }}
              >
                {showPass ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', lineHeight: 1.5 }}>
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading || !email || !password}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{
              width: '100%', padding: '13px 24px',
              background: loading ? 'rgba(120,80,255,0.3)' : `linear-gradient(135deg, #7b5cf5, ${accent})`,
              border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 4,
              transition: 'background 0.3s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}
                />
                Signing in…
              </>
            ) : `Sign in as ${role}`}
          </motion.button>
        </form>

        {/* Demo credentials hint */}
        <div style={{ marginTop: 32, padding: '14px 16px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4a4a80', letterSpacing: '0.06em', marginBottom: 8 }}>DEMO CREDENTIALS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { role: 'Candidate', email: 'candidate@explain.global' },
              { role: 'Recruiter', email: 'recruiter@explain.global' },
              { role: 'Client',    email: 'client@explain.global' },
            ].map(d => (
              <div key={d.role} style={{ fontSize: 12, color: '#5050a0', display: 'flex', gap: 8 }}>
                <span style={{ color: ROLE_ACCENT[d.role as UserRole], fontWeight: 700, width: 70 }}>{d.role}</span>
                <span>{d.email} · demo1234</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#3a3a60', marginTop: 24 }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}>Register here</Link>
        </p>
      </motion.div>

      <style>{`
        @media (min-width: 900px) {
          .auth-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
