import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { CvAnalysisResultsView, savedToRoleRows } from '../components/CvAnalysisResultsView';
import { CvAnalysisVoiceOverlay } from '../components/CvAnalysisVoiceOverlay';
import { fetchSharedCvAnalysis, type CvAnalysisHistoryRecord } from '../api/cvAnalysisApi';

const ACCENT = '#34D399';

// Public, unauthenticated view for a shared CV Analyzer link (Francis, 2026-09-18) — "so Mike
// could send the analysis to his colleague in another department who can open and listen to the
// saved analysis" without logging in. Same shape as the candidate portal's own
// SharedInterviewPage.tsx: no nav chrome, just the content, fetched anonymously by token.
export default function SharedCvAnalysisPage() {
  const { token } = useParams<{ token: string }>();
  const [record, setRecord] = useState<CvAnalysisHistoryRecord | null>(null);
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [showVoice, setShowVoice] = useState(false);

  useEffect(() => {
    if (!token) { setState('error'); return; }
    fetchSharedCvAnalysis(token)
      .then(r => { setRecord(r); setState('done'); })
      .catch(e => { setErrorMsg(e instanceof Error ? e.message : 'This shared analysis link is no longer available.'); setState('error'); });
  }, [token]);

  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16, color: 'var(--text-2)' }}>
        <span style={{ fontSize: 28, animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</span>
        <div style={{ fontSize: 14 }}>Loading CV analysis…</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (state === 'error' || !record) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>This link isn't available</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 420 }}>{errorMsg}</div>
      </div>
    );
  }

  const { analysis } = record;
  const subjectLabel = record.candidateName ?? "This Candidate's CV";

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '48px 20px' }}>
      <div style={{ width: '100%', maxWidth: 680 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: '0.06em', marginBottom: 8, textTransform: 'uppercase' }}>
          CV Analyzer · Shared Analysis
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
          {record.candidateName ? `CV Analysis for ${record.candidateName}` : 'CV Analysis'}
        </h1>
        <p style={{ fontSize: 13, color: '#8080b0', marginBottom: 24 }}>
          Shared from TheInterviewChair.com's recruiter portal — no account needed to view.
        </p>

        <button
          onClick={() => setShowVoice(true)}
          style={{
            width: '100%', marginBottom: 24,
            background: 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(52,211,153,0.10))',
            border: '1px solid rgba(52,211,153,0.4)', borderRadius: 10,
            padding: '12px 16px', fontSize: 13, fontWeight: 700, color: ACCENT,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Mic size={15} /> Talk Me Through This CV
        </button>

        <CvAnalysisResultsView result={analysis} roleRows={savedToRoleRows(record.roleMatches)} rolesLoaded />
      </div>

      {showVoice && (
        <CvAnalysisVoiceOverlay narrativeScript={analysis.narrativeScript} title={subjectLabel} onClose={() => setShowVoice(false)} />
      )}
    </div>
  );
}
