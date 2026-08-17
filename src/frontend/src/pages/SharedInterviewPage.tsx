import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { InterviewReplayPlayer, type Chapter } from './InterviewSummaryPage';
import type { InterviewQuestion, ScoreResponse } from '../api/explainApi';

interface SharedAnswer {
  question: InterviewQuestion;
  answerText: string;
  score: ScoreResponse;
  answeredByVoice?: boolean;
}

interface SharedSession {
  role?: string;
  company?: string;
  overallScore: number;
  answers: SharedAnswer[];
  videoUrl: string | null;
  chapters: Chapter[];
  createdAt: string;
}

function scoreColor(pct: number) {
  if (pct >= 70) return '#34D399';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

// Public, unauthenticated view for a shared interview link / QR scan — read only,
// no Save/Discard/Mike-debrief/Learn tabs, just the score and the replay.
export default function SharedInterviewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedSession | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setState('error'); return; }
    const apiBase = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://explain-api.azurewebsites.net';
    fetch(`${apiBase}/api/interviews/shared/${encodeURIComponent(token)}`)
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((d: SharedSession) => { setData(d); setState('done'); })
      .catch(() => setState('error'));
  }, [token]);

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16, color: 'var(--text-2)' }}>
        <span style={{ fontSize: 28, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
        <div style={{ fontSize: 14 }}>Loading interview…</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (state === 'error' || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>This link isn't available</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 420 }}>
          The interview may have been removed, or the link has expired.
        </div>
      </div>
    );
  }

  const pct = Math.round(data.overallScore);
  const color = scoreColor(pct);

  return (
    <div style={{ maxWidth: 840, margin: '0 auto', padding: '40px 24px 60px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
        InterviewMe · Shared Interview
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #0d1f3c 0%, #0a0f1e 100%)', padding: '28px 32px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 6 }}>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{pct}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>/ 100</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {pct >= 80 ? 'Excellent' : pct >= 70 ? 'Strong' : pct >= 50 ? 'Good' : 'Developing'}
              </div>
              {data.role && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  {data.role}{data.company ? ` · ${data.company}` : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {data.videoUrl && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 10 }}>
            🎬 Interview Replay
          </div>
          <InterviewReplayPlayer url={data.videoUrl} chapters={data.chapters ?? []} />
        </div>
      )}

      {data.answers?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
            Questions &amp; Answers
          </div>
          {data.answers.map((a, i) => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                Q{i + 1} · {a.question.questionType} · {a.question.difficulty}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{a.question.questionText}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>
                {a.answerText || '(No answer recorded)'}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor(Math.round(a.score.overallScore * 100)) }}>
                {Math.round(a.score.overallScore * 100)}% overall
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 12 }}>
        Powered by InterviewMe.global — practice interviews, free forever.
      </div>
    </div>
  );
}
