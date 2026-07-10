export default function Nav() {
  const links = ['Philosophy', 'Pillars', 'Cockpit', 'Ranking', 'Pricing']

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="1.5" />
              <path d="M9 5v4l2.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.3px' }}>Percentile.One</span>
        </div>

        <ul style={{ display: 'flex', alignItems: 'center', gap: 32, listStyle: 'none' }}>
          {links.map(l => (
            <li key={l}>
              <a href={`#${l.toLowerCase()}`} style={{ fontSize: 14, fontWeight: 500, color: '#94A3B8', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F1F5F9')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>
                {l}
              </a>
            </li>
          ))}
        </ul>

        <button style={{
          background: 'var(--accent)', color: '#fff', padding: '8px 20px',
          borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none',
          transition: 'background .2s',
        }}>
          Start Your Journey
        </button>
      </div>
    </nav>
  )
}
