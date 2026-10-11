import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';

// A friendly heads-up for people who open the signed-in portal on a phone (Francis, 2026-10-11): the portal and the full interview room were built for
// a laptop or tablet, and on a phone some pages scroll sideways. A proper phone experience is being designed, so until then we say so instead of
// letting people think the product is broken. Never shown on the public pages (the free demo at /try works well on a phone) or inside a live
// interview/talk room (it would sit on top of the controls). Dismissal is remembered for two weeks on this device.

const KEY = 'tic.phoneHeadsUp.dismissedAt';
const HIDE_DAYS = 14;
const QUIET_PREFIXES = ['/try', '/login', '/register', '/forgot-password', '/reset-password', '/auth', '/hello', '/learn-anything', '/questions', '/shared', '/interview/', '/talk/', '/interview-pack', '/talk-pack', '/staff', '/dev'];

function onAPhone(): boolean {
  if (typeof window === 'undefined') return false;
  const narrow = window.matchMedia ? window.matchMedia('(max-width: 640px)').matches : window.innerWidth <= 640;
  const touch = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  return narrow && touch;
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(KEY));
    return !!at && Date.now() - at < HIDE_DAYS * 86_400_000;
  } catch { return false; }
}

export function PhoneHeadsUp() {
  const signedIn = useAuthStore(s => !!s.token);
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(true);

  useEffect(() => { setHidden(!onAPhone() || recentlyDismissed()); }, []);

  if (hidden || !signedIn || pathname === '/' || QUIET_PREFIXES.some(p => pathname === p || pathname.startsWith(p))) return null;

  const dismiss = () => {
    setHidden(true);
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private window: it simply comes back next visit */ }
  };

  return (
    <div role="status" style={{ position: 'fixed', left: 12, right: 12, bottom: 'max(12px, env(safe-area-inset-bottom))', zIndex: 350 }}>
      <div style={{ background: 'var(--bg2, #0f172a)', border: '1px solid var(--border, rgba(148,163,184,0.35))', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', boxShadow: '0 12px 36px rgba(0,0,0,0.45)' }}>
        <div aria-hidden="true" style={{ fontSize: 20, lineHeight: 1.2 }}>💻</div>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-2, #cbd5e1)' }}>
          <strong style={{ color: 'var(--text, #f1f5f9)' }}>Best on a laptop or tablet for now.</strong>{' '}
          We are building a proper phone experience. Until it arrives, some pages may scroll sideways.
        </div>
        <button onClick={dismiss} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: 'var(--text-3, #94a3b8)', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 4 }}>×</button>
      </div>
    </div>
  );
}
