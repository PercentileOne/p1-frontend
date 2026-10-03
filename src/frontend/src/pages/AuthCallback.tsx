// Receives the cross-domain handoff from another origin's login (the neutral gate at
// theinterviewchair.com/login, or the recruiter/employer role-mismatch recovery flow) — the
// token is validated against the shared backend (GET /auth/me) via authApi.getSession
// before being trusted, not just decoded and accepted at face value. Mirrors
// src/recruiter-portal/src/pages/AuthCallback.tsx — same pattern, different store.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, type ApiError } from '../api/authApi';
import { useAuthStore } from '../auth/authStore';
import { consumePostLoginPath, consumeTryRole, rememberNextFromSearch, rememberTryRoleFromHash } from '../auth/postLoginRedirect';

export default function AuthCallback() {
  const navigate = useNavigate();
  const storeLogin = useAuthStore(s => s.login);
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    rememberNextFromSearch(window.location.search);
    rememberTryRoleFromHash(window.location.hash);
    const token = searchParams.get('token');
    if (!token) { setError('Missing sign-in token.'); return; }

    authApi.getSession(token)
      .then(session => {
        storeLogin(token, {
          id: session.userId, email: session.email, name: session.name,
          firstName: session.firstName, role: session.role,
        }, session.permissions);
        // Straight from the public "Try it live" page: open the full interview's setup with the role they just practised already filled in.
        const tryRole = consumeTryRole();
        const dest = consumePostLoginPath(tryRole ? '/interview-pack/start' : '/dashboard');
        navigate(dest, { replace: true, state: tryRole && dest === '/interview-pack/start' ? { jobTitle: tryRole } : undefined });
      })
      .catch((err: ApiError) => setError(err?.error ?? 'Sign-in failed.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'linear-gradient(135deg,#060a12 0%,#080d1a 50%,#0a0f1e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 24,
    }}>
      {error ? (
        <div>
          <div style={{ color: '#F87171', marginBottom: 12 }}>{error}</div>
          <a href="/login" style={{ color: '#4F8EF7' }}>Back to sign in</a>
        </div>
      ) : (
        'Signing you in…'
      )}
    </div>
  );
}
