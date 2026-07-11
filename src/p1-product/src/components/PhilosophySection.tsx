import { useIsMobile } from '../hooks/useIsMobile'

const points = [
  { n: '01', t: "Know who you are and who you're becoming — identity drives every decision." },
  { n: '02', t: 'Set goals with clarity and deadlines. Vague ambition produces vague results.' },
  { n: '03', t: 'Habits are the compound interest of personal growth. Track them without mercy.' },
  { n: '04', t: 'Skills are assets. Map your gaps, close them deliberately, measure mastery.' },
  { n: '05', t: 'Your percentile rank is a mirror — honest, objective, and always improvable.' },
]

export default function PhilosophySection() {
  const isMobile = useIsMobile()
  return (
    <section id="philosophy" style={{ background: 'var(--bg)', padding: isMobile ? '64px 0' : '96px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 20px' : '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 40 : 80, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>Our Philosophy</div>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,44px)', fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, color: 'var(--text)', marginBottom: 20 }}>
              A system for people who want to win.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 14 }}>
              Success isn't an accident. It's engineered — through deliberate identity, aligned habits, measurable goals, and relentless skill-building.
            </p>
            <p style={{ fontSize: 16, color: 'var(--text-3)', lineHeight: 1.7 }}>
              Most people drift. They have good intentions but no architecture. Percentile.One gives you the structure that high performers build over years — in a single platform.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {points.map(p => (
              <div key={p.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', letterSpacing: 1, paddingTop: 3, flexShrink: 0 }}>{p.n}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', lineHeight: 1.5 }}>{p.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
