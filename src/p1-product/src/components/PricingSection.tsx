import { useState } from 'react'
import ContactModal from './ContactModal'
import { useIsMobile } from '../hooks/useIsMobile'

const plans = [
  {
    name: 'Free',
    price: '£0',
    period: '/month',
    desc: 'Start your journey.',
    features: ['Identity & My Story','Basic Goal Tracking','3 Active Habits','Community Feed (read only)','Percentile Ranking'],
    cta: 'Get Started Free',
    featured: false,
  },
  {
    name: 'Premium',
    price: '£9.99',
    period: '/month',
    desc: 'The full cockpit.',
    features: ['Everything in Free','Unlimited Goals & Habits','Full Skill Map + Gap Analysis','Wisdom Wall (unlimited)','Top Stories submission','Smart AI Recommendations','P1 Cockpit Dashboard'],
    cta: 'Start Free Trial',
    featured: true,
    badge: 'Most Popular',
  },
  {
    name: 'Elite',
    price: '£24.99',
    period: '/month',
    desc: 'For top performers.',
    features: ['Everything in Premium','Priority Percentile Ranking','1:1 AI Growth Coach','Custom Life Areas','Elite Community Access','Early Feature Access','Dedicated Support'],
    cta: 'Go Elite',
    featured: false,
  },
]

export default function PricingSection() {
  const [showContact, setShowContact] = useState(false)
  const isMobile = useIsMobile()

  return (
    <section id="pricing" style={{ background: 'var(--bg)', padding: isMobile ? '64px 0' : '96px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '0 20px' : '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--accent)' }}>Pricing</div>
          <h2 style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, color: 'var(--text)', margin: '12px 0 14px' }}>Invest in your percentile.</h2>
          <p style={{ fontSize: 16, color: 'var(--text-3)', maxWidth: 500, margin: '0 auto', lineHeight: 1.65 }}>Start free. Upgrade when you're ready to go further. Cancel any time.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 20 : 18, alignItems: 'center' }}>
          {plans.map(p => (
            <div key={p.name} style={{
              background: p.featured ? 'var(--bg-dark)' : 'var(--bg-2)',
              border: p.featured ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: p.featured ? '32px 26px' : '26px',
              position: 'relative',
              transform: (p.featured && !isMobile) ? 'scale(1.04)' : 'none',
            }}>
              {p.badge && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>{p.badge}</div>
              )}
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: p.featured ? '#94A3B8' : 'var(--text-3)' }}>{p.name}</span>
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: p.featured ? '#F1F5F9' : 'var(--text)', letterSpacing: -1.5 }}>{p.price}</span>
                <span style={{ fontSize: 13, color: p.featured ? '#64748B' : 'var(--text-3)' }}>{p.period}</span>
              </div>
              <div style={{ fontSize: 13, color: p.featured ? '#64748B' : 'var(--text-3)', marginBottom: 22, lineHeight: 1.5 }}>{p.desc}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {p.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: p.featured ? '#CBD5E1' : 'var(--text-2)' }}>
                    <span style={{ width: 17, height: 17, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0, fontWeight: 900 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => setShowContact(true)} style={{ width: '100%', padding: '12px 0', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer', border: p.featured ? 'none' : '1px solid var(--border)', background: p.featured ? 'var(--accent)' : 'transparent', color: p.featured ? '#fff' : 'var(--text-2)', letterSpacing: .3 }}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', marginTop: 32 }}>All plans include a 14-day free trial. No credit card required to start.</p>
      </div>
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </section>
  )
}
