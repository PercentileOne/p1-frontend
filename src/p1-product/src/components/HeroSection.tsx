import { useState } from 'react'
import AppMockup from './AppMockup'
import ContactModal from './ContactModal'

export default function HeroSection() {
  const [showContact, setShowContact] = useState(false)
  return (
    <section id="hero" style={{ background: 'var(--bg-dark)', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 64, position: 'relative', overflow: 'hidden' }}>
      {/* Grid background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
      {/* Glow */}
      <div style={{ position: 'absolute', top: -200, right: -100, width: 600, height: 600, background: 'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '42% 58%', gap: 48, alignItems: 'center', position: 'relative', zIndex: 1, width: '100%', maxWidth: 1280, margin: '0 auto', padding: '80px 24px' }}>

        {/* Copy */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', padding: '6px 14px', borderRadius: 100, marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, background: '#10B981', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A5B4FC' }}>Now in Beta</span>
          </div>

          <h1 style={{ fontSize: 'clamp(32px,4.5vw,58px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, color: '#F1F5F9', marginBottom: 20 }}>
            Your Life.<br />
            Your Success.<br />
            Organised.<br />
            Upgraded.<br />
            <em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>Optimised.</em>
          </h1>

          <p style={{ fontSize: 17, color: '#94A3B8', lineHeight: 1.65, maxWidth: 420, marginBottom: 36 }}>
            Percentile.One is your personal operating system — built to help you achieve more, grow faster, and become the person you were meant to be.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button onClick={() => setShowContact(true)} style={{ background: 'var(--accent)', color: '#fff', padding: '13px 26px', borderRadius: 10, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 24px rgba(99,102,241,.35)' }}>
              Start Your Journey
            </button>
            <button style={{ background: 'transparent', color: '#94A3B8', padding: '13px 26px', borderRadius: 10, fontSize: 15, fontWeight: 600, border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer' }}>
              See How It Works
            </button>
          </div>
          {showContact && <ContactModal onClose={() => setShowContact(false)} />}
        </div>

        {/* Live app mockup */}
        <AppMockup />
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.85)} }
      `}</style>
    </section>
  )
}
