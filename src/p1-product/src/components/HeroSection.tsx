import { useState } from 'react'
import AppMockup from './AppMockup'
import ContactModal from './ContactModal'
import { useIsMobile } from '../hooks/useIsMobile'

export default function HeroSection() {
  const [showContact, setShowContact] = useState(false)
  const isMobile = useIsMobile()

  return (
    <section id="hero" style={{ background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', paddingTop: 64, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
      <div style={{ position: 'absolute', top: -200, right: -100, width: 600, height: 600, background: 'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '36% 64%',
        gap: isMobile ? 40 : 24,
        alignItems: 'center',
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 1280, margin: '0 auto',
        padding: isMobile ? '60px 20px 40px' : '80px 24px 48px',
      }}>

        {/* Copy */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', padding: '6px 14px', borderRadius: 100, marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, background: '#10B981', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A5B4FC' }}>Now in Beta</span>
          </div>

          <h1 style={{ fontSize: isMobile ? 'clamp(36px,10vw,52px)' : 'clamp(32px,4.5vw,58px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, color: '#F1F5F9', marginBottom: 20 }}>
            Your Life.<br />
            Your Success.<br />
            Organised.<br />
            Upgraded.<br />
            <em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>Optimised.</em>
          </h1>

          <p style={{ fontSize: isMobile ? 15 : 17, color: '#94A3B8', lineHeight: 1.65, maxWidth: 420, marginBottom: 36 }}>
            Percentile.One is your personal operating system — built to help you achieve more, grow faster, and become the person you were meant to be.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button onClick={() => setShowContact(true)} style={{ background: 'var(--accent)', color: '#fff', padding: '13px 26px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 24px rgba(99,102,241,.35)' }}>
              Start Your Journey
            </button>
            <button onClick={() => setShowContact(true)} style={{ background: 'transparent', color: '#94A3B8', padding: '13px 26px', borderRadius: 10, fontSize: 15, fontWeight: 600, border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer' }}>
              See How It Works
            </button>
          </div>
          {showContact && <ContactModal onClose={() => setShowContact(false)} />}
        </div>

        {/* App mockup — scaled down on mobile */}
        <div style={{ width: '100%', overflow: 'hidden' }}>

          {/* Live preview label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>Live Preview · P1 Cockpit</span>
          </div>

          {isMobile ? (
            <div style={{ zoom: 0.72, width: '100%', overflowX: 'hidden' }}>
              <AppMockup />
            </div>
          ) : (
            <AppMockup />
          )}

          {/* Feature chips */}
          <div style={{ background: 'var(--bg-dark)', paddingTop: 16, paddingBottom: 4 }}>
          <div style={{ display: 'flex', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: 7 }}>
            {[
              { icon: '⚖️', label: 'Work / Life' },
              { icon: '🎯', label: 'Goals' },
              { icon: '💼', label: 'Jobs & Career' },
              { icon: '🧠', label: 'Deep Focus' },
              { icon: '📅', label: 'Daily Planning' },
            ].map(f => (
              <div key={f.label} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                borderRadius: 100, padding: '5px 10px',
                fontSize: 11, fontWeight: 600, color: '#64748B', whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: 12 }}>{f.icon}</span>
                {f.label}
              </div>
            ))}
          </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.85)} }
      `}</style>
    </section>
  )
}
