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
  cvCtx?: { firstName?: string; lastName?: string };
}

const DIMENSIONS = ['relevance', 'clarity', 'depth', 'confidence'] as const;

function scoreColor(pct: number) {
  if (pct >= 70) return '#34D399';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

function scoreLabel(pct: number) {
  if (pct >= 80) return 'Excellent';
  if (pct >= 70) return 'Strong';
  if (pct >= 50) return 'Good';
  return 'Developing';
}

function avgDimension(answers: SharedAnswer[], dim: (typeof DIMENSIONS)[number]) {
  if (!answers.length) return 0;
  return answers.reduce((s, a) => s + (a.score as unknown as Record<string, number>)[dim], 0) / answers.length;
}

// Public, unauthenticated view for a shared interview link / QR scan. Recruiters landing
// here overwhelmingly want to watch the interview first — the video is the centerpiece,
// not an optional extra bolted onto a Q&A transcript.
export default function SharedInterviewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedSession | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setState('error'); return; }
    const apiBase = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';
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
  const answers = data.answers ?? [];
  const name = [data.cvCtx?.firstName, data.cvCtx?.lastName].filter(Boolean).join(' ');
  const strengths = DIMENSIONS.filter(d => avgDimension(answers, d) >= 0.65);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: 'linear-gradient(135deg, #34D399, #4F8EF7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff',
        }}>IM</div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          InterviewMe.global · Shared Interview
        </div>
      </div>

      <div>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', margin: '0 0 6px' }}>
          {name ? `${name}'s ` : ''}{data.role ?? 'Interview'}{data.company ? ` at ${data.company}` : ''}
        </h1>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Recorded on InterviewMe.global — the world's first interview broadcast platform.</div>
      </div>

      {/* Video first — this is what a recruiter actually came here to do */}
      {data.videoUrl ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            🎬 Watch the Full Interview
          </div>
          <InterviewReplayPlayer url={data.videoUrl} chapters={data.chapters ?? []} />
        </div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px dashed var(--border)', borderRadius: 16, padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          No video recording was attached to this session.
        </div>
      )}

      {/* Score hero */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #0d1f3c 0%, #0a0f1e 100%)', padding: '28px 32px', borderBottom: strengths.length ? '1px solid var(--border)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 6 }}>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{pct}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>/ 100</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {scoreLabel(pct)}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Overall interview score</div>
            </div>
          </div>
        </div>
        {strengths.length > 0 && (
          <div style={{ padding: '18px 32px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Strengths</span>
            {strengths.map(s => (
              <span key={s} style={{ fontSize: 12, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 20, padding: '4px 12px', textTransform: 'capitalize' }}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {answers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
            Questions &amp; Answers
          </div>
          {answers.map((a, i) => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
                Q{i + 1} · {a.question.questionType} · {a.question.difficulty}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{a.question.questionText}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>
                {a.answerText || '(No answer recorded)'}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-3)' }}>
                <span>Relevance: <strong style={{ color: 'var(--text-2)' }}>{Math.round(a.score.relevance * 100)}%</strong></span>
                <span>Clarity: <strong style={{ color: 'var(--text-2)' }}>{Math.round(a.score.clarity * 100)}%</strong></span>
                <span>Depth: <strong style={{ color: 'var(--text-2)' }}>{Math.round(a.score.depth * 100)}%</strong></span>
                <span>Confidence: <strong style={{ color: 'var(--text-2)' }}>{Math.round(a.score.confidence * 100)}%</strong></span>
                <span style={{ color: scoreColor(Math.round(a.score.overallScore * 100)), fontWeight: 700 }}>
                  Overall: {Math.round(a.score.overallScore * 100)}%
                </span>
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
