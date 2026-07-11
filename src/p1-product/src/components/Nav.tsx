import { useState } from 'react'
import ContactModal from './ContactModal'
import AboutModal from './AboutModal'
import { useIsMobile } from '../hooks/useIsMobile'

export default function Nav() {
  const [showContact, setShowContact] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  const links = ['Philosophy', 'Pillars', 'Cockpit', 'Ranking', 'Pricing']

  const trackCta = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      ;(window as any).gtag('event', 'cta_click', { event_category: 'engagement', event_label: 'start_your_journey_nav' })
    }
    setShowContact(true)
    setMenuOpen(false)
  }

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" />
                <path d="M9 5v4l2.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Percentile.One</span>
          </div>

          {/* Desktop links */}
          {!isMobile && (
            <ul style={{ display: 'flex', alignItems: 'center', gap: 28, listStyle: 'none', marginLeft: 'auto', marginRight: 32 }}>
              {links.map(l => (
                <li key={l}>
                  <a href={`#${l.toLowerCase()}`} style={{ fontSize: 14, fontWeight: 500, color: '#94A3B8', transition: 'color .2s', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#F1F5F9')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>
                    {l}
                  </a>
                </li>
              ))}
              <li>
                <button onClick={() => setShowAbout(true)} style={{ fontSize: 14, fontWeight: 500, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F1F5F9')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>
                  About
                </button>
              </li>
              <li>
                <button onClick={() => setShowContact(true)} style={{ fontSize: 14, fontWeight: 500, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F1F5F9')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>
                  Contact
                </button>
              </li>
            </ul>
          )}

          {/* Desktop CTA */}
          {!isMobile && (
            <button onClick={trackCta} style={{
              background: 'var(--accent)', color: '#fff', padding: '8px 20px',
              borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
              transition: 'background .2s', flexShrink: 0,
            }}>
              Start Your Journey
            </button>
          )}

          {/* Mobile: CTA + hamburger */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={trackCta} style={{
                background: 'var(--accent)', color: '#fff', padding: '7px 14px',
                borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              }}>
                Join Beta
              </button>
              <button onClick={() => setMenuOpen(o => !o)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                display: 'flex', flexDirection: 'column', gap: 5,
              }}>
                {menuOpen
                  ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/></svg>
                  : <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h14M3 15h14" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/></svg>
                }
              </button>
            </div>
          )}
        </div>

        {/* Mobile dropdown menu */}
        {isMobile && menuOpen && (
          <div style={{
            background: 'rgba(7,14,28,0.98)', borderTop: '1px solid rgba(255,255,255,.06)',
            padding: '12px 20px 20px',
          }}>
            {links.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMenuOpen(false)} style={{
                display: 'block', padding: '12px 0', fontSize: 16, fontWeight: 600,
                color: '#94A3B8', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,.04)',
              }}>{l}</a>
            ))}
            <button onClick={() => { setShowAbout(true); setMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 0', fontSize: 16, fontWeight: 600, color: '#94A3B8', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,.04)', cursor: 'pointer' }}>About</button>
            <button onClick={() => { setShowContact(true); setMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 0', fontSize: 16, fontWeight: 600, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>Contact</button>
          </div>
        )}
      </nav>

      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} onContact={() => setShowContact(true)} />}
    </>
  )
}
