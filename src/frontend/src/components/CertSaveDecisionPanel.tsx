import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { shareCertExamSession, unshareCertExamSession, deleteCertExamSession } from '../api/certExamApi';
import { CertShareModal } from './CertShareModal';
import { useAuthStore } from '../auth/authStore';

type SaveStep = 'decide' | 'saving' | 'saved' | 'ready' | 'discarded';

// Copy-trimmed from SaveDecisionPanel.tsx (the job-interview version) — same decide/saving/
// saved/ready/discarded shape and the same underlying mechanics (the session is already
// persisted the moment the exam finishes, same as an interview's auto-upload-on-close; "Save"
// here really means "publish/share it," "Discard" deletes the already-saved record, and leaving
// the page without clicking either keeps it privately in the candidate's own history). Trimmed
// down from the interview version: no QR-for-CV tab (a mock exam result isn't a CV attachment
// the same way an interview recording is), and the actual share UI is the existing
// CertShareModal rather than re-inlining the platform grid/copy-link logic a second time.
interface Props {
  passed: boolean;
  scaledScore: number;
  maxScore: number;
  certName: string;
  candidateId?: string;
  examSessionId?: string;
  alreadyShared?: boolean;
  onDiscarded?: () => void;
}

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export function CertSaveDecisionPanel({ passed, scaledScore, maxScore, certName, candidateId, examSessionId, alreadyShared = false, onDiscarded }: Props) {
  const authToken = useAuthStore(s => s.token) ?? '';
  const [step, setStep] = useState<SaveStep>('decide');
  const [isPublicNow, setIsPublicNow] = useState(alreadyShared);
  const [visBusy, setVisBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState('');

  // Revisiting a result that was already shared before — land straight on 'ready' instead of
  // asking "Save or discard?" again as if it were brand new.
  useEffect(() => {
    if (alreadyShared) {
      setShareUrl(`${window.location.origin}/cert-exam-summary/${examSessionId}`);
      setStep('ready');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyShared]);

  const handleSave = async () => {
    if (!candidateId || !examSessionId) {
      setError("This result isn't ready to share yet — give it a moment and try again.");
      return;
    }
    setStep('saving');
    setError('');
    try {
      const data = await shareCertExamSession(authToken, candidateId, examSessionId);
      setShareUrl(data.shareUrl);
      setIsPublicNow(true);
      setStep('saved');
      setTimeout(() => setStep('ready'), 1200);
    } catch (err) {
      console.error('[CertSaveDecisionPanel] Save failed:', err);
      setError('Something went wrong. Please try again.');
      setStep('decide');
    }
  };

  const handleDiscard = () => {
    setStep('discarded');
    onDiscarded?.();
    if (candidateId && examSessionId) {
      void deleteCertExamSession(authToken, candidateId, examSessionId);
    }
  };

  const toggleVisibility = async () => {
    if (!candidateId || !examSessionId || visBusy) return;
    setVisBusy(true);
    setError('');
    try {
      if (isPublicNow) {
        await unshareCertExamSession(authToken, candidateId, examSessionId);
        setIsPublicNow(false);
      } else {
        const data = await shareCertExamSession(authToken, candidateId, examSessionId);
        setShareUrl(data.shareUrl);
        setIsPublicNow(true);
      }
    } catch (err) {
      console.error('[CertSaveDecisionPanel] Visibility toggle failed:', err);
      setError('Something went wrong updating visibility. Please try again.');
    } finally {
      setVisBusy(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {step === 'decide' && (
        <motion.div key="decide" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ background: passed ? 'linear-gradient(135deg, #06281c 0%, #0a0f1e 100%)' : 'linear-gradient(135deg, #0d1f3c 0%, #0a0f1e 100%)', padding: '28px 32px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.7)', marginBottom: '10px' }}>
              Exam complete
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <div style={{ fontSize: '48px', fontWeight: 900, lineHeight: 1, color: passed ? '#34D399' : '#EF4444' }}>
                {scaledScore}<span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.3)' }}>/{maxScore}</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: passed ? '#34D399' : '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                {passed ? 'Passed' : 'Not yet'}
              </div>
            </div>
          </div>

          <div style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>What would you like to do with this result?</div>
            <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '24px' }}>
              Saving publishes your result so you can share it and get a link recruiters or friends can view.
            </div>

            {error && (
              <div style={{ fontSize: '13px', color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={handleSave} style={{
                flex: 1, minWidth: '200px', padding: '16px 24px', borderRadius: '13px',
                background: 'linear-gradient(135deg, #34D399, #059669)', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '14px', fontWeight: 800, boxShadow: '0 8px 24px rgba(52,211,153,0.3)',
              }}>
                Save this result
              </button>
              <button onClick={handleDiscard} style={{
                flex: 1, minWidth: '200px', padding: '16px 24px', borderRadius: '13px',
                background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '14px', fontWeight: 700,
              }}>
                Discard — it was practice
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {step === 'saving' && (
        <motion.div key="saving" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '48px 32px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(52,211,153,0.2)', borderTopColor: '#34D399', animation: 'certSaveSpin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Saving your result…</div>
          <style>{`@keyframes certSaveSpin { to { transform: rotate(360deg); } }`}</style>
        </motion.div>
      )}

      {step === 'saved' && (
        <motion.div key="saved" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(79,142,247,0.06))', border: '1px solid rgba(52,211,153,0.25)', borderRadius: '20px', padding: '48px 32px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#34D399' }}>Result saved!</div>
        </motion.div>
      )}

      {step === 'ready' && (
        <motion.div key="ready" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            padding: '14px 20px', background: isPublicNow ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.03)',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: isPublicNow ? '#34D399' : 'var(--text-3)' }}>
              {isPublicNow ? '🌍 Public' : '🔒 Private'}
              <span style={{ fontWeight: 500, color: 'var(--text-3)', marginLeft: 8 }}>
                {isPublicNow ? '— anyone with the link can view it' : '— only you can see this result'}
              </span>
            </div>
            <button onClick={toggleVisibility} disabled={visBusy} style={{
              fontSize: '12px', fontWeight: 700, padding: '7px 14px', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text-2)',
              cursor: visBusy ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: visBusy ? 0.6 : 1,
            }}>
              {visBusy ? 'Updating…' : isPublicNow ? 'Make Private' : 'Make Public'}
            </button>
          </div>

          {error && (
            <div style={{ margin: '16px 20px 0', fontSize: '13px', color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px' }}>
              {error}
            </div>
          )}

          {!isPublicNow ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔒</div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', maxWidth: 340, margin: '0 auto', lineHeight: 1.6 }}>
                This result is private — its share link is disabled. Make it public again any time to share it.
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px 32px', textAlign: 'center' }}>
              <button onClick={() => setShareOpen(true)} style={{
                padding: '13px 26px', borderRadius: '11px', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 800,
              }}>
                Share this result →
              </button>
            </div>
          )}
        </motion.div>
      )}

      {step === 'discarded' && (
        <motion.div key="discarded" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 20 }}>
          <div style={{ fontSize: '24px' }}>🗑️</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Result discarded</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>No problem — practice runs don't need to be kept.</div>
          </div>
        </motion.div>
      )}

      {shareOpen && (
        <CertShareModal
          certName={certName}
          passed={passed}
          scaledScore={scaledScore}
          maxScore={maxScore}
          shareUrl={shareUrl || `${API_BASE}/cert-exam-summary/${examSessionId}`}
          onClose={() => setShareOpen(false)}
        />
      )}
    </AnimatePresence>
  );
}
