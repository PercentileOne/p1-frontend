import { useIsMobile } from '../hooks/useIsMobile'

const signals = [
  { icon: '😴', label: 'Sleep & recovery' },
  { icon: '⚖️', label: 'Stress & workload balance' },
  { icon: '🔁', label: 'Consistency of habits' },
  { icon: '🎯', label: 'Progress on goals' },
  { icon: '🧠', label: 'Deep work & focus' },
  { icon: '❤️', label: 'Physical health & vitality' },
  { icon: '💰', label: 'Financial stability' },
  { icon: '📚', label: 'Learning & growth' },
  { icon: '👥', label: 'Social connection' },
  { icon: '🏠', label: 'Life admin stability' },
]

const actions = [
  'Completing meaningful tasks',
  'Improving sleep',
  'Reducing overload',
  'Taking breaks',
  'Progressing goals',
  'Managing stress',
  'Staying active',
  'Learning something new',
]

export default function P1ScoreSection() {
  const isMobile = useIsMobile()

  return (
    <section style={{ background: 'var(--bg)', padding: isMobile ? '80px 0' : '112px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '0 20px' : '0 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>P1 Score</div>
          <h2 style={{ fontSize: 'clamp(28px,3.5vw,36px)', fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, color: 'var(--text)', margin: '0 0 16px' }}>How Your P1 Score Is Calculated</h2>
          <p style={{ fontSize: 17, color: 'var(--text-3)', maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>
            Your P1 Score reflects the overall health, balance, and momentum of your Life + Work system. It is shaped by patterns across ten key dimensions of your life.
          </p>
        </div>

        {/* Score signals grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(5,1fr)', gap: isMobile ? 12 : 14, marginBottom: 48 }}>
          {signals.map(s => (
            <div key={s.label} style={{
              background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12,
              padding: isMobile ? '16px 14px' : '20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', lineHeight: 1.4 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* What it means + How to improve — 2-col on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 24 : 32 }}>

          {/* What it means */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: isMobile ? 24 : 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
              <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>What it means</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.15)', borderRadius: 10, padding: '14px 16px' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>↑</span>
                <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>
                  A <strong style={{ color: '#10B981' }}>higher score</strong> means your systems are aligned and supporting your goals.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 10, padding: '14px 16px' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>↓</span>
                <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>
                  A <strong style={{ color: '#EF4444' }}>lower score</strong> means something in your life or work ecosystem needs attention.
                </p>
              </div>
            </div>
          </div>

          {/* How to improve */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: isMobile ? 24 : 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
              <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>How to improve it</h3>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 16 }}>Small, consistent actions have the biggest impact:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {actions.map(a => (
                <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{a}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Closing statement */}
        <div style={{ textAlign: 'center', marginTop: 52 }}>
          <p style={{ fontSize: isMobile ? 16 : 18, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 620, margin: '0 auto', fontStyle: 'italic' }}>
            "Your P1 Score improves when you improve — gently, steadily, sustainably."
          </p>
        </div>

      </div>
    </section>
  )
}
