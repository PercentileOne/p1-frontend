import { useEffect, useState } from 'react';
import { useAuthStore } from '../auth/authStore';
import {
  startSubscriptionCheckout, startPassCheckout, subscriptionsAvailable,
  type StartInterviewResult,
} from '../api/entitlementsApi';

// Shown when the server says a person can't start an interview right now (Francis, 2026-09-21). The wording comes from the server's
// `message` (so it always matches the rule that fired); this adds the ways forward. Daily/monthly limits get a gentler screen than
// "you haven't paid": a subscriber who is simply out of interviews for today shouldn't be sold a subscription they already have.
export function PaywallDialog({ result, onClose }: { result: StartInterviewResult; onClose: () => void }) {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const [canSubscribe, setCanSubscribe] = useState(false);
  const [busy, setBusy] = useState<'sub' | 'pass' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { void subscriptionsAvailable().then(setCanSubscribe); }, []);

  const isLimit = result.code === 'daily-cap' || result.code === 'monthly-cap';
  const needsVerify = result.code === 'verify-email';

  async function go(kind: 'sub' | 'pass') {
    setBusy(kind); setError('');
    const r = kind === 'sub'
      ? await startSubscriptionCheckout(token ?? '')
      : await startPassCheckout({ email: user?.email ?? '', name: user?.name ?? '' });
    if (r.url) { window.location.href = r.url; return; }
    setError(r.error ?? 'Something went wrong — please try again.');
    setBusy(null);
  }

  const heading = needsVerify ? 'Verify your email first'
    : isLimit ? (result.code === 'daily-cap' ? "That's today's interviews done" : "That's this month's interviews done")
    : result.code === 'taster-used' ? 'You\'ve had your free interview'
    : 'Ready to keep practising?';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}>
      <div role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: 440, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 18, padding: '28px 26px', textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>{isLimit ? '⏳' : needsVerify ? '✉️' : '🎯'}</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px' }}>{heading}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 20px' }}>{result.message}</p>

        {!needsVerify && result.code !== 'monthly-cap' && result.code !== 'daily-cap' && (
          <button
            onClick={() => go('sub')} disabled={busy !== null || !canSubscribe}
            style={{ width: '100%', background: 'linear-gradient(135deg,#34D399,#047857)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: busy || !canSubscribe ? 'default' : 'pointer', opacity: canSubscribe ? 1 : 0.55, marginBottom: 10 }}
          >
            {busy === 'sub' ? 'Opening checkout…' : canSubscribe ? 'Subscribe — £4.99 / month' : 'Subscriptions launching very soon'}
          </button>
        )}
        {!needsVerify && (
          <button
            onClick={() => go('pass')} disabled={busy !== null}
            style={{ width: '100%', background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', marginBottom: 10 }}
          >
            {busy === 'pass' ? 'Opening checkout…' : 'One-off pass — £5.99 (10 interviews, 7 days)'}
          </button>
        )}
        {error && <div style={{ fontSize: 12, color: '#F59E0B', margin: '4px 0 10px' }}>{error}</div>}
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', padding: 8 }}>Not now</button>
      </div>
    </div>
  );
}
