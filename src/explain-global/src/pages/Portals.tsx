import { motion } from 'framer-motion';

const PORTALS = [
  {
    id: 'candidate',
    url: 'https://candidate.explain.global',
    badge: 'CANDIDATE PORTAL',
    heading: 'Your private interview studio.',
    sub: 'Practice privately. Get scored instantly. Share your best sessions with confidence.',
    bullets: [
      '🎙  Two live AI interviewers — James & Sarah',
      '📊  Real-time scoring across 4 skill dimensions',
      '🔒  Private by default — you choose what to share',
      '📋  Full transcript + feedback after every session',
      '⭐  Feature your best sessions on your profile',
      '🔗  Share scores directly to LinkedIn, WhatsApp & more',
    ],
    gradient: 'linear-gradient(135deg, #1a1040 0%, #0d1a33 100%)',
    accent: '#4F8EF7',
    accentSoft: 'rgba(79,142,247,0.15)',
    accentBorder: 'rgba(79,142,247,0.3)',
    glow: 'rgba(79,142,247,0.12)',
    tag: 'For Job Seekers',
    tagColor: '#4F8EF7',
    cta: 'Open Candidate Portal',
    emoji: '🎯',
  },
  {
    id: 'recruiter',
    url: 'https://recruiter.explain.global',
    badge: 'RECRUITER PORTAL',
    heading: 'Send your candidates in ready.',
    sub: 'Generate tailored interview packs. Send prep links to candidates. See who shows up prepared.',
    bullets: [
      '⚡  AI-generated interview packs from any job spec',
      '📨  One-click prep invites sent to your candidates',
      '📈  Candidate readiness scores before the interview',
      '🎥  Full video & audio interview simulations',
      '🏆  League table — ranked candidates by score',
      '💳  Pay-per-candidate — invisible in your placement fee',
    ],
    gradient: 'linear-gradient(135deg, #0e0a1f 0%, #0a1520 100%)',
    accent: '#a78bfa',
    accentSoft: 'rgba(167,139,250,0.15)',
    accentBorder: 'rgba(167,139,250,0.3)',
    glow: 'rgba(167,139,250,0.10)',
    tag: 'For Recruiters',
    tagColor: '#a78bfa',
    cta: 'Open Recruiter Portal',
    emoji: '🚀',
  },
  {
    id: 'client',
    url: 'https://client.explain.global',
    badge: 'CLIENT PORTAL',
    heading: 'See the best candidates first.',
    sub: 'Hiring managers get a curated shortlist — with scores, transcripts, and CVs — before the first call.',
    bullets: [
      '🏅  Candidates ranked by AI interview score',
      '📄  Full transcripts — read exactly what they said',
      '🎥  Watch video sessions for shortlisted candidates',
      '📎  CV attached to every profile',
      '🔍  Search candidates by role, score, or skill',
      '✅  Approve or pass with one click — no email chains',
    ],
    gradient: 'linear-gradient(135deg, #0f1a0e 0%, #0a1520 100%)',
    accent: '#34D399',
    accentSoft: 'rgba(52,211,153,0.12)',
    accentBorder: 'rgba(52,211,153,0.28)',
    glow: 'rgba(52,211,153,0.08)',
    tag: 'For Hiring Managers',
    tagColor: '#34D399',
    cta: 'Open Client Portal',
    emoji: '💼',
  },
  {
    id: 'home',
    url: 'https://explain.global',
    badge: 'EXPLAIN HOME',
    heading: 'The home of the interviewee.',
    sub: 'Real jobs. Interview stories. LEARN modules. Everything from first application to final offer.',
    bullets: [
      '💼  Real job listings — apply directly',
      '📖  LEARN engine — AI modules built from your gaps',
      '💬  Community — interview stories from real people',
      '🔔  Job alerts — matched to your skills and goals',
      '📊  Progress tracking across all your applications',
      '🌐  Public profile — share your journey',
    ],
    gradient: 'linear-gradient(135deg, #0e0818 0%, #090914 100%)',
    accent: '#f59e0b',
    accentSoft: 'rgba(245,158,11,0.12)',
    accentBorder: 'rgba(245,158,11,0.28)',
    glow: 'rgba(245,158,11,0.08)',
    tag: 'The Hub',
    tagColor: '#f59e0b',
    cta: 'Go to explain.global',
    emoji: '🌐',
  },
];

export default function Portals() {
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
            ✦ THE EXPLAIN ECOSYSTEM
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.6rem)', fontWeight: 900, lineHeight: 1.1,
            color: '#fff', marginBottom: 18, letterSpacing: '-0.03em',
          }}>
            Four portals.<br />
            <span style={{ background: 'linear-gradient(90deg, #7b5cf5, #5b8ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              One mission.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: '#8080b0', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            Explain connects every person in the hiring journey — candidate, recruiter, and client —
            each with their own dedicated, purpose-built experience.
          </p>
        </motion.div>
      </div>

      {/* Portal cards */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {PORTALS.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            style={{
              background: p.gradient,
              border: `1px solid ${p.accentBorder}`,
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: `0 0 60px ${p.glow}`,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

              {/* Left — story */}
              <div style={{ padding: '44px 48px 44px 44px', borderRight: `1px solid ${p.accentBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 28 }}>{p.emoji}</span>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: p.accent, marginBottom: 2 }}>
                      {p.badge}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 10px',
                      background: p.accentSoft, border: `1px solid ${p.accentBorder}`,
                      borderRadius: 20, color: p.tagColor, display: 'inline-block',
                    }}>
                      {p.tag}
                    </div>
                  </div>
                </div>

                <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.25, marginBottom: 14, letterSpacing: '-0.02em' }}>
                  {p.heading}
                </h2>

                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 32 }}>
                  {p.sub}
                </p>

                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: p.accentSoft,
                    border: `1px solid ${p.accentBorder}`,
                    borderRadius: 10, padding: '12px 22px',
                    color: p.accent, fontSize: 14, fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = p.accentBorder;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = p.accentSoft;
                  }}
                >
                  {p.cta} →
                </a>

                <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
                  {p.url.replace('https://', '')}
                </div>
              </div>

              {/* Right — bullets */}
              <div style={{ padding: '44px 44px 44px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
                  WHAT'S INSIDE
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {p.bullets.map((b, bi) => (
                    <motion.div
                      key={bi}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.1 + bi * 0.05 }}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                    >
                      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,0.75)' }}>{b}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: 'center', padding: '0 24px 80px' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
          One platform. Every person in the room.
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
          explain.global · recruiter.explain.global · candidate.explain.global · client.explain.global
        </div>
      </div>

    </div>
  );
}
