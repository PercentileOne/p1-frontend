import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../auth/authStore';

type SaveStep = 'decide' | 'saving' | 'saved' | 'qr' | 'share' | 'discarded';

const PLATFORMS = [
  {
    id: 'linkedin', label: 'LinkedIn', color: '#0A66C2',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    getUrl: (url: string, text: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
  },
  {
    id: 'whatsapp', label: 'WhatsApp', color: '#25D366',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
    getUrl: (url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
  {
    id: 'x', label: 'X', color: '#fff',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    getUrl: (url: string, text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    id: 'email', label: 'Email', color: '#94a3b8',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    getUrl: (url: string, text: string) => `mailto:?subject=${encodeURIComponent('My InterviewMe Score')}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
];

interface Props {
  score: number;           // 0–100
  role?: string;
  company?: string;
  candidateId?: string;
  interviewId?: string;    // the session's Cosmos doc id — set by InterviewRoomPage's auto-upload
  apiBase?: string;
  onSaved?: (shareToken: string, shareUrl: string) => void;
  onDiscarded?: () => void;
}

const API_BASE = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';

export function SaveDecisionPanel({
  score,
  role,
  company,
  candidateId,
  interviewId,
  onSaved,
  onDiscarded,
}: Props) {
  const authToken = useAuthStore(s => s.token);
  const [step, setStep] = useState<SaveStep>('decide');
  const [, setShareToken] = useState('');
  const [shareUrl, setShareUrl]     = useState('');
  const [qrDataUri, setQrDataUri]   = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError]           = useState('');

  const shareText = `I scored ${score}% on my ${role ?? 'job'} interview with InterviewMe — the AI interview platform. Watch my full session:`;

  // The recording + full answer data are already uploaded automatically the moment the
  // interview room closes — "Save" here just needs to publish a share link + QR for it.
  const handleSave = async () => {
    if (!candidateId || !interviewId) {
      setError("This session isn't ready to share yet — give it a moment and try again.");
      return;
    }
    setStep('saving');
    setError('');
    try {
      const doShare = () => fetch(
        `${API_BASE}/api/interviews/${encodeURIComponent(candidateId)}/${encodeURIComponent(interviewId)}/share`,
        { method: 'POST', headers: { Authorization: `Bearer ${authToken ?? ''}` } }
      );
      // The upload can still be in flight when the summary page first appears — one retry
      // after a short wait covers that race without the user having to click Save twice.
      let shareRes = await doShare();
      if (shareRes.status === 404) {
        await new Promise(r => setTimeout(r, 2000));
        shareRes = await doShare();
      }
      if (!shareRes.ok) throw new Error('Share failed');
      const shareData = await shareRes.json() as { shareToken: string; shareUrl: string; qrDataUri: string };
      setShareToken(shareData.shareToken);
      setShareUrl(shareData.shareUrl);
      setQrDataUri(shareData.qrDataUri);
      setStep('saved');
      onSaved?.(shareData.shareToken, shareData.shareUrl);
      setTimeout(() => setStep('qr'), 1400);
    } catch {
      setError('Something went wrong. Please try again.');
      setStep('decide');
    }
  };

  const handleDiscard = () => {
    setStep('discarded');
    onDiscarded?.();
    if (candidateId && interviewId) {
      fetch(`${API_BASE}/api/interviews/${encodeURIComponent(candidateId)}/${encodeURIComponent(interviewId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken ?? ''}` },
      }).catch(() => { /* best-effort */ });
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const downloadQr = () => {
    if (!qrDataUri) return;
    const a = document.createElement('a');
    a.href = qrDataUri;
    a.download = 'interviewme-qr.png';
    a.click();
  };

  return (
    <AnimatePresence mode="wait">

      {/* ── STEP 1: Decide ── */}
      {step === 'decide' && (
        <motion.div key="decide"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}
        >
          {/* Gradient header band */}
          <div style={{ background: 'linear-gradient(135deg, #0d1f3c 0%, #0a0f1e 100%)', padding: '28px 32px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.7)', marginBottom: '10px' }}>
              Session complete
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '6px' }}>
              <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, color: score >= 70 ? '#34D399' : score >= 50 ? '#F59E0B' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                {score}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>/ 100</div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: score >= 70 ? '#34D399' : score >= 50 ? '#F59E0B' : '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {score >= 80 ? 'Excellent' : score >= 70 ? 'Strong' : score >= 50 ? 'Good' : 'Developing'}
                </div>
                {role && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{role}{company ? ` · ${company}` : ''}</div>}
              </div>
            </div>
          </div>

          {/* Decision */}
          <div style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>What would you like to do with this session?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '24px' }}>
              Saving publishes your interview so you can get a shareable link, embed a QR code in your CV, and let recruiters watch, like, and send you feedback.
            </div>

            {error && (
              <div style={{ fontSize: '13px', color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={handleSave} style={{
                flex: 1, minWidth: '200px', padding: '16px 24px', borderRadius: '13px',
                background: 'linear-gradient(135deg, #34D399, #059669)',
                color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '14px', fontWeight: 800,
                boxShadow: '0 8px 24px rgba(52,211,153,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
                Save this interview
              </button>

              <button onClick={handleDiscard} style={{
                flex: 1, minWidth: '200px', padding: '16px 24px', borderRadius: '13px',
                background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)',
                border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '14px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                Discard — it was practice
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── STEP 2: Saving ── */}
      {step === 'saving' && (
        <motion.div key="saving"
          initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '56px 32px', textAlign: 'center' }}
        >
          <div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid rgba(52,211,153,0.2)', borderTopColor: '#34D399', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>Saving your interview…</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Uploading and generating your share link</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </motion.div>
      )}

      {/* ── STEP 2.5: Saved confirmation flash ── */}
      {step === 'saved' && (
        <motion.div key="saved"
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(79,142,247,0.06))', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '20px', padding: '56px 32px', textAlign: 'center' }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#34D399', marginBottom: '6px' }}>Interview saved!</div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>Generating your QR code…</div>
        </motion.div>
      )}

      {/* ── STEP 3: QR Code ── */}
      {step === 'qr' && (
        <motion.div key="qr"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}
        >
          <div style={{ background: 'linear-gradient(135deg, #0d1f3c, #0a0f1e)', padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '28px' }}>📄</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Add your interview to your CV</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Recruiters scan the QR code and watch your video — no cover letter needed</div>
            </div>
          </div>

          <div style={{ padding: '32px', display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* QR code */}
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              {qrDataUri ? (
                <img src={qrDataUri} alt="Your interview QR code" style={{ width: 160, height: 160, borderRadius: '12px', background: '#fff', padding: '8px' }} />
              ) : (
                /* Demo QR placeholder */
                <div style={{ width: 160, height: 160, borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    {/* Simple QR-style grid */}
                    {[0,1,2,3,4,5,6].map(r => [0,1,2,3,4,5,6].map(c => {
                      const inCorner = (r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3);
                      const fill = inCorner ? '#34D399' : Math.random() > 0.5 ? '#4F8EF7' : 'transparent';
                      return <rect key={`${r}-${c}`} x={c * 11 + 1} y={r * 11 + 1} width="10" height="10" rx="2" fill={fill} opacity="0.7" />;
                    }))}
                  </svg>
                </div>
              )}
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '8px' }}>Points to your interview page</div>
            </div>

            {/* Instructions */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {[
                  { n: '1', text: 'Download the QR code below' },
                  { n: '2', text: 'Paste it into your CV — top right corner works well' },
                  { n: '3', text: 'Recruiters scan it and watch your full interview' },
                ].map(({ n, text }) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#34D399', flexShrink: 0 }}>{n}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>{text}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={downloadQr} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 22px', borderRadius: '11px',
                  background: 'linear-gradient(135deg, #34D399, #059669)',
                  color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '13px', fontWeight: 800,
                  boxShadow: '0 6px 18px rgba(52,211,153,0.28)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download QR for my CV
                </button>
                <button onClick={() => setStep('share')} style={{
                  padding: '12px 22px', borderRadius: '11px',
                  background: 'rgba(255,255,255,0.05)', color: 'var(--text-2)',
                  border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '13px', fontWeight: 700,
                }}>
                  Skip →
                </button>
              </div>
            </div>
          </div>

          <div style={{ padding: '0 32px 28px' }}>
            <button onClick={() => setStep('share')} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Continue to share options →
            </button>
          </div>
        </motion.div>
      )}

      {/* ── STEP 4: Share ── */}
      {step === 'share' && (
        <motion.div key="share"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}
        >
          <div style={{ background: 'linear-gradient(135deg, #0d1f3c, #0a0f1e)', padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '28px' }}>🚀</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Share your result</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Let recruiters, your network, or friends watch your interview</div>
            </div>
          </div>

          <div style={{ padding: '28px 32px' }}>
            {/* Share text preview */}
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Message preview</div>
            <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px' }}>
              {shareText}
            </div>

            {/* Platform grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {PLATFORMS.map(p => (
                <a key={p.id}
                  href={p.getUrl(shareUrl, shareText)}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: `${p.color}18`, border: `1px solid ${p.color}40`,
                    borderRadius: '10px', padding: '13px 16px',
                    color: p.id === 'x' ? '#fff' : p.color,
                    textDecoration: 'none', fontSize: '13px', fontWeight: 700,
                  }}
                >
                  {p.icon} {p.label}
                </a>
              ))}
            </div>

            {/* Copy link */}
            <button onClick={copyLink} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: linkCopied ? 'rgba(52,211,153,0.1)' : 'var(--bg3)',
              border: `1px solid ${linkCopied ? 'rgba(52,211,153,0.35)' : 'var(--border)'}`,
              borderRadius: '10px', padding: '13px',
              color: linkCopied ? '#34D399' : 'var(--text-2)',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s', marginBottom: '12px',
            }}>
              {linkCopied ? (
                <>✓ Link copied!</>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  Copy share link
                </>
              )}
            </button>

            <div style={{ fontSize: '10px', color: 'var(--text-3)', textAlign: 'center' }}>
              Anyone with this link can watch your interview · CV uploaded automatically if provided
            </div>
          </div>
        </motion.div>
      )}

      {/* ── DISCARDED ── */}
      {step === 'discarded' && (
        <motion.div key="discarded"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px 32px', display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          <div style={{ fontSize: '28px' }}>🗑️</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>Session discarded</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No problem — practice sessions don't need to be kept. Try again whenever you're ready.</div>
          </div>
          <button onClick={() => setStep('decide')} style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            Undo
          </button>
        </motion.div>
      )}

    </AnimatePresence>
  );
}
