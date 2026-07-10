const pillars = [
  { icon: '🪞', color: 'rgba(99,102,241,0.1)',  title: 'Identity', desc: 'Define your values, map your strengths and blind spots, craft your future self, and write the story you\'re living.', tags: ['Values','Strengths','Future Self','My Story'] },
  { icon: '🎯', color: 'rgba(16,185,129,0.1)',  title: 'Goals',    desc: 'Set long-term visions and short-term milestones. Track progress with honest metrics. Celebrate what you\'ve earned.', tags: ['Long-term','Milestones','Progress','Accountability'] },
  { icon: '🔁', color: 'rgba(245,158,11,0.1)',  title: 'Habits',   desc: 'Build daily routines that compound. Track streaks, analyse patterns, and understand what\'s moving your life forward.', tags: ['Daily Routines','Streaks','Analytics','Consistency'] },
  { icon: '⚡', color: 'rgba(239,68,68,0.1)',   title: 'Skills',   desc: 'Map every skill you have and every gap you need to close. Build learning plans and track mastery across everything that matters.', tags: ['Skill Map','Gap Analysis','Learning Plans','Mastery'] },
]

export default function PillarsSection() {
  return (
    <section id="pillars" style={{ background: 'var(--bg-2)', padding: '96px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)' }}>The Four Pillars</div>
          <h2 style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, color: 'var(--text)', margin: '12px 0 14px' }}>Everything that shapes who you become.</h2>
          <p style={{ fontSize: 16, color: 'var(--text-3)', maxWidth: 540, margin: '0 auto', lineHeight: 1.65 }}>Four interconnected systems — each powerful alone, transformative together.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
          {pillars.map(p => (
            <div key={p.title} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 26 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 20 }}>{p.icon}</div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginBottom: 9 }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.65 }}>{p.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 14 }}>
                {p.tags.map(t => (
                  <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 100, background: 'var(--bg-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
