import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';
import {
  getMyEntitlements, getMySubscription, openSubscriptionPortal, startSubscriptionCheckout, subscriptionsAvailable,
  type EntitlementStatus, type MySubscription,
} from '../api/entitlementsApi';

// "My plan" (Francis, 2026-09-21) — what you have, what's left today/this month, and a way to manage or cancel. Cancelling is done in
// Stripe's own customer portal (update card, invoices, cancel) so it is always one click away and never hidden.
const PLAN_LABEL: Record<EntitlementStatus['plan'], string> = {
  staff: 'Staff', complimentary: 'Complimentary access', subscriber: 'Subscriber', pass: 'Interview pass', prep: 'Recruiter interview prep', taster: 'Free interview', none: 'No active plan',
};

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const token = useAuthStore(s => s.token);
  const email = useAuthStore(s => s.user?.email ?? '');
  const [status, setStatus] = useState<EntitlementStatus | null>(null);
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [canSubscribe, setCanSubscribe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      void getMyEntitlements(token).then(setStatus);
      void getMySubscription(token).then(setSubscription);
    }
    void subscriptionsAvailable().then(setCanSubscribe);
  }, [token]);

  // Paying (or paid up until the period ends) — show Manage, whatever plan label outranks "subscriber" in the entitlement order.
  const renewsAt = subscription?.renewsAt ? new Date(subscription.renewsAt) : null;
  const hasSubscription = !!subscription && (subscription.status === 'active' || subscription.status === 'past_due'
    || (subscription.status === 'cancelled' && !!renewsAt && renewsAt.getTime() > Date.now()));
  // Cancelled in the portal but still paid up: Stripe keeps it "active" until the period ends, the server flags it via cancelledAt.
  const isCancelling = !!subscription && (subscription.status === 'cancelled' || !!subscription.cancelledAt);
  const fmtDate =(d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  async function go(fn: () => Promise<{ url?: string; error?: string }>) {
    setBusy(true); setError('');
    const r = await fn();
    if (r.url) { window.location.href = r.url; return; }
    setError(r.error ?? 'Something went wrong.'); setBusy(false);
  }

  const card: React.CSSProperties = { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 };
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 16px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0 }}>← Back</button>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>My account</h1>
        {email && <div style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 18px', overflowWrap: 'anywhere' }}>{email}</div>}

        <div style={card}>
          {!status ? <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading…</div> : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Current plan</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '4px 0 12px' }}>{PLAN_LABEL[status.plan]}</div>
              {status.plan === 'subscriber' && (
                <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
                  Today: <strong>{status.dailyUsed}/{status.dailyCap}</strong> interviews · This month: <strong>{status.monthlyUsed}/{status.monthlyCap}</strong>
                </div>
              )}
              {status.plan === 'prep' && <div style={{ fontSize: 14, color: 'var(--text-2)' }}><strong>{status.prepSessionsLeft ?? 0}</strong> practice session(s) left from your recruiter</div>}
              {status.plan === 'pass' && <div style={{ fontSize: 14, color: 'var(--text-2)' }}><strong>{status.passSessionsLeft}</strong> pass interview(s) left</div>}
              {status.tasterAvailable && <div style={{ fontSize: 14, color: '#34D399' }}>You have one free interview available.</div>}
              {status.plan === 'complimentary' && <div style={{ fontSize: 14, color: 'var(--text-2)' }}>You're an early member — enjoy complimentary access. Today: {status.dailyUsed}/{status.dailyCap} interviews.</div>}
            </>
          )}

          {hasSubscription && subscription && (
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 12 }}>
              Subscription: <strong>{isCancelling ? 'Cancelled' : subscription.status === 'past_due' ? 'Payment overdue' : 'Active'}</strong>
              {renewsAt && (isCancelling ? ` — access until ${fmtDate(renewsAt)}` : ` — renews ${fmtDate(renewsAt)}`)}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            {hasSubscription || status?.plan === 'subscriber' ? (
              <button disabled={busy} onClick={() => go(() => openSubscriptionPortal(token ?? ''))} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Manage or cancel subscription
              </button>
            ) : (
              <button disabled={busy || !canSubscribe} onClick={() => go(() => startSubscriptionCheckout(token ?? ''))} style={{ background: 'linear-gradient(135deg,#34D399,#047857)', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 800, cursor: canSubscribe ? 'pointer' : 'default', opacity: canSubscribe ? 1 : 0.55 }}>
                {canSubscribe ? 'Subscribe — £4.99 / month' : 'Subscriptions launching very soon'}
              </button>
            )}
            {error && <div style={{ fontSize: 12, color: '#F59E0B' }}>{error}</div>}
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, marginTop: 14 }}>
          A subscription includes up to 3 interviews a day and 10 a month, plus Learn, Career Coach, mock exams and more. You can cancel any time — you keep access until the end of the period you've paid for.
        </p>
        <button onClick={() => navigate('/dashboard?tab=settings')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: 4 }}>
          Delete my account
        </button>
      </div>
    </div>
  );
}
