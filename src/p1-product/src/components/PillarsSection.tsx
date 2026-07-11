import { useIsMobile } from '../hooks/useIsMobile'

const pillars = [
  { icon: '🪞', color: 'rgba(99,102,241,0.1)',  title: 'Identity', desc: 'Define who you are — and who you want to become.', tags: ['Values','Strengths','Future Self','My Story'] },
  { icon: '🎯', color: 'rgba(16,185,129,0.1)',  title: 'Goals',    desc: 'Set powerful goals and track your progress with clarity and purpose.', tags: ['Long-term','Milestones','Progress','Accountability'] },
  { icon: '🔁', color: 'rgba(245,158,11,0.1)',  title: 'Habits',   desc: 'Build habits that reinforce your identity and shape your future.', tags: ['Daily Routines','Streaks','Analytics','Consistency'] },
  { icon: '⚡', color: 'rgba(239,68,68,0.1)',   title: 'Skills',   desc: 'Master the skills that unlock your potential and elevate your performance.', tags: ['Skill Map','Gap Analysis','Learning Plans','Mastery'] },
]

export default function PillarsSection() {
  const isMobile = useIsMobile()
  return (
    <section id="pillars" style={{ background: 'var(--bg-2)', padding: isMobile ? '80px 0' : '112px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 20px' : '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>The Four Pillars</div>
          <h2 style={{ fontSize: 'clamp(28px,3.5vw,36px)', fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, color: 'var(--text)', margin: '0 0 16px' }}>Everything that shapes who you become.</h2>
          <p style={{ fontSize: 17, color: 'var(--text-3)', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>Four interconnected systems — each powerful alone, transformative together.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 14 : 20 }}>
          {pillars.map(p => (
            <div key={p.title} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: isMobile ? 20 : 28, transition: 'border-color .2s, transform .2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,.4)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.transform = '' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, fontSize: 22 }}>{p.icon}</div>
              <h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginBottom: 10 }}>{p.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 16 }}>{p.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
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
