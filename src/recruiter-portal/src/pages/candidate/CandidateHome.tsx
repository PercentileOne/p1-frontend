import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const GATEWAYS = [
  {
    icon: '🎯',
    eyebrow: 'Got a job interview?',
    title: 'Prep for your interview',
    body: 'Enter the role and company, paste your CV, and get a personalised set of practice questions with model answers — ready in 30 seconds.',
    cta: 'Start Interview Prep →',
    path: '/candidate/prep',
    accent: '#4F8EF7',
    bg: 'rgba(79,142,247,0.06)',
    border: 'rgba(79,142,247,0.15)',
  },
  {
    icon: '📚',
    eyebrow: 'Want to get better?',
    title: 'Learn any skill — instantly',
    body: 'Browse LEARN modules matched to your role, explore improvement areas, and build interview confidence one topic at a time.',
    cta: 'Explore LEARN Modules →',
    path: '/learn',
    accent: '#34D399',
    bg: 'rgba(52,211,153,0.06)',
    border: 'rgba(52,211,153,0.15)',
  },
  {
    icon: '✉',
    eyebrow: 'Received a link from your recruiter?',
    title: 'Open your feedback or prep pack',
    body: 'Your recruiter has sent you either a personalised prep pack or interview feedback with learning recommendations. Click the link they sent to open it.',
    cta: null,
    path: null,
    accent: '#F59E0B',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.15)',
    isInfo: true,
  },
];

const FEATURES = [
  { icon: '🤖', title: 'AI-Generated Questions', body: 'Questions tailored to your exact role, company, and experience — not generic templates.' },
  { icon: '💡', title: 'Model Answer Guides', body: 'See what a strong answer looks like for every question, with key points and structure.' },
  { icon: '🔁', title: 'Follow-Up Probes', body: 'Practice the follow-ups interviewers use to go deeper — so nothing catches you off guard.' },
  { icon: '⚠', title: 'Red Flag Awareness', body: 'Know what signals worry interviewers and how to reframe your answers to avoid them.' },
  { icon: '⏱', title: 'Timed Practice', body: 'Practice under realistic time pressure to build the composure that only repetition creates.' },
  { icon: '📈', title: 'LEARN Recommendations', body: 'After every session, get a personalised plan of LEARN modules matched to your weaknesses.' },
];

const ROLES = [
  'Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer',
  'Marketing Manager', 'Sales Executive', 'Registered Nurse', 'Teacher',
  'Chef de Partie', 'Store Manager', 'Barista', 'Solicitor',
  'Logistics Driver', 'Personal Trainer', 'Business Analyst', 'HR Manager',
];

export default function CandidateHome() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text)' }}>EXPLAIN</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('/candidate/prep')}
              style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Start Prep
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg, #0b1220 0%, #0f1a2e 50%, #111827 100%)', borderBottom: '1px solid var(--border)', padding: '80px 24px 72px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(79,142,247,0.8)', marginBottom: '20px' }}>
              Candidate Platform · explain.global
            </div>
            <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '20px', textWrap: 'balance' } as React.CSSProperties}>
              Prepare smarter.<br />Interview better.
            </h1>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto 36px' }}>
              AI-powered interview preparation for any role, any company, any industry. Practice with the questions that actually get asked — with coaching built in.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/candidate/prep')}
                style={{ padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 800, background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}
              >
                Start Interview Prep →
              </button>
              <button
                onClick={() => navigate('/candidate/prep?mode=learn')}
                style={{ padding: '14px 28px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}
              >
                Explore LEARN Modules
              </button>
            </div>
          </motion.div>

          {/* Scrolling role pill strip */}
          <div style={{ marginTop: '48px', overflow: 'hidden', mask: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>
            <motion.div
              animate={{ x: [0, -1200] }}
              transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
              style={{ display: 'flex', gap: '10px', width: 'max-content' }}
            >
              {[...ROLES, ...ROLES].map((role, i) => (
                <span
                  key={i}
                  style={{ fontSize: '12px', fontWeight: 600, padding: '5px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}
                >
                  {role}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* 3 Gateways */}
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '64px 24px 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: '10px' }}>
            Three ways to use Explain
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Choose your starting point
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {GATEWAYS.map((g, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{
                background: g.bg,
                border: `1px solid ${g.border}`,
                borderRadius: '16px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ fontSize: '32px' }}>{g.icon}</div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: g.accent, marginBottom: '6px' }}>
                  {g.eyebrow}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: '10px' }}>
                  {g.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.65 }}>
                  {g.body}
                </div>
              </div>
              {g.cta && g.path && (
                <button
                  onClick={() => navigate(g.path!)}
                  style={{
                    marginTop: 'auto', padding: '11px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: 700,
                    background: g.accent, color: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {g.cta}
                </button>
              )}
              {g.isInfo && (
                <div style={{ marginTop: 'auto', padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', fontSize: '12px', color: 'rgba(245,158,11,0.8)', lineHeight: 1.55 }}>
                  The link opens your personalised page automatically — no login needed.
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '64px 24px' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '10px' }}>
              Everything you need to walk in confident
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: 1.6 }}>
              Built for candidates, used by recruiters — the same engine that runs real interviews.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 * i }}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 22px' }}
              >
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>{f.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>{f.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.6 }}>{f.body}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '10px' }}>
            Ready to start?
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6, marginBottom: '24px' }}>
            No account. No credit card. Just enter your role and get your prep pack in 30 seconds.
          </div>
          <button
            onClick={() => navigate('/candidate/prep')}
            style={{ padding: '14px 36px', borderRadius: '12px', fontSize: '15px', fontWeight: 800, background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Start Interview Prep →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          Explain · candidate.explain.global · Preparing candidates for any role, any industry
        </span>
      </div>
    </div>
  );
}
