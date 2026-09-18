import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, AlertTriangle, Save, Share2, Check } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { ChairSpinner } from './ChairSpinner';
import { CvAnalysisVoiceOverlay } from './CvAnalysisVoiceOverlay';
import { CvAnalysisResultsView, toRoleRows, savedToRoleRows, buildHotTopicGapSentence, type CvRoleRow } from './CvAnalysisResultsView';
import {
  analyzeCv, matchRolesToCareers, saveCvAnalysisHistory, shareCvAnalysisHistory,
  type CvAnalysisResult, type CvRoleMatch,
} from '../api/cvAnalysisApi';
import { useAuth } from '../context/AuthContext';

interface InitialData {
  result: CvAnalysisResult;
  roleRows: CvRoleRow[];
  recordId: string;
  isShared: boolean;
  shareToken: string | null;
}

interface Props {
  onClose: () => void;
  // Present when opened from the history list (a saved record) — skips straight to 'results'
  // using this data instead of running a live analysis, and swaps the Save button for Share
  // (it's already saved). Undefined for the normal "+ Analyze New CV" flow.
  initialData?: InitialData;
  // Fires after a successful Save so the history list can refetch without closing the modal.
  onSaved?: () => void;
}

type Step = 'upload' | 'analyzing' | 'results' | 'error';

const ACCENT = '#34D399';

// Copy-trimmed from the candidate portal's CvAnalysisModal.tsx — same CareersPanel-style visual
// shell (eyebrow label, bold title, primary voice button up top, icon-labeled sections below).
// Always third-person/hiring-fit framing here (audience='candidate') — this portal only ever
// analyses a CANDIDATE's CV, never the recruiter's own, so there's no self/candidate toggle to
// wire up like the shared candidate-portal component has.
export function CvAnalysisModal({ onClose, initialData, onSaved }: Props) {
  const { token } = useAuth();
  const [step, setStep] = useState<Step>(initialData ? 'results' : 'upload');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<CvAnalysisResult | null>(initialData?.result ?? null);
  const [roleMatches, setRoleMatches] = useState<CvRoleMatch[]>([]);
  const [roleRows, setRoleRows] = useState<CvRoleRow[]>(initialData?.roleRows ?? []);
  const [rolesLoaded, setRolesLoaded] = useState(!!initialData);
  const [showVoice, setShowVoice] = useState(false);
  const [hotTopics, setHotTopics] = useState<string[]>([]);
  const [hotTopicsRole, setHotTopicsRole] = useState('');

  // Save — Francis's own steer: nothing is persisted automatically, only on an explicit click.
  const [saving, setSaving] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(initialData?.recordId ?? null);
  const [saveError, setSaveError] = useState('');

  // Share — "send this to a colleague in another department" (Francis, 2026-09-18). Only
  // available once a record has an id (either just saved, or opened from history).
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(
    initialData?.isShared && initialData.shareToken ? `https://recruiter.interviewme.global/shared/cv-analysis/${initialData.shareToken}` : null,
  );
  const [shareCopied, setShareCopied] = useState(false);

  async function handleExtracted(text: string) {
    setStep('analyzing');
    setErrorMsg('');
    try {
      const analysis = await analyzeCv(text, 'candidate', token);
      setResult(analysis);
      setStep('results');
      // Fire-and-forget-ish: results render immediately with an empty table, then fill in as
      // real salary matches land — matching cost, giving useful content sooner than waiting on
      // every one of 5-8 searchCareers calls to finish before showing anything at all.
      matchRolesToCareers(analysis.suggestedRoles).then(matches => {
        setRoleMatches(matches);
        setRoleRows(toRoleRows(matches));
        setRolesLoaded(true);
      }).catch(() => { setRoleMatches([]); setRoleRows([]); setRolesLoaded(true); });
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong analysing this CV — please try again.');
      setStep('error');
    }
  }

  async function handleSave() {
    if (!result || !token) return;
    setSaving(true);
    setSaveError('');
    try {
      const record = await saveCvAnalysisHistory(result, roleMatches, token);
      setSavedRecordId(record.id);
      onSaved?.();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save — please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    if (!savedRecordId || !token) return;
    setSharing(true);
    try {
      const { shareUrl: url } = await shareCvAnalysisHistory(savedRecordId, token);
      setShareUrl(url);
    } catch {
      setSaveError('Failed to create a share link — please try again.');
    } finally {
      setSharing(false);
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  const subjectLabel = result?.candidateName || "This Candidate's CV";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      >
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: -12 }}
          style={{
            position: 'relative', zIndex: 1, width: '100%', maxWidth: 680, maxHeight: '85vh',
            background: '#0a0818', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 20,
            boxShadow: '0 0 100px rgba(52,211,153,0.16), 0 30px 90px rgba(0,0,0,0.55)',
            overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ padding: '24px 24px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: '#0a0818', zIndex: 1, borderRadius: '20px 20px 0 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>
                  CV Analyzer · Candidate Evaluation
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>
                  {result?.candidateName ? `CV Analysis for ${result.candidateName}` : 'What roles fit this candidate?'}
                </h2>
              </div>
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#9090b0', cursor: 'pointer', padding: '7px 9px', display: 'flex' }}>
                <X size={15} />
              </button>
            </div>
            {step === 'upload' && (
              <p style={{ fontSize: 12, color: '#8080b0', lineHeight: 1.7, marginTop: 10, marginBottom: 0 }}>
                Upload a candidate's CV — we'll break down their strengths, weaknesses, and which real roles (with real salary bands) they're genuinely suited for.
              </p>
            )}
            {result && step === 'results' && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowVoice(true)}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(52,211,153,0.10))',
                      border: '1px solid rgba(52,211,153,0.4)', borderRadius: 10,
                      padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: ACCENT,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}
                  >
                    <Mic size={14} /> Talk Me Through This CV
                  </button>
                  {!savedRecordId ? (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        flex: 1,
                        background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.3)', borderRadius: 10,
                        padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: '#4F8EF7',
                        cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      <Save size={14} /> {saving ? 'Saving…' : 'Save to List'}
                    </button>
                  ) : (
                    <div style={{
                      flex: 1, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 10,
                      padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: ACCENT,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}>
                      <Check size={14} /> Saved to List
                    </div>
                  )}
                </div>
                {!!savedRecordId && !shareUrl && (
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    style={{
                      background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10,
                      padding: '9px 14px', fontSize: 12, fontWeight: 700, color: '#A78BFA',
                      cursor: sharing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      opacity: sharing ? 0.6 : 1,
                    }}
                  >
                    <Share2 size={13} /> {sharing ? 'Creating link…' : 'Share with a colleague →'}
                  </button>
                )}
                {shareUrl && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 6px 6px 12px' }}>
                    <span style={{ flex: 1, fontSize: 11, color: '#c0bcd0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareUrl}</span>
                    <button
                      onClick={copyShareUrl}
                      style={{
                        background: shareCopied ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                        border: 'none', borderRadius: 6, padding: '6px 10px',
                        fontSize: 11, fontWeight: 700, color: shareCopied ? ACCENT : '#c0bcd0', cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {shareCopied ? 'Copied ✓' : 'Copy'}
                    </button>
                  </div>
                )}
                {saveError && <div style={{ fontSize: 11, color: '#EF4444' }}>{saveError}</div>}
              </div>
            )}
          </div>

          <div style={{ padding: '24px' }}>
            {step === 'upload' && (
              <FileUpload label="Candidate CV" onExtracted={(text) => handleExtracted(text)} />
            )}

            {step === 'analyzing' && (
              <div style={{ padding: '20px 0' }}>
                <ChairSpinner label="Reading between the lines…" size={110} />
              </div>
            )}

            {step === 'error' && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: '#e0dcff', lineHeight: 1.6 }}>{errorMsg}</div>
              </div>
            )}

            {step === 'results' && result && (
              <CvAnalysisResultsView
                result={result} roleRows={roleRows} rolesLoaded={rolesLoaded}
                onHotTopics={(topics, role) => { setHotTopics(topics); setHotTopicsRole(role); }}
              />
            )}
          </div>
        </motion.div>

        {showVoice && result && (
          <CvAnalysisVoiceOverlay
            narrativeScript={result.narrativeScript + buildHotTopicGapSentence(hotTopics, hotTopicsRole, result.skills)}
            title={subjectLabel} onClose={() => setShowVoice(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export { savedToRoleRows };
