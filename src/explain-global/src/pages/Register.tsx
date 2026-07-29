import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { register, type UserRole, type AuthError } from '../lib/mockAuth';

const ROLES: { value: UserRole; label: string; description: string; icon: string; needsCompany: boolean }[] = [
  { value: 'Candidate', label: 'Candidate',  description: 'Practice interviews & track your progress', icon: '🎯', needsCompany: false },
  { value: 'Recruiter', label: 'Recruiter',  description: 'Send prep links & review candidate scores',  icon: '🔍', needsCompany: true  },
  { value: 'Client',    label: 'Client',     description: 'Assess talent & manage hiring pipelines',    icon: '🏢', needsCompany: true  },
];

const ROLE_ACCENT: Record<UserRole, string> = {
  Candidate: '#34D399',
  Recruiter: '#a78bfa',
  Client:    '#4F8EF7',
};

export default function Register() {
  const [role, setRole]             = useState<UserRole>('Candidate');
  const [fullName, setFullName]     = useState('');
  const [email, setEmail]           = useState('');
  const [company, setCompany]       = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState('');

  const accent = ROLE_ACCENT[role];
  const needsCompany = ROLES.find(r => r.value === role)?.needsCompany ?? false;

  useEffect(() => { setError(null); }, [role, email, password, fullName]);

  function passwordStrength(p: string): { score: number; label: string; color: string } {
    if (!p) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (p.length >= 8)  score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { score, label: 'Weak',   color: '#EF4444' };
    if (score <= 3) return { score, label: 'Fair',   color: '#F59E0B' };
    return              { score, label: 'Strong', color: '#34D399' };
  }

  const strength = passwordStrength(password);
  const passwordMismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    if (needsCompany && !company.trim()) { setError(`Please enter your ${role === 'Recruiter' ? 'recruitment firm' : 'company'} name.`); return; }

    setLoading(true);
    setError(null);

    try {
      const result = await register(email.trim(), password, role, fullName.trim(), needsCompany ? company.trim() : null);
      setRedirecting(true);
      setRedirectTarget(result.redirectTo);
      setTimeout(() => { window.location.href = result.redirectTo; }, 1800);
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
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg, ${accent}33, ${accent}11)`, border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>✓</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Account created!</div>
          <div style={{ fontSize: 13, color: '#6060a0' }}>Setting up your portal…</div>
          <div style={{ fontSize: 11, color: '#3a3a60', marginTop: 4 }}>{redirectTarget}</div>
        </motion.div>
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4 }} style={{ display: 'flex', gap: 6 }}>
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

      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px 56px',
          background: 'linear-gradient(160deg, #0d0b1e 0%, #080812 100%)',
          borderRight: '1px solid rgba(120,80,255,0.12)',
          position: 'relative', overflow: 'hidden',
        }}
        className="auth-left-panel"
      >
        <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(ellipse, ${accent}18 0%, transparent 70%)`, pointerEvents: 'none', transition: 'background 0.6s' }} />

        <div>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/assets/explain-logo.svg" width={36} height={36} alt="Explain" style={{ borderRadius: '50%' }} />
            <span style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.02em' }}>
              explain<span style={{ color: '#7b5cf5' }}>.global</span>
            </span>
          </Link>
        </div>

        <div>
          <AnimatePresence mode="wait">
            <motion.div key={role} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: accent, marginBottom: 16 }}>✦ JOIN AS {role.toUpperCase()}</div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 20, letterSpacing: '-0.03em' }}>
                {role === 'Candidate' && <>Start your<br /><span style={{ color: accent }}>interview journey.</span></>}
                {role === 'Recruiter' && <>Win more<br /><span style={{ color: accent }}>placements.</span></>}
                {role === 'Client'    && <>Hire smarter,<br /><span style={{ color: accent }}>faster.</span></>}
              </h2>
              <p style={{ fontSize: 15, color: '#7070a0', lineHeight: 1.75 }}>
                {role === 'Candidate' && 'Free to get started. Practice with AI. See real scores. LEARN from every session.'}
                {role === 'Recruiter' && 'Send candidates a prep link in 30 seconds. They practice. You see their scores before the real interview.'}
                {role === 'Client'    && 'Commission bespoke interview packs. Review pre-assessed talent. Make confident hire decisions.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Steps preview */}
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Create your account', 'Takes under 2 minutes'],
              ['Set up your profile',  role === 'Candidate' ? 'Add your target role and CV' : 'Tell us about your organisation'],
              ['Start straight away',  role === 'Candidate' ? 'Jump into an interview practice session' : 'Invite your first candidate or client'],
            ].map(([title, sub], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${accent}18`, border: `1px solid ${accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: accent, flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#c0c0e0', marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 12, color: '#5050a0' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#3a3a60' }}>© 2026 Explain Global Ltd · All rights reserved</div>
      </motion.div>

      {/* Right panel — form */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 32px' }}
      >
        {/* Mobile logo */}
        <div style={{ marginBottom: 36 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/assets/explain-logo.svg" width={28} height={28} alt="Explain" style={{ borderRadius: '50%' }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '-0.02em' }}>
              explain<span style={{ color: '#7b5cf5' }}>.global</span>
            </span>
          </Link>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.02em' }}>Create your account</h1>
        <p style={{ fontSize: 14, color: '#6060a0', marginBottom: 28 }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}>Sign in instead</Link>
        </p>

        {/* Role selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#5050a0', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10, display: 'block' }}>I am a…</label>
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
                    flex: 1, padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${active ? ac + '55' : 'rgba(255,255,255,0.08)'}`,
                    background: active ? `${ac}12` : 'rgba(255,255,255,0.03)',
                    transition: 'all 0.2s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? ac : '#6060a0' }}>{r.label}</span>
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={role} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ fontSize: 12, color: '#5050a0', marginTop: 8 }}>
              {ROLES.find(r => r.value === role)?.description}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <Field label="Full name">
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Your full name" required autoComplete="name"
              style={inputStyle(accent, !!error)} />
          </Field>

          <Field label="Email address">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoComplete="email"
              style={inputStyle(accent, !!error)} />
          </Field>

          {/* Company — conditional */}
          <AnimatePresence>
            {needsCompany && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <Field label={role === 'Recruiter' ? 'Recruitment firm' : 'Company name'}>
                  <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                    placeholder={role === 'Recruiter' ? 'e.g. Vallum Talent' : 'e.g. Barclays'}
                    autoComplete="organization"
                    style={inputStyle(accent, false)} />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

          <Field label="Password">
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters" required autoComplete="new-password"
                style={{ ...inputStyle(accent, !!error), paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#5050a0', padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPass
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  }
                </svg>
              </button>
            </div>
            {/* Strength meter */}
            {password && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${(strength.score / 5) * 100}%` }} transition={{ duration: 0.3 }}
                    style={{ height: '100%', background: strength.color, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: strength.color, width: 44 }}>{strength.label}</span>
              </div>
            )}
          </Field>

          <Field label="Confirm password">
            <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password" required autoComplete="new-password"
              style={inputStyle(accent, passwordMismatch)} />
            {passwordMismatch && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Passwords don't match</div>}
          </Field>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', lineHeight: 1.5 }}>
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading || !email || !password || !fullName || passwordMismatch}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{
              width: '100%', padding: '13px 24px', marginTop: 4,
              background: loading ? 'rgba(120,80,255,0.3)' : `linear-gradient(135deg, #7b5cf5, ${accent})`,
              border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                Creating account…
              </>
            ) : `Create ${role} account`}
          </motion.button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#3a3a60', lineHeight: 1.6 }}>
            By creating an account you agree to our{' '}
            <span style={{ color: '#5050a0', cursor: 'pointer' }}>Terms of Service</span> and{' '}
            <span style={{ color: '#5050a0', cursor: 'pointer' }}>Privacy Policy</span>.
          </p>
        </form>
      </motion.div>

      <style>{`
        @media (min-width: 900px) { .auth-left-panel { display: flex !important; } }
        input::placeholder { color: rgba(150,150,200,0.35); }
        input:focus { outline: none; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#5050a0', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>{label}</label>
      {children}
    </div>
  );
}

function inputStyle(_accent: string, hasError: boolean): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${hasError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.10)'}`,
    borderRadius: 10, padding: '12px 16px',
    fontSize: 14, color: '#fff',
    outline: 'none', transition: 'border-color 0.2s',
  };
}
