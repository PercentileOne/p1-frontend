import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Mock token → invite data (real version: API call to /api/prep-invites/:token)
const MOCK_INVITES: Record<string, {
  role: string;
  company: string;
  recruiterName: string;
  recruiterFirm: string;
  recruiterTitle: string;
  packId: string;
  questionCount: number;
  expiresAt: string; // ISO
}> = {
  'ABC123': {
    role: 'Senior Fullstack Engineer',
    company: 'Barclays',
    recruiterName: 'Mike Petrie',
    recruiterFirm: 'Vallum Associates',
    recruiterTitle: 'Chairman',
    packId: 'demo',
    questionCount: 10,
    expiresAt: '2026-08-31T23:59:59Z',
  },
  'XYZ789': {
    role: 'Head of Engineering',
    company: 'Monzo',
    recruiterName: 'Sarah Chen',
    recruiterFirm: 'TechTalent Ltd',
    recruiterTitle: 'Senior Consultant',
    packId: 'demo',
    questionCount: 10,
    expiresAt: '2026-09-15T23:59:59Z',
  },
};

const WHAT_YOU_GET = [
  { icon: '🎙', title: 'Live AI Interview', desc: 'Two AI interviewers ask you real questions for this exact role.' },
  { icon: '📊', title: 'Instant Score', desc: 'Get your overall score and skill breakdown the moment you finish.' },
  { icon: '💡', title: 'Detailed Feedback', desc: 'See exactly what landed and what to sharpen before the real thing.' },
  { icon: '🔒', title: 'Your Data, Your Choice', desc: 'Results are private by default. Share with your recruiter only if you want to.' },
];

export default function CandidatePrepLanding() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const invite = token ? MOCK_INVITES[token.toUpperCase()] : null;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');

  const handleStart = () => {
    if (!name.trim()) { setError('Please enter your name so we can personalise your session.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email address.'); return; }
    setError('');
    setStarted(true);
    // In production: POST /api/prep-sessions { token, name, email } → get sessionId
    setTimeout(() => navigate(`/interview-room/${invite?.packId ?? 'demo'}`), 1800);
  };

  // Invalid / expired token
  if (!invite) {
    return (
      <div style={{ minHeight: '100vh', background: '#080812', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔗</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Link not found</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            This prep link may have expired or been entered incorrectly. Contact your recruiter for a new one.
          </div>
        </div>
      </div>
    );
  }

  const daysLeft = Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / 86400000);

  return (
    <div style={{ minHeight: '100vh', background: '#080812', overflowX: 'hidden' }}>

      {/* Subtle grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(79,142,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,0.03) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Glow */}
      <div style={{ position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(79,142,247,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '580px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Explain wordmark */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #4F8EF7, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Explain</span>
        </motion.div>

        {/* Recruiter invite banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          style={{
            background: 'rgba(79,142,247,0.07)',
            border: '1px solid rgba(79,142,247,0.2)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F8EF7, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px', fontWeight: 800, color: '#fff' }}>
            {invite.recruiterName.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
              {invite.recruiterName} <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>· {invite.recruiterTitle}, {invite.recruiterFirm}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              has invited you to prepare for your interview
            </div>
          </div>
          {daysLeft > 0 && daysLeft <= 30 && (
            <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
              {daysLeft}d left
            </div>
          )}
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          style={{ marginBottom: '40px' }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.7)', marginBottom: '14px' }}>
            Interview Prep · Compliments of {invite.recruiterFirm}
          </div>
          <h1 style={{ fontSize: '34px', fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Get ready for your<br />
            <span style={{ background: 'linear-gradient(90deg, #4F8EF7, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {invite.role}
            </span>
            <br />private interview practice
          </h1>
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', marginTop: '10px' }}>
            at <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{invite.company}</span>
          </div>
          <div style={{ marginTop: '16px', fontSize: '14px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
            This is a free, AI-powered mock interview built specifically for this role.
            Walk in confident. Walk out with a score.
          </div>
        </motion.div>

        {/* What you get */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '40px' }}
        >
          {WHAT_YOU_GET.map((item, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '22px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{item.title}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </motion.div>

        {/* Sign-up / CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px' }}
        >
          <AnimatePresence mode="wait">
            {!started ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                  Ready to start?
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>
                  Takes about {Math.round(invite.questionCount * 2.5)} minutes · {invite.questionCount} questions · Free
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px', padding: '13px 16px',
                      color: '#fff', fontSize: '14px', outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(79,142,247,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Your email address"
                    type="email"
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px', padding: '13px 16px',
                      color: '#fff', fontSize: '14px', outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(79,142,247,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                    onKeyDown={e => e.key === 'Enter' && handleStart()}
                  />
                </div>

                {error && (
                  <div style={{ fontSize: '12px', color: '#EF4444', marginBottom: '12px' }}>{error}</div>
                )}

                <button
                  onClick={handleStart}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #4F8EF7, #a78bfa)',
                    border: 'none', borderRadius: '12px',
                    padding: '16px',
                    color: '#fff', fontSize: '15px', fontWeight: 800,
                    cursor: 'pointer', letterSpacing: '-0.01em',
                    boxShadow: '0 4px 24px rgba(79,142,247,0.3)',
                    transition: 'opacity 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '0.9'; (e.target as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '1'; (e.target as HTMLElement).style.transform = 'none'; }}
                >
                  Start my free prep session →
                </button>

                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '14px', lineHeight: 1.6 }}>
                  No payment needed · Your results are private by default ·{' '}
                  {invite.recruiterFirm} has covered the cost of this session
                </div>
              </motion.div>
            ) : (
              <motion.div key="loading" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(79,142,247,0.2)', borderTopColor: '#4F8EF7', margin: '0 auto 20px' }}
                />
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  Setting up your session…
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                  Loading your {invite.role} interview pack
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>
          Powered by <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Explain</span> · AI Interview Platform<br />
          explain.global · Questions? hello@explain.global
        </div>

      </div>
    </div>
  );
}
