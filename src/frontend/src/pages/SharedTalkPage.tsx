import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SHARE_PLATFORMS } from '../components/SaveDecisionPanel';
import type { TalkScoreResult, DimensionScore } from '../api/talksApi';

interface SharedTalk {
  subject?: string;
  scoreResult?: TalkScoreResult | null;
  transcript?: string;
  createdAt: string;
}

function scoreColor(pct: number) {
  if (pct >= 70) return '#34D399';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

function DimensionRow({ label, dim }: { label: string; dim: DimensionScore }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: scoreColor(dim.score) }}>{dim.score}</span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${dim.score}%` }} transition={{ duration: 0.6 }} style={{ height: '100%', background: scoreColor(dim.score) }} />
      </div>
    </div>
  );
}

// Public, unauthenticated view for a shared talk link/QR scan — sibling to
// SharedInterviewPage.tsx, considerably simpler (no video yet, no per-question chapters).
export default function SharedTalkPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedTalk | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!token) { setState('error'); return; }
    const apiBase = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';
    fetch(`${apiBase}/api/talks/shared/${encodeURIComponent(token)}`)
      .then(res => { if (!res.ok) throw new Error(String(res.status)); return res.json(); })
      .then((d: SharedTalk) => { setData(d); setState('done'); })
      .catch(() => setState('error'));
  }, [token]);

  if (state === 'loading') {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-2)' }}>Loading talk…</div>;
  }
  if (state === 'error' || !data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>This link isn't available</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 420 }}>The talk may have been removed, or the link has expired.</div>
      </div>
    );
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://candidate.theinterviewchair.com/shared-talk/${token}`;
  const shareText = `Watch this talk on "${data.subject ?? 'a subject'}" scored on TheInterviewChair.com:`;
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 60px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text)' }}>🎤 {data.subject}</h1>

      {data.scoreResult && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '18px' }}>
            <div style={{ fontSize: '40px', fontWeight: 900, color: scoreColor(data.scoreResult.overall) }}>{data.scoreResult.overall}</div>
            <div style={{ fontSize: '16px', color: 'var(--text-3)' }}>/ 100 — {data.scoreResult.grade}</div>
          </div>
          <DimensionRow label="Clarity" dim={data.scoreResult.clarity} />
          <DimensionRow label="Structure" dim={data.scoreResult.structure} />
          <DimensionRow label="Depth" dim={data.scoreResult.depth} />
          <DimensionRow label="Accuracy" dim={data.scoreResult.accuracy} />
          <DimensionRow label="Confidence" dim={data.scoreResult.confidence} />
          <DimensionRow label="Engagement" dim={data.scoreResult.engagement} />
        </div>
      )}

      {data.transcript && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '12px' }}>Transcript</div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.transcript}</div>
        </div>
      )}

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {SHARE_PLATFORMS.map(p => (
            <a key={p.id} href={p.getUrl(shareUrl, shareText)} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: `${p.color}18`, border: `1px solid ${p.color}40`, borderRadius: '10px', padding: '13px 16px', color: p.id === 'x' ? '#fff' : p.color, textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>
              {p.icon} {p.label}
            </a>
          ))}
        </div>
        <button onClick={copyLink} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: linkCopied ? 'rgba(52,211,153,0.1)' : 'var(--bg3)', border: `1px solid ${linkCopied ? 'rgba(52,211,153,0.35)' : 'var(--border)'}`, borderRadius: '10px', padding: '13px', color: linkCopied ? '#34D399' : 'var(--text-2)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {linkCopied ? '✓ Link copied!' : 'Copy share link'}
        </button>
      </div>
    </div>
  );
}
