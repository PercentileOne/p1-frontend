import { useIsMobile } from '../hooks/useIsMobile'

const options = [
  { icon: '🔒', title: 'Private',   desc: 'Your story stays with you. A personal journal only you can see.' },
  { icon: '👤', title: 'Anonymous', desc: 'Share your journey without your name. Inspire others, protect your privacy.' },
  { icon: '🌍', title: 'Public',    desc: 'Own your transformation. Become someone else\'s proof that it\'s possible.' },
]

const testimonials = [
  { init: 'S', col: '#6366F1', name: 'Sarah K. — Anonymous', rank: 'Top 15%', rankCol: '#10B981', rankBg: 'rgba(16,185,129,.1)', quote: '"I started with zero habits and no direction. 90 days later I\'m top 15% and I got the promotion I\'d been chasing for two years."' },
  { init: 'M', col: '#10B981', name: 'Marcus T. — Public',   rank: 'Top 8%',  rankCol: '#6366F1', rankBg: 'rgba(99,102,241,.1)', quote: '"I was told I\'d never amount to anything. My P1 rank says otherwise. This isn\'t an app — it\'s a mirror that shows you who you\'re actually becoming."' },
  { init: 'A', col: '#F59E0B', name: 'Aisha R. — Public',   rank: 'Top 20%', rankCol: '#F59E0B', rankBg: 'rgba(245,158,11,.1)',  quote: '"On dialysis three times a week. Still in the top 20%. If I can do it, anyone can. That\'s why I made my story public."' },
]

export default function StorySection() {
  const isMobile = useIsMobile()
  return (
    <section id="story" style={{ background: 'var(--bg-dark)', padding: isMobile ? '80px 0' : '112px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 20px' : '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 48 : 80, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>My Story</div>
            <h2 style={{ fontSize: 'clamp(28px,3.5vw,36px)', fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, color: '#F1F5F9', marginBottom: 20 }}>Your Story Matters.</h2>
            <p style={{ fontSize: 17, color: '#64748B', lineHeight: 1.7, marginBottom: 28 }}>
              Your story is yours.<br />Share it privately, anonymously, or publicly — and watch how your journey inspires others.
            </p>
            {options.map(o => (
              <div key={o.title} style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--bg-mid)', border: '1px solid var(--border-dark)', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{o.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#E2E8F0' }}>{o.title}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>{o.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div>
            {testimonials.map(t => (
              <div key={t.name} style={{ background: 'var(--bg-mid)', border: '1px solid var(--border-dark)', borderRadius: 14, padding: 20, display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{t.init}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginBottom: 5 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{t.quote}</div>
                  <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100, marginTop: 8, background: t.rankBg, color: t.rankCol }}>{t.rank}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
