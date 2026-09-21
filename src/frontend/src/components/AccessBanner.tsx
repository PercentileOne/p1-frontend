import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';

// The confirmation people land on after Stripe checkout (Francis, 2026-09-21): ?subscribed=1 / ?subscribe=cancelled and
// ?pass=purchased / ?pass=cancelled. Self-contained — mounted once at the app root so it works on whichever page Stripe returns to —
// and it never grants anything itself: access only ever comes from the payment webhook, so this is just a friendly message.
export function AccessBanner() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const signedIn = useAuthStore(s => !!s.token);
  const [msg, setMsg] = useState<{ text: string; good: boolean; manage?: boolean } | null>(null);

  useEffect(() => {
    const subscribed = params.get('subscribed');
    const subscribe = params.get('subscribe');
    const pass = params.get('pass');
    if (!subscribed && !subscribe && !pass) return;
    if (subscribed) setMsg({ text: "Welcome aboard — thank you for subscribing! It can take a few seconds to activate; you'll get 3 interviews a day.", good: true, manage: true });
    else if (pass === 'purchased') setMsg({ text: 'Thank you — your interview pass is on its way to your account (it can take a few seconds to appear).', good: true });
    else if (subscribe === 'cancelled' || pass === 'cancelled') setMsg({ text: "No problem — nothing was charged. You can subscribe whenever you're ready.", good: false });
    const next = new URLSearchParams(params);
    ['subscribed', 'subscribe', 'pass'].forEach(k => next.delete(k));
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!msg || !signedIn) return null;
  return (
    <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 400, width: 'calc(100% - 32px)', maxWidth: 520 }}>
      <div style={{ background: msg.good ? 'rgba(6,78,59,0.97)' : 'var(--bg2)', border: `1px solid ${msg.good ? 'rgba(52,211,153,0.5)' : 'var(--border)'}`, borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 12px 36px rgba(0,0,0,0.45)' }}>
        <div style={{ fontSize: 22 }}>{msg.good ? '🎉' : 'ℹ️'}</div>
        <div style={{ flex: 1, fontSize: 13, color: msg.good ? '#d1fae5' : 'var(--text-2)', lineHeight: 1.5 }}>{msg.text}</div>
        {msg.manage && <button onClick={() => navigate('/subscription')} style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Manage</button>}
        <button onClick={() => setMsg(null)} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: msg.good ? '#d1fae5' : 'var(--text-3)', fontSize: 18, cursor: 'pointer' }}>×</button>
      </div>
    </div>
  );
}
