import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ContactModal from './ContactModal';

const LANGUAGES = [
  { code: 'en', label: 'English', display: 'EN' },
  { code: 'fr', label: 'French', display: 'FR' },
  { code: 'de', label: 'German', display: 'DE' },
  { code: 'es', label: 'Spanish', display: 'ES' },
  { code: 'pt', label: 'Portuguese', display: 'PT' },
  { code: 'it', label: 'Italian', display: 'IT' },
  { code: 'nl', label: 'Dutch', display: 'NL' },
  { code: 'pl', label: 'Polish', display: 'PL' },
  { code: 'ar', label: 'Arabic', display: 'AR' },
  { code: 'zh', label: 'Chinese', display: 'ZH' },
  { code: 'ja', label: 'Japanese', display: 'JA' },
  { code: 'ko', label: 'Korean', display: 'KO' },
  { code: 'hi', label: 'Hindi', display: 'HI' },
  { code: 'tr', label: 'Turkish', display: 'TR' },
  { code: 'ru', label: 'Russian', display: 'RU' },
];

const NAV_KEYS = [
  { to: '/', key: 'nav.home' },
  { to: '/jobs', key: 'nav.jobs' },
  { to: '/learn', key: 'nav.learn' },
  { to: '/community', key: 'nav.community' },
  { to: '/my-interviews', key: 'nav.myInterviews' },
  { to: '/portals', key: 'nav.portals' },
  { to: '/pricing', key: 'nav.pricing' },
];

export function Nav() {
  const loc = useLocation();
  const { t, i18n } = useTranslation();
  const isAuthPage = loc.pathname === '/login' || loc.pathname === '/register';
  const [showContact, setShowContact] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  const langRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  function selectLanguage(lang: typeof LANGUAGES[0]) {
    i18n.changeLanguage(lang.code);
    document.documentElement.dir = lang.code === 'ar' ? 'rtl' : 'ltr';
    setShowLang(false);
  }

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLang(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function handleResize() { setIsMobile(window.innerWidth < 900); }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [loc.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // Close drawer on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setDrawerOpen(false); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
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

          {isMobile ? (
            /* ── Mobile: hamburger button ── */
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {!isAuthPage && (
                <button
                  onClick={() => window.location.href = '/register'}
                  style={{
                    background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
                    color: '#fff', border: 'none',
                    borderRadius: 8, padding: '7px 14px',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>
                  {t('nav.register')}
                </button>
              )}
              <button
                onClick={() => setDrawerOpen(v => !v)}
                aria-label="Open menu"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, padding: '8px 10px',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                {drawerOpen ? (
                  /* X icon */
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <line x1="3" y1="3" x2="15" y2="15" stroke="#c0c0e0" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="15" y1="3" x2="3" y2="15" stroke="#c0c0e0" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  /* Hamburger icon */
                  <>
                    <span style={{ display: 'block', width: 18, height: 2, background: '#c0c0e0', borderRadius: 2 }} />
                    <span style={{ display: 'block', width: 18, height: 2, background: '#c0c0e0', borderRadius: 2 }} />
                    <span style={{ display: 'block', width: 14, height: 2, background: '#c0c0e0', borderRadius: 2 }} />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* ── Desktop: links + auth CTAs ── */
            <>
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                {NAV_KEYS.map(({ to, key }) => {
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
                      {t(key)}
                    </NavLink>
                  );
                })}
              </div>

              {showContact && <ContactModal onClose={() => setShowContact(false)} defaultSubject="Early access to Explain.global" />}
              {!isAuthPage && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                  {/* Language picker */}
                  <div ref={langRef} style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowLang(v => !v)}
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#9090b0', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                    >
                      🌐 {currentLang.label} ({currentLang.display}) <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
                    </button>
                    {showLang && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#0d1020', border: '1px solid rgba(120,80,255,0.2)', borderRadius: 10, minWidth: 200, zIndex: 200, boxShadow: '0 16px 48px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
                        {LANGUAGES.map(l => (
                          <button
                            key={l.code}
                            onClick={() => selectLanguage(l)}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 16px', background: l.code === currentLang.code ? 'rgba(120,80,255,0.15)' : 'transparent', color: l.code === currentLang.code ? '#fff' : '#9090b0', border: 'none', fontSize: 13, fontWeight: l.code === currentLang.code ? 700 : 400, cursor: 'pointer' }}
                          >
                            {l.label} ({l.display})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                    {t('nav.registerInterest')}
                  </button>
                  <button
                    onClick={() => window.location.href = '/login'}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: '#c0c0e0',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 8, padding: '7px 16px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}>
                    {t('nav.signIn')}
                  </button>
                  <button
                    onClick={() => window.location.href = '/register'}
                    style={{
                      background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
                      color: '#fff', border: 'none',
                      borderRadius: 8, padding: '7px 16px',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    }}>
                    {t('nav.register')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </nav>

      {/* ── Mobile drawer backdrop ── */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 98,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div style={{
        position: 'fixed', top: 60, right: 0, bottom: 0,
        width: 280, zIndex: 99,
        background: 'rgba(8,6,20,0.98)',
        borderLeft: '1px solid rgba(120,80,255,0.2)',
        transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        padding: '16px 0 32px',
      }}>
        {/* Nav links */}
        <div style={{ padding: '0 8px' }}>
          {NAV_KEYS.map(({ to, key }) => {
            const active = to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                style={{
                  display: 'block',
                  padding: '13px 16px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#fff' : '#9090b0',
                  background: active ? 'rgba(120,80,255,0.18)' : 'transparent',
                  textDecoration: 'none',
                  marginBottom: 2,
                }}
              >
                {t(key)}
              </NavLink>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ margin: '16px 16px', height: 1, background: 'rgba(120,80,255,0.15)' }} />

        {/* Auth CTAs */}
        {!isAuthPage && (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => setShowContact(true)}
              style={{
                background: 'rgba(167,139,250,0.10)',
                color: '#a78bfa',
                border: '1px solid rgba(167,139,250,0.3)',
                borderRadius: 10, padding: '12px 16px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                textAlign: 'center',
              }}>
              {t('nav.registerInterest')}
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: '#c0c0e0',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '12px 16px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                textAlign: 'center',
              }}>
              {t('nav.signIn')}
            </button>
            <button
              onClick={() => window.location.href = '/register'}
              style={{
                background: 'linear-gradient(135deg, #7b5cf5, #5b8ff7)',
                color: '#fff', border: 'none',
                borderRadius: 10, padding: '12px 16px',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                textAlign: 'center',
              }}>
              {t('nav.register')}
            </button>
          </div>
        )}

        {/* Divider */}
        <div style={{ margin: '16px 16px', height: 1, background: 'rgba(120,80,255,0.15)' }} />

        {/* Language picker in drawer */}
        <div style={{ padding: '0 16px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6060a0', marginBottom: 8 }}>Language</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => selectLanguage(l)}
                style={{
                  padding: '8px 10px',
                  background: l.code === currentLang.code ? 'rgba(120,80,255,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${l.code === currentLang.code ? 'rgba(120,80,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 8,
                  color: l.code === currentLang.code ? '#fff' : '#9090b0',
                  fontSize: 12, fontWeight: l.code === currentLang.code ? 700 : 400,
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showContact && <ContactModal onClose={() => setShowContact(false)} defaultSubject="Early access to Explain.global" />}
    </>
  );
}
