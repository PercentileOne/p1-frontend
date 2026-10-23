import { useEffect, useState } from 'react';
import { useAuthStore } from '../auth/authStore';
import SiteGuide from '../components/SiteGuide';

// Admin-only test page for the homepage talking guide (Francis, 2026-10-22), with the test boxes, plus the switch that opens the public version on the marketing homepage.
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.theinterviewchair.com';

export default function DevSiteAgent() {
  const token = useAuthStore(s => s.token);
  const [publicOn, setPublicOn] = useState<boolean | null>(null);
  const [switchError, setSwitchError] = useState('');
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!token) return;
    void fetch(`${API_BASE}/api/admin/site-agent/public`, { headers: auth }).then(r => r.ok ? r.json() : null).then(b => { if (b) setPublicOn(!!b.enabled); }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function flip(on: boolean) {
    setSwitchError('');
    try {
      const r = await fetch(`${API_BASE}/api/admin/site-agent/public`, { method: 'PUT', headers: auth, body: JSON.stringify({ on }) });
      if (!r.ok) throw new Error(`The switch did not change (${r.status}).`);
      setPublicOn(on);
    } catch (e) { setSwitchError(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '28px 16px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>Site guide</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 18px', lineHeight: 1.55 }}>
          Admin test page. Talk to the guide the way a homepage visitor would. Each conversation stops by itself after 5 minutes. Use headphones if you can: the guide listens while it talks, and speakers can feed its own voice back to it.
        </p>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', fontSize: 13, lineHeight: 1.5 }}>
            <strong>Show the guide on the public homepage: {publicOn === null ? '…' : publicOn ? 'ON' : 'OFF'}</strong>
            <div style={{ color: 'var(--text-3)' }}>Off by default. When on, it appears above &ldquo;Choose your interviewer&rdquo; on computers. Each visitor is limited to 3 conversations a day and the whole site to 100 a day; robots are refused.</div>
          </div>
          <button type="button" disabled={publicOn === null} onClick={() => void flip(!publicOn)}
            style={{ background: publicOn ? 'transparent' : 'linear-gradient(135deg,#34D399,#047857)', border: publicOn ? '1px solid rgba(239,68,68,0.4)' : 'none', color: publicOn ? '#EF4444' : '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {publicOn ? 'Turn off' : 'Turn on'}
          </button>
          {switchError && <div role="alert" style={{ flexBasis: '100%', fontSize: 13, color: '#F59E0B' }}>{switchError}</div>}
        </div>

        <SiteGuide />
      </div>
    </div>
  );
}
