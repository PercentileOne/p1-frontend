import { useIsMobile } from '../hooks/useIsMobile'

const audiences = [
  { icon: '🚀', title: 'Builders',      desc: 'Founders, creators, makers, and people who are building something meaningful.' },
  { icon: '📚', title: 'Learners',      desc: 'People who want to grow their skills, expand their knowledge, and evolve their identity.' },
  { icon: '🎯', title: 'Achievers',     desc: 'People who set goals, chase progress, and want a system that keeps them accountable.' },
  { icon: '💼', title: 'Professionals', desc: 'People who want clarity, structure, and a cockpit for their life and career.' },
  { icon: '👨‍👧', title: 'Parents',       desc: 'People who want to become role models and build a better future for their families.' },
  { icon: '🎓', title: 'Students',      desc: 'People who want to understand themselves, improve their habits, and build strong foundations.' },
]

export default function WhoIsItForSection() {
  const isMobile = useIsMobile()

  return (
    <section style={{ background: 'var(--bg-dark)', padding: isMobile ? '60px 0' : '72px 0', borderTop: '1px solid rgba(255,255,255,.04)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 20px' : '0 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>Who P1 Is For</div>
          <h2 style={{ fontSize: 'clamp(28px,3.5vw,36px)', fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, color: '#F1F5F9', margin: '0 0 18px' }}>Built for people who want more.</h2>
          <p style={{ fontSize: 17, color: '#64748B', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
            Percentile.One is built for people who want more from life — people who want to grow, improve, and become the highest‑performing version of themselves.
          </p>
        </div>

        {/* Audience grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: isMobile ? 14 : 16, marginBottom: 24 }}>
          {audiences.map(a => (
            <div key={a.title} style={{
              display: 'flex', alignItems: 'flex-start', gap: 18,
              background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 14, padding: isMobile ? '20px 18px' : '24px 26px',
              transition: 'border-color .2s, background .2s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,.35)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,.06)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.06)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.03)'
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{a.icon}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#E2E8F0', marginBottom: 6, letterSpacing: -0.3 }}>{a.title}</div>
                <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{a.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* "Anyone" callout */}
        <div style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(99,102,241,.1), rgba(16,185,129,.08))',
          border: '1px solid rgba(99,102,241,.2)',
          borderRadius: 16, padding: isMobile ? '28px 24px' : '32px 48px',
        }}>
          <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: '#E2E8F0', marginBottom: 10, letterSpacing: -0.3 }}>
            Anyone who wants to transform their life.
          </div>
          <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7, margin: 0, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            P1 is not just for high performers — it's for anyone who wants to grow. Wherever you're starting from, the system meets you there.
          </p>
        </div>

      </div>
    </section>
  )
}
