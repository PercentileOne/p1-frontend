import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../auth/authStore';
import { SHARE_PLATFORMS } from './SaveDecisionPanel';

type SaveStep = 'decide' | 'saving' | 'saved' | 'ready' | 'discarded';
type ReadyTab = 'qr' | 'share';

interface Props {
  score: number; // 0–100
  subject: string;
  candidateId?: string;
  talkId?: string;
  alreadyShared?: boolean;
  onSaved?: (shareToken: string, shareUrl: string) => void;
  onDiscarded?: () => void;
}

const API_BASE = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://api.explain.global';

// Talk-room counterpart to SaveDecisionPanel.tsx — copied then trimmed rather than
// parameterized, since SaveDecisionPanel hardcodes /api/interviews/... paths throughout;
// same UX (decide -> saving -> ready, reversible public/private toggle, QR + share tabs)
// pointed at /api/talks/... instead. SHARE_PLATFORMS is reused directly from there — it's
// pure platform-link data, nothing interview-specific about it.
export function TalkSaveDecisionPanel({
  score, subject, candidateId, talkId, alreadyShared = false, onSaved, onDiscarded,
}: Props) {
  const authToken = useAuthStore(s => s.token);
  const [step, setStep] = useState<SaveStep>('decide');
  const [readyTab, setReadyTab] = useState<ReadyTab>('qr');
  const [shareUrl, setShareUrl] = useState('');
  const [qrDataUri, setQrDataUri] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState('');
  const [isPublicNow, setIsPublicNow] = useState(alreadyShared);
  const [visBusy, setVisBusy] = useState(false);

  const handleMakePrivate = async () => {
    if (!candidateId || !talkId || visBusy) return;
    setVisBusy(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/talks/${encodeURIComponent(candidateId)}/${encodeURIComponent(talkId)}/unshare`,
        { method: 'POST', headers: { Authorization: `Bearer ${authToken ?? ''}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIsPublicNow(false);
    } catch (err) {
      console.error('[TalkSaveDecisionPanel] Unshare failed:', err);
      setError('Something went wrong making this private. Please try again.');
    } finally {
      setVisBusy(false);
    }
  };

  const handleMakePublicAgain = async () => {
    if (!candidateId || !talkId || visBusy) return;
    setVisBusy(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/api/talks/${encodeURIComponent(candidateId)}/${encodeURIComponent(talkId)}/share`,
        { method: 'POST', headers: { Authorization: `Bearer ${authToken ?? ''}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { shareToken: string; shareUrl: string; qrDataUri: string };
      setShareUrl(data.shareUrl);
      setQrDataUri(data.qrDataUri);
      setIsPublicNow(true);
      onSaved?.(data.shareToken, data.shareUrl);
    } catch (err) {
      console.error('[TalkSaveDecisionPanel] Re-share failed:', err);
      setError('Something went wrong making this public again. Please try again.');
    } finally {
      setVisBusy(false);
    }
  };

  useEffect(() => {
    if (!alreadyShared || !candidateId || !talkId) return;
    let cancelled = false;
    fetch(
      `${API_BASE}/api/talks/${encodeURIComponent(candidateId)}/${encodeURIComponent(talkId)}/share`,
      { method: 'POST', headers: { Authorization: `Bearer ${authToken ?? ''}` } },
    )
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: { shareToken: string; shareUrl: string; qrDataUri: string }) => {
        if (cancelled) return;
        setShareUrl(data.shareUrl);
        setQrDataUri(data.qrDataUri);
        setStep('ready');
        onSaved?.(data.shareToken, data.shareUrl);
      })
      .catch(() => { /* fall back to the normal decide/save flow */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyShared, candidateId, talkId]);

  const shareText = `I scored ${score}% on my talk on "${subject}" with TheInterviewChair.com — watch it back:`;

  const handleSave = async () => {
    if (!candidateId || !talkId) {
      setError("This session isn't ready to share yet — give it a moment and try again.");
      return;
    }
    setStep('saving');
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/api/talks/${encodeURIComponent(candidateId)}/${encodeURIComponent(talkId)}/share`,
        { method: 'POST', headers: { Authorization: `Bearer ${authToken ?? ''}` } },
      );
      if (!res.ok) throw new Error(`Share failed: HTTP ${res.status}`);
      const data = await res.json() as { shareToken: string; shareUrl: string; qrDataUri: string };
      setShareUrl(data.shareUrl);
      setQrDataUri(data.qrDataUri);
      setIsPublicNow(true);
      setStep('saved');
      onSaved?.(data.shareToken, data.shareUrl);
      setTimeout(() => setStep('ready'), 1400);
    } catch (err) {
      console.error('[TalkSaveDecisionPanel] Save failed:', err);
      setError('Something went wrong. Please try again.');
      setStep('decide');
    }
  };

  const handleDiscard = () => {
    setStep('discarded');
    onDiscarded?.();
    if (candidateId && talkId) {
      fetch(`${API_BASE}/api/talks/${encodeURIComponent(candidateId)}/${encodeURIComponent(talkId)}`, {
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
    a.download = 'theinterviewchair-talk-qr.png';
    a.click();
  };

  return (
    <AnimatePresence mode="wait">
      {step === 'decide' && (
        <motion.div key="decide" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #0d1f3c 0%, #0a0f1e 100%)', padding: '28px 32px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.7)', marginBottom: '10px' }}>Talk complete</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '6px' }}>
              <div style={{ fontSize: '64px', fontWeight: 900, lineHeight: 1, color: score >= 70 ? '#34D399' : score >= 50 ? '#F59E0B' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>{score}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>/ 100</div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: score >= 70 ? '#34D399' : score >= 50 ? '#F59E0B' : '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {score >= 80 ? 'Excellent' : score >= 70 ? 'Strong' : score >= 50 ? 'Good' : 'Developing'}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{subject}</div>
              </div>
            </div>
          </div>
          <div style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>What would you like to do with this talk?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '24px' }}>
              Saving publishes your talk so you can get a shareable link and QR code for teachers or friends to watch.
            </div>
            {error && <div style={{ fontSize: '13px', color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={handleSave} style={{ flex: 1, minWidth: '200px', padding: '16px 24px', borderRadius: '13px', background: 'linear-gradient(135deg, #34D399, #059669)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 800, boxShadow: '0 8px 24px rgba(52,211,153,0.3)' }}>
                Save this talk
              </button>
              <button onClick={handleDiscard} style={{ flex: 1, minWidth: '200px', padding: '16px 24px', borderRadius: '13px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700 }}>
                Discard — it was practice
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {step === 'saving' && (
        <motion.div key="saving" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid rgba(52,211,153,0.2)', borderTopColor: '#34D399', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>Saving your talk…</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </motion.div>
      )}

      {step === 'saved' && (
        <motion.div key="saved" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(79,142,247,0.06))', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '20px', padding: '56px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#34D399', marginBottom: '6px' }}>Talk saved!</div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>Generating your QR code…</div>
        </motion.div>
      )}

      {step === 'ready' && (
        <motion.div key="ready" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 20px', borderBottom: '1px solid var(--border)', background: isPublicNow ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: isPublicNow ? '#34D399' : 'var(--text-3)' }}>
              {isPublicNow ? '🌍 Public' : '🔒 Private'}
              <span style={{ fontWeight: 500, color: 'var(--text-3)', marginLeft: 8 }}>{isPublicNow ? '— anyone with the link can watch' : '— share link disabled'}</span>
            </div>
            <button onClick={isPublicNow ? handleMakePrivate : handleMakePublicAgain} disabled={visBusy}
              style={{ fontSize: '12px', fontWeight: 700, padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text-2)', cursor: visBusy ? 'default' : 'pointer', fontFamily: 'inherit', opacity: visBusy ? 0.6 : 1 }}>
              {visBusy ? 'Updating…' : isPublicNow ? 'Make Private' : 'Make Public'}
            </button>
          </div>

          {error && <div style={{ margin: '16px 20px 0', fontSize: '13px', color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px' }}>{error}</div>}

          {!isPublicNow ? (
            <div style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>This talk is private. Its share link/QR code no longer works.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                <button onClick={() => setReadyTab('qr')} style={{ flex: 1, padding: '14px 16px', background: readyTab === 'qr' ? 'var(--bg3)' : 'transparent', border: 'none', borderBottom: `2px solid ${readyTab === 'qr' ? '#34D399' : 'transparent'}`, color: readyTab === 'qr' ? 'var(--text)' : 'var(--text-3)', fontSize: '13px', fontWeight: readyTab === 'qr' ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  📄 QR Code
                </button>
                <button onClick={() => setReadyTab('share')} style={{ flex: 1, padding: '14px 16px', background: readyTab === 'share' ? 'var(--bg3)' : 'transparent', border: 'none', borderBottom: `2px solid ${readyTab === 'share' ? '#a78bfa' : 'transparent'}`, color: readyTab === 'share' ? 'var(--text)' : 'var(--text-3)', fontSize: '13px', fontWeight: readyTab === 'share' ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🚀 Share Options
                </button>
              </div>

              {readyTab === 'qr' && (
                <div style={{ padding: '32px', display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flexShrink: 0, textAlign: 'center' }}>
                    {qrDataUri && <img src={qrDataUri} alt="Your talk QR code" style={{ width: 160, height: 160, borderRadius: '12px', background: '#fff', padding: '8px' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <button onClick={downloadQr} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '11px', background: 'linear-gradient(135deg, #34D399, #059669)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 800 }}>
                      Download QR code
                    </button>
                  </div>
                </div>
              )}

              {readyTab === 'share' && (
                <div style={{ padding: '28px 32px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px' }}>{shareText}</div>
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
              )}
            </>
          )}
        </motion.div>
      )}

      {step === 'discarded' && (
        <motion.div key="discarded" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px 32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '28px' }}>🗑️</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>Talk discarded</div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No problem — practice talks don't need to be kept.</div>
          </div>
          <button onClick={() => setStep('decide')} style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 16px', color: 'var(--text-3)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Undo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
