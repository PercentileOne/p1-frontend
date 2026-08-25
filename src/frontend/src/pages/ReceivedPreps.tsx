import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Gift, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';

// Candidate-side half of the recruiter → candidate interview-prep loop. Backend endpoint
// (GET /api/interview-preps/received) matches purely on the logged-in user's own JWT email
// claim against every recruiter's sent preps — see Explain.Api.Features.InterviewPreps.
interface ReceivedPrep {
  id:            string;
  recruiterName: string;
  title:         string | null;
  firstName:     string;
  lastName:      string;
  role:          string;
  level:         string;
  interviewDate: string;
  jobSpecText:   string;
  cvText:        string | null;
  status:        string;
  createdAt:     string;
}

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

function levelColor(level: string) {
  return level === 'Standard' ? '#34D399' : level === 'Pro' ? '#F59E0B' : level === 'Expert' ? '#EF4444' : '#4F8EF7';
}

export default function ReceivedPreps() {
  const navigate = useNavigate();
  const token = useAuthStore(s => s.token);
  const [preps, setPreps] = useState<ReceivedPrep[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/interview-preps/received`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((data: ReceivedPrep[]) => setPreps(data))
      .catch(() => setError('Could not load your interview preps — please try again.'));
  }, [token]);

  // Straight to the real intake/review screen, not straight into the interview — the
  // candidate gets a last look at role/CV/difficulty (and can change any of it) before
  // clicking Start themselves, same principle as the recruiter side not auto-launching.
  function reviewAndStart(prep: ReceivedPrep) {
    navigate('/interview-pack/start', {
      state: {
        jobTitle: prep.role,
        jobSpec: prep.jobSpecText,
        cvText: prep.cvText ?? undefined,
        difficulty: prep.level,
      },
    });
  }

  return (
    <div style={{ padding: '32px 36px 60px', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Received Interview Preps</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.6 }}>
          Interview practice a recruiter has set up for you, ready whenever you are.
        </p>
      </div>

      {!preps && !error && (
        <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
      )}

      {error && (
        <div style={{ fontSize: 13, color: '#F87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '14px 16px' }}>
          {error}
        </div>
      )}

      {preps && preps.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, textAlign: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gift size={22} color="#34D399" />
          </div>
          <div style={{ fontWeight: 700, color: 'var(--text-2)' }}>No interview preps yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 340, lineHeight: 1.6 }}>
            When a recruiter sets up interview practice for you, it'll show up here.
          </div>
        </div>
      )}

      {preps && preps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {preps.map(prep => {
            const interviewDate = new Date(prep.interviewDate);
            const color = levelColor(prep.level);
            return (
              <div
                key={prep.id}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14,
                  padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34D399', marginBottom: 6 }}>
                      🎁 From {prep.recruiterName}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{prep.role}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color, background: `${color}18`, padding: '4px 10px', borderRadius: 20, flexShrink: 0 }}>
                    {prep.level}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: 12, color: 'var(--text-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={12} /> Interview: {interviewDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {interviewDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {prep.cvText && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34D399' }}>
                      ✓ Your CV is loaded — questions will be tailored to it
                    </div>
                  )}
                </div>

                <button
                  onClick={() => reviewAndStart(prep)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'linear-gradient(135deg,#34D399,#059669)', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Review &amp; Start Interview <ChevronRight size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
