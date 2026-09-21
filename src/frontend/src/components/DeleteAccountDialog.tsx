import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '../auth/authStore';
import { deleteMyAccount } from '../api/accountApi';

// Permanent account deletion (Francis, 2026-09-21; privacy policy: right to erasure). Typing your own email is the confirmation, so it
// can't be done by an accidental click. On success we sign out and send the person to the public site.
export default function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const token = useAuthStore(s => s.token);
  const email = useAuthStore(s => s.user?.email ?? '');
  const logout = useAuthStore(s => s.logout);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const matches = !!email && typed.trim().toLowerCase() === email.toLowerCase();

  async function confirm() {
    if (!token || !matches) return;
    setBusy(true); setError('');
    const r = await deleteMyAccount(token, typed.trim());
    if (!r.ok) { setError(r.error); setBusy(false); return; }
    try { await logout(); } catch { /* the account is gone; sign-out is best effort */ }
    window.location.href = 'https://www.theinterviewchair.com/';
  }

  // A portal: a fixed overlay inside an animated (transformed) settings card would be positioned relative to the card, not the screen.
  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(4,6,14,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div role="dialog" aria-modal="true" aria-label="Delete your account" style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg2, #0f1829)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 16, padding: 24 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 19, fontWeight: 800, color: 'var(--text, #f1f5f9)' }}>Delete your account?</h2>
        <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)' }}>This is permanent and can't be undone. We will delete:</p>
        <ul style={{ margin: '0 0 12px 18px', padding: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--text-2, #cbd5e1)' }}>
          <li>your profile, photos and interview recordings</li>
          <li>your interviews, exams, talks and saved questions</li>
          <li>your Career Coach chats, CV analyses and alerts</li>
          <li>your sign-in history and account</li>
        </ul>
        <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: 'var(--text-2, #cbd5e1)' }}>
          Any subscription is <strong>cancelled immediately</strong>, with no refund for the rest of the period. We keep only the payment records we're required to keep for accounting.
        </p>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-3, #94a3b8)', marginBottom: 6 }}>
          Type your email address to confirm{email ? <> (<span style={{ color: 'var(--text, #f1f5f9)' }}>{email}</span>)</> : null}
        </label>
        <input
          value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false} disabled={busy}
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3, #14213a)', border: '1px solid var(--border, rgba(255,255,255,0.12))', borderRadius: 10, padding: '10px 12px', color: 'var(--text, #f1f5f9)', fontSize: 14, outline: 'none' }}
        />
        {error && <div style={{ marginTop: 12, fontSize: 12.5, color: '#F59E0B' }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={{ background: 'var(--bg3, #14213a)', color: 'var(--text, #f1f5f9)', border: '1px solid var(--border, rgba(255,255,255,0.12))', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Keep my account
          </button>
          <button
            onClick={() => void confirm()} disabled={!matches || busy}
            style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: matches && !busy ? 'pointer' : 'default', opacity: matches && !busy ? 1 : 0.45 }}
          >
            {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
