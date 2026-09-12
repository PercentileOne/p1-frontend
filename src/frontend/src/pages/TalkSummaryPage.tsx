import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../auth/authStore';
import { TalkSaveDecisionPanel } from '../components/TalkSaveDecisionPanel';
import type { TalkScoreResult, DimensionScore } from '../api/talksApi';

const API_BASE = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';

function scoreColor(pct: number) {
  if (pct >= 70) return '#34D399';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

function DimensionRow({ label, dim }: { label: string; dim: DimensionScore }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: scoreColor(dim.score) }}>{dim.score}</span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${dim.score}%` }} transition={{ duration: 0.6 }}
          style={{ height: '100%', background: scoreColor(dim.score) }} />
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>{dim.description}</div>
    </div>
  );
}

// Talk-room counterpart to InterviewSummaryPage.tsx — considerably simpler, since a talk has
// no per-question chapters/answers list, just one continuous transcript and one score. No
// upload-polling either (unlike Interviews, uploadTalk() is awaited synchronously before
// TalkRoomPage ever navigates here, so the document already exists by the time this loads).
export default function TalkSummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const authUser = useAuthStore(s => s.user);
  const authToken = useAuthStore(s => s.token);

  const hasRouteState = !!location.state;
  const [fetched, setFetched] = useState<Record<string, unknown> | null>(null);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (hasRouteState || !routeId || !authUser?.id || !authToken) return;
    setFetchState('loading');
    fetch(`${API_BASE}/api/talks/${encodeURIComponent(authUser.id)}/${encodeURIComponent(routeId)}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((data: Record<string, unknown>) => { setFetched(data); setFetchState('done'); })
      .catch(() => setFetchState('error'));
  }, [hasRouteState, routeId, authUser?.id, authToken]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const src = (location.state ?? fetched ?? {}) as any;
  const subject: string = src.subject ?? '';
  const scoreResult: TalkScoreResult | null = src.scoreResult ?? null;
  const transcript: string = src.transcript ?? '';
  const isShared: boolean = src.isShared ?? false;
  const talkId = routeId ?? src.id;

  if (fetchState === 'loading') {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>Loading your talk…</div>;
  }
  if (fetchState === 'error' && !hasRouteState) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>Couldn't find that talk.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: '-apple-system,"Segoe UI",sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <button onClick={() => navigate('/dashboard?tab=talks')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}>
          <ArrowLeft size={14} /> Back to My Talks
        </button>

        <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text)', marginBottom: '6px' }}>🎤 {subject}</h1>

        {scoreResult ? (
          <>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '18px' }}>
                <div style={{ fontSize: '40px', fontWeight: 900, color: scoreColor(scoreResult.overall) }}>{scoreResult.overall}</div>
                <div style={{ fontSize: '16px', color: 'var(--text-3)' }}>/ 100 — {scoreResult.grade}</div>
              </div>
              <DimensionRow label="Clarity" dim={scoreResult.clarity} />
              <DimensionRow label="Structure" dim={scoreResult.structure} />
              <DimensionRow label="Depth" dim={scoreResult.depth} />
              <DimensionRow label="Accuracy" dim={scoreResult.accuracy} />
              <DimensionRow label="Confidence" dim={scoreResult.confidence} />
              <DimensionRow label="Engagement" dim={scoreResult.engagement} />
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '4px' }}>
                <DimensionRow label="Time Management" dim={scoreResult.timeManagement} />
              </div>
              <div style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, marginTop: '8px' }}>
                {scoreResult.overallFeedback}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <TalkSaveDecisionPanel
                score={scoreResult.overall}
                subject={subject}
                candidateId={authUser?.id}
                talkId={talkId}
                alreadyShared={isShared}
              />
            </div>
          </>
        ) : (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '16px', fontSize: '13px', color: 'var(--amber)', marginBottom: '20px' }}>
            Scoring didn't complete for this talk, but it was still saved.
          </div>
        )}

        {transcript && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 24px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '12px' }}>Transcript</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{transcript}</div>
          </div>
        )}
      </div>
    </div>
  );
}
