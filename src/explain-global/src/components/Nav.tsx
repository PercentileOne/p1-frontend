import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import ContactModal from './ContactModal';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/learn', label: 'Learn' },
  { to: '/community', label: 'Community' },
  { to: '/my-interviews', label: 'My Interviews' },
  { to: '/portals', label: 'Portals' },
  { to: '/pricing', label: 'Pricing' },
];

export function Nav() {
  const loc = useLocation();
  const navigate = useNavigate();
  const isAuthPage = loc.pathname === '/login' || loc.pathname === '/register';
  const [showContact, setShowContact] = useState(false);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(5,4,15,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(120,80,255,0.18)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '0 24px',
        display: 'flex', alignItems: 'center',
        height: 60, gap: 8,
      }}>
        {/* Logo */}
        <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 16, textDecoration: 'none', flexShrink: 0 }}>
          <img src="/assets/explain-logo.svg" width={32} height={32} alt="Explain" style={{ borderRadius: '50%' }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.02em' }}>
            explain<span style={{ color: '#7b5cf5' }}>.global</span>
          </span>
        </NavLink>

        {/* Links */}
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {LINKS.map(({ to, label }) => {
            const active = to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#fff' : '#9090b0',
                  background: active ? 'rgba(120,80,255,0.18)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </NavLink>
            );
          })}
        </div>

        {/* Auth CTAs */}
        {showContact && <ContactModal onClose={() => setShowContact(false)} defaultSubject="Early access to Explain.global" />}
        {!isAuthPage && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setShowContact(true)}
              style={{
                background: 'rgba(167,139,250,0.10)',
                color: '#a78bfa',
                border: '1px solid rgba(167,139,250,0.3)',
                borderRadius: 8, padding: '7px 16px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>
              Register Interest
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: '#c0c0e0',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, padding: '7px 16px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
              Sign in
            </button>
            <button
              onClick={() => navigate('/register')}
              style={{
                background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
                color: '#fff', border: 'none',
                borderRadius: 8, padding: '7px 16px',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
              Register
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
