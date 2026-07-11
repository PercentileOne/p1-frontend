import { useIsMobile } from '../hooks/useIsMobile'

const stories = [
  { init: 'J', col: '#6366F1', name: 'James O.',   role: 'Software Engineer → CTO',       quote: '"I used to coast. P1 showed me exactly where I was wasting potential. Six months later I led my first engineering team."',   rank: 'Top 6%', streak: 180, goals: 31 },
  { init: 'P', col: '#10B981', name: 'Priya M.',   role: 'Teacher → EdTech Founder',      quote: '"I had the idea for years but no system. P1 gave me the structure to go from classroom to launching my first product."',    rank: 'Top 9%', streak:  94, goals: 18 },
  { init: 'D', col: '#EF4444', name: 'Daniel W.',  role: 'Redundant → Business Owner',    quote: '"Lost my job at 47. Found P1. Found myself. My business turned over £80k in year one."',                                   rank: 'Top 11%', streak: 210, goals: 42 },
]

export default function TopStoriesSection() {
  const isMobile = useIsMobile()
  return (
    <section style={{ background: 'var(--bg-2)', padding: isMobile ? '64px 0' : '96px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 20px' : '0 24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)' }}>Top 100 Stories</div>
          <h2 style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, color: 'var(--text)', margin: '12px 0 14px' }}>Transformations worth reading.</h2>
          <p style={{ fontSize: 16, color: 'var(--text-3)', maxWidth: 540, margin: '0 auto', lineHeight: 1.65 }}>Real people, real results. The Top 100 Stories are voted by the community — proof that growth is possible from any starting point.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 16 : 18, marginTop: 44 }}>
          {stories.map(s => (
            <div key={s.name} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: s.col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{s.init}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.role}</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 13 }}>{s.quote}</p>
              <div style={{ display: 'flex', gap: 14 }}>
                {[{v:s.rank,l:'Rank'},{v:s.streak,l:'Day Streak'},{v:s.goals,l:'Goals Hit'}].map(({v,l}) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--accent)' }}>{v}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '.5px' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
