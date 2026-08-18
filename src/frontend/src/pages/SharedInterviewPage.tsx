import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { InterviewReplayPlayer, type Chapter } from './InterviewSummaryPage';
import { InterviewResultsBody, type MCQQuestionResult, type MCQAnswerResult } from '../components/InterviewResultsBody';
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
  mcqQuestions?: MCQQuestionResult[];
  mcqResults?: MCQAnswerResult[];
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

  const answers = data.answers ?? [];
  const name = [data.cvCtx?.firstName, data.cvCtx?.lastName].filter(Boolean).join(' ');

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

      {/* Score card, MCQ bonus rounds, per-question breakdown — identical to the candidate's own private summary page */}
      <InterviewResultsBody
        answers={answers}
        mcqQuestions={data.mcqQuestions}
        mcqResults={data.mcqResults}
      />

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 12 }}>
        Powered by InterviewMe.global — practice interviews, free forever.
      </div>
    </div>
  );
}
