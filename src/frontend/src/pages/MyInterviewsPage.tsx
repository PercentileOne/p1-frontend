import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';

interface InterviewSummary {
  id: string;
  createdAt: string;
  role: string | null;
  company: string | null;
  overallScore: number;
  isShared: boolean;
  hasVideo: boolean;
}

function scoreColor(pct: number) {
  if (pct >= 70) return '#34D399';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyInterviewsPage() {
  const navigate = useNavigate();
  const authToken = useAuthStore(s => s.token);
  const [items, setItems] = useState<InterviewSummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!authToken) return;
    const apiBase = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://explain-api.azurewebsites.net';
    fetch(`${apiBase}/api/interviews`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((data: InterviewSummary[]) => setItems(data))
      .catch(() => setError(true));
  }, [authToken]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            My Interviews
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Every session you've saved — replay, share, or pick up where you left off.</div>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'linear-gradient(135deg, #34D399, #4F8EF7)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
          🎙️ Practice Interview
        </button>
      </div>

      {items === null && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 14, color: 'var(--text-3)' }}>
          <span style={{ fontSize: 26, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
          <div style={{ fontSize: 13 }}>Loading your interviews…</div>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          Couldn't load your interviews right now — try refreshing.
        </div>
      )}

      {items?.length === 0 && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
          padding: '56px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
        }}>
          <div style={{ fontSize: 32 }}>🎙️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>No saved interviews yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 380 }}>
            Finish a practice interview and choose "Save this interview" to see it here — replay, share link, and QR code included.
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => {
            const pct = Math.round(item.overallScore);
            const color = scoreColor(pct);
            return (
              <div
                key={item.id}
                onClick={() => navigate(`/interview-summary/${item.id}`)}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
                  padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 20,
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(79,142,247,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${color}18`, border: `1px solid ${color}40`,
                  fontSize: 17, fontWeight: 900, color,
                }}>
                  {pct}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                    {item.role ?? 'Practice Interview'}{item.company ? ` · ${item.company}` : ''}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(item.createdAt)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {item.hasVideo && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4F8EF7', background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 20, padding: '4px 10px' }}>
                      🎬 Replay
                    </span>
                  )}
                  {item.isShared && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 20, padding: '4px 10px' }}>
                      🔗 Shared
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
