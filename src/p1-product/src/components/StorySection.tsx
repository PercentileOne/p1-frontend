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
  return (
    <section id="story" style={{ background: 'var(--bg-dark)', padding: '96px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 12 }}>My Story</div>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, color: '#F1F5F9', marginBottom: 20 }}>Your story.<br />Your terms.</h2>
            <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.7, marginBottom: 24 }}>
              Behind every percentile rank is a human story. Where you came from, what you overcame, why you keep going. Percentile.One gives you a private space to write that story — and the choice to share it if you want to.
            </p>
            {options.map(o => (
              <div key={o.title} style={{ display: 'flex', gap: 13, alignItems: 'center', background: 'var(--bg-mid)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{o.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0' }}>{o.title}</div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{o.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div>
            {testimonials.map(t => (
              <div key={t.name} style={{ background: 'var(--bg-mid)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius)', padding: 18, display: 'flex', gap: 13, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: t.col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{t.init}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginBottom: 4 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.55 }}>{t.quote}</div>
                  <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 100, marginTop: 7, background: t.rankBg, color: t.rankCol }}>{t.rank}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
