import { useState } from 'react';

const PASSCODE = '@Horizon31585';

export default function InvestorGate({ onAuth }: { onAuth: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value === PASSCODE) {
      sessionStorage.setItem('investor_auth', '1');
      onAuth();
    } else {
      setError(true);
      setShake(true);
      setValue('');
      setTimeout(() => { setError(false); setShake(false); }, 3000);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#07060f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <style>{`
        @keyframes gateIn { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .gate-card { animation: gateIn 0.7s cubic-bezier(0.16,1,0.3,1); }
        .gate-shake { animation: shake 0.45s ease; }
        .gate-pulse { animation: pulse 2.5s ease infinite; }
      `}</style>

      <div className="gate-card" style={{
        width: '100%', maxWidth: 420,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(79,142,247,0.2)',
        borderRadius: 22, padding: '48px 40px',
        textAlign: 'center', boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 6 }}>
          <img src="/assets/explain-logo.svg" width={52} height={52} alt="Explain" style={{ borderRadius: '50%' }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-0.02em', marginBottom: 28 }}>
          explain<span style={{ color: '#4F8EF7' }}>.global</span>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#ef4444',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 6, padding: '4px 12px', marginBottom: 20,
        }}>
          🔒 Confidential — Investor & Partner Portal
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Access Required
        </h1>
        <p style={{ fontSize: 14, color: '#6060a0', lineHeight: 1.7, marginBottom: 32 }}>
          This portal contains confidential business information<br />
          prepared for investors and strategic partners.
        </p>

        <form onSubmit={submit} className={shake ? 'gate-shake' : ''}>
          <input
            type="password"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Enter access code"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: error ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(79,142,247,0.25)'}`,
              borderRadius: 10, padding: '13px 16px',
              color: '#fff', fontSize: 15, outline: 'none',
              textAlign: 'center', letterSpacing: '0.12em',
              marginBottom: error ? 8 : 14, transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          />
          {error && (
            <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>
              Incorrect access code. Please try again.
            </p>
          )}
          <button type="submit" style={{
            width: '100%',
            background: 'linear-gradient(135deg, #4F8EF7, #7b5cf5)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '14px 16px', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.02em',
            boxShadow: '0 8px 32px rgba(79,142,247,0.3)',
          }}>
            Access Business Plan →
          </button>
        </form>

        <div className="gate-pulse" style={{ marginTop: 28, fontSize: 11, color: '#303050' }}>
          Explain.Global · Percentile.One<br />
          Strictly Confidential — Not for distribution
        </div>
      </div>
    </div>
  );
}
