import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { InterviewReplayPlayer, type Chapter } from './InterviewSummaryPage';
import { InterviewResultsBody, type MCQQuestionResult, type MCQAnswerResult } from '../components/InterviewResultsBody';
import { SHARE_PLATFORMS } from '../components/SaveDecisionPanel';
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
  candidateName?: string;
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
  const [linkCopied, setLinkCopied] = useState(false);

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
  // cvCtx is only populated if a CV happened to be parsed for this specific session —
  // candidateName (the real account name) is always available, so it's the reliable fallback.
  const name = [data.cvCtx?.firstName, data.cvCtx?.lastName].filter(Boolean).join(' ') || data.candidateName || '';
  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://candidate.interviewme.global/shared/${token}`;
  const shareText = name
    ? `Watch ${name}'s ${data.role ?? 'interview'} on InterviewMe.global:`
    : `Watch this ${data.role ?? 'interview'} on InterviewMe.global:`;
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  const createdAtLabel = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      + ' · ' + new Date(data.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;

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
        {createdAtLabel && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{createdAtLabel}</div>}
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

      {/* Anyone viewing — a recruiter, a colleague, a friend — can pass this along too */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Know someone who should see this?</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>Share this interview with your team or network.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 10 }}>
          {SHARE_PLATFORMS.map(p => (
            <a key={p.id}
              href={p.getUrl(shareUrl, shareText)}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: `${p.color}18`, border: `1px solid ${p.color}40`,
                borderRadius: 10, padding: '12px 16px',
                color: p.id === 'x' ? '#fff' : p.color,
                textDecoration: 'none', fontSize: 13, fontWeight: 700,
              }}
            >
              {p.icon} {p.label}
            </a>
          ))}
        </div>
        <button onClick={copyLink} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: linkCopied ? 'rgba(52,211,153,0.1)' : 'var(--bg3)',
          border: `1px solid ${linkCopied ? 'rgba(52,211,153,0.35)' : 'var(--border)'}`,
          borderRadius: 10, padding: 12,
          color: linkCopied ? '#34D399' : 'var(--text-2)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {linkCopied ? '✓ Link copied!' : 'Copy share link'}
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 12 }}>
        Powered by InterviewMe.global — practice interviews, free forever.
      </div>
    </div>
  );
}
