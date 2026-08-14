import { motion } from 'framer-motion';

const TIERS = [
  {
    id: 'standard',
    name: 'Standard',
    price: '0.99',
    questions: 10,
    color: '#60A5FA',
    colorSoft: 'rgba(96,165,250,0.10)',
    colorBorder: 'rgba(96,165,250,0.25)',
    glow: 'rgba(96,165,250,0.06)',
    description: 'A focused session to sharpen your essentials.',
    features: [
      '10 AI-generated interview questions',
      'Tailored to your exact role & job spec',
      'Live AI interviewers — James & Sarah',
      'Overall score on completion',
      '10-question PDF to review offline',
      'Results private by default',
    ],
    cta: 'Start for 99p',
    badge: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '1.99',
    questions: 15,
    color: '#a78bfa',
    colorSoft: 'rgba(167,139,250,0.12)',
    colorBorder: 'rgba(167,139,250,0.30)',
    glow: 'rgba(167,139,250,0.10)',
    description: 'Deeper practice with full skill analysis.',
    features: [
      '15 AI-generated interview questions',
      'Tailored to your exact role & job spec',
      'Live AI interviewers — James & Sarah',
      'Full score with 4-dimension skill breakdown',
      '15-question PDF to review offline',
      'Share your score card to LinkedIn & more',
    ],
    cta: 'Start for £1.99',
    badge: 'Most Popular',
  },
  {
    id: 'expert',
    name: 'Expert',
    price: '2.99',
    questions: 20,
    color: '#34D399',
    colorSoft: 'rgba(52,211,153,0.10)',
    colorBorder: 'rgba(52,211,153,0.28)',
    glow: 'rgba(52,211,153,0.07)',
    description: 'The complete session. Walk in knowing you\'re ready.',
    features: [
      '20 AI-generated interview questions',
      'Tailored to your exact role & job spec',
      'Live AI interviewers — James & Sarah',
      'Full score + coaching tips per answer',
      '20-question PDF to review offline',
      'Shareable score badge for your profile',
    ],
    cta: 'Start for £2.99',
    badge: 'Best Value',
  },
];

const INCLUDED_ALL = [
  { icon: '🔒', text: 'Private practice session — nobody watches you but you' },
  { icon: '🎙', text: 'Real-time AI interviewers that respond naturally' },
  { icon: '⚡', text: 'Instant results — no waiting, no human review' },
  { icon: '📄', text: 'PDF question bank matches your pack — review anywhere' },
  { icon: '♻️', text: 'Redo as many times as you like for the same price' },
  { icon: '💳', text: 'No subscription — pay once per session' },
];

export default function Pricing() {
  return (
    <div style={{ minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(120,80,255,0.18) 0%, transparent 65%)',
        padding: '80px 24px 64px',
        textAlign: 'center',
      }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(120,80,255,0.12)', border: '1px solid rgba(120,80,255,0.28)',
            borderRadius: 20, padding: '4px 16px',
            fontSize: 11, fontWeight: 700, color: '#b09fff', letterSpacing: '0.08em',
            marginBottom: 28,
          }}>
            ✦ SIMPLE PRICING
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 900, lineHeight: 1.1,
            color: '#fff', marginBottom: 18, letterSpacing: '-0.03em',
          }}>
            Pay once.<br />
            <span style={{ background: 'linear-gradient(90deg, #7b5cf5, #5b8ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Walk in ready.
            </span>
          </h1>

          <p style={{ fontSize: 17, color: '#8080b0', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
            No subscription. No hidden fees. Choose your session size,
            practise privately, and get your score the moment you finish.
          </p>
        </motion.div>
      </div>

      {/* Tier cards */}
      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '0 24px 64px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              style={{
                background: `radial-gradient(ellipse at 50% 0%, ${tier.glow} 0%, transparent 60%), rgba(255,255,255,0.02)`,
                border: `1px solid ${tier.id === 'pro' ? tier.colorBorder : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 20,
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: tier.id === 'pro' ? `0 0 40px ${tier.glow}` : 'none',
              }}
            >
              {/* Badge */}
              {tier.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: `linear-gradient(135deg, ${tier.color}, ${tier.color}99)`,
                  borderRadius: 20, padding: '4px 14px',
                  fontSize: 11, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap',
                  boxShadow: `0 4px 16px ${tier.colorSoft}`,
                }}>
                  {tier.badge}
                </div>
              )}

              {/* Name + questions */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: tier.color, marginBottom: 8 }}>
                  {tier.name.toUpperCase()}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>£</span>
                  <span style={{ fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {tier.price.split('.')[0]}
                  </span>
                  <span style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                    .{tier.price.split('.')[1]}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>per session · one-time</div>
              </div>

              {/* Question count pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
                background: tier.colorSoft, border: `1px solid ${tier.colorBorder}`,
                borderRadius: 10, padding: '8px 14px', marginBottom: 20,
              }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: tier.color }}>{tier.questions}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: tier.color }}>questions</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>+ {tier.questions}Q PDF</div>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 24 }}>
                {tier.description}
              </p>

              {/* Features */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {tier.features.map((f, fi) => (
                  <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: tier.colorSoft, border: `1px solid ${tier.colorBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke={tier.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                style={{
                  width: '100%', padding: '14px',
                  background: tier.id === 'pro'
                    ? `linear-gradient(135deg, ${tier.color}, #5b8ff7)`
                    : tier.colorSoft,
                  border: `1px solid ${tier.colorBorder}`,
                  borderRadius: 12,
                  color: tier.id === 'pro' ? '#fff' : tier.color,
                  fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: tier.id === 'pro' ? `0 4px 20px ${tier.colorSoft}` : 'none',
                }}
                onClick={() => window.open('https://recruiter.explain.global/interview-room/demo', '_blank')}
              >
                {tier.cta}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Included in all */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{ marginTop: 48 }}
        >
          <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>
            INCLUDED IN EVERY SESSION
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {INCLUDED_ALL.map((item, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, padding: '16px 18px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recruiter note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          style={{
            marginTop: 32, padding: '24px 28px',
            background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)',
            borderRadius: 14, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 24 }}>🤝</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
              Got a recruiter? Your session might already be covered.
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Recruiters using Explain can send candidates a free prep link — paid for on your behalf.
              Check your email for an invite from your recruiter.
            </div>
          </div>
          <a
            href="https://recruiter.explain.global"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13, fontWeight: 700, color: '#a78bfa',
              textDecoration: 'none', flexShrink: 0,
              background: 'rgba(167,139,250,0.10)', border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: 8, padding: '8px 16px',
            }}
          >
            For Recruiters →
          </a>
        </motion.div>
      </div>
    </div>
  );
}
