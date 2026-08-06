import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChairSpinner } from '../components/ChairSpinner';

export default function AuthVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setError('No token found in link.'); return; }

    fetch('/api/auth-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) { setError(data.error || 'Link invalid or expired.'); return; }
        signIn(data.token, data.email, data.name);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => setError('Something went wrong. Please try again.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: '#080812',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '16px', fontFamily: '-apple-system,"Segoe UI",sans-serif',
    }}>
      {error ? (
        <div style={{ textAlign: 'center', maxWidth: '360px', padding: '0 24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔗</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Link expired or invalid</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>{error}</div>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '12px 24px', background: 'linear-gradient(135deg,#4F8EF7,#a78bfa)',
              border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700,
              fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <ChairSpinner label="Signing you in…" size={100} />
      )}
    </div>
  );
}
