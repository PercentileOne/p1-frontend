import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/authStore';
import { fetchProfileCv, setProfileCv, type ProfileCvReply } from '../api/cvAnalysisApi';
import { CvAnalysisView } from './CvAnalysisView';
import { logEvent } from '../api/flowLogger';

// The CV Analysis tab on a profile (Francis, 2026-10-19). On your own profile it holds the switch (OFF until you turn it on) and a preview of exactly what others will see.
// On someone else's profile it shows their analysis only if they switched it on; anyone who may not see it gets the same plain line, so it never reveals whether they have one.
// Only the positives are ever sent: skills, the roles that fit, and what is hot. Weaknesses stay with the person.

const GREEN = '#34D399';
const OWN_ANALYSIS_URL = 'https://www.theinterviewchair.com/cv-salary.html?utm_source=share&utm_medium=cv-profile&utm_campaign=cv-analysis';

type State = { kind: 'loading' } | { kind: 'ready'; reply: ProfileCvReply };

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ProfileCvPanel({ userId, name, isOwn }: { userId: string; name: string; isOwn: boolean }) {
  const token = useAuthStore(s => s.token);
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setState({ kind: 'loading' });
    setState({ kind: 'ready', reply: await fetchProfileCv(userId, token) });
  }, [userId, token]);
  useEffect(() => { void load(); }, [load]);

  async function toggle(on: boolean) {
    if (!token || busy) return;
    setBusy(true); setProblem('');
    try {
      await setProfileCv(on, token);
      logEvent(on ? 'profile_cv_on' : 'profile_cv_off');
      await load();
    } catch (e) { setProblem((e as Error).message || 'That did not save. Try again.'); }
    finally { setBusy(false); }
  }

  const muted: React.CSSProperties = { fontSize: 14, color: 'var(--text-3, #8b98a8)', lineHeight: 1.5 };
  if (state.kind === 'loading') return <div style={muted} aria-busy="true">Loading…</div>;
  const { reply } = state;

  if (!isOwn) {
    if (!reply.visible || !reply.view) return <div style={muted}>{name} has not added a CV analysis to their profile.</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={muted}>{name}'s CV analysis{reply.view.createdAt ? `, ${when(reply.view.createdAt)}` : ''}.</div>
        <CvAnalysisView view={reply.view} />
        <div style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(52,211,153,0.35)', background: 'rgba(52,211,153,0.06)' }}>
          <div style={{ fontWeight: 800, color: '#fff' }}>Get your own free CV analysis</div>
          <a href={OWN_ANALYSIS_URL} onClick={() => logEvent('profile_cv_cta_click')} style={{ display: 'inline-block', marginTop: 8, background: GREEN, color: '#04130d', fontWeight: 800, fontSize: 13.5, borderRadius: 10, padding: '9px 16px', textDecoration: 'none' }}>Analyse my CV free</a>
        </div>
      </div>
    );
  }

  const hasAnalysis = reply.visible && !!reply.view;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: hasAnalysis ? 'pointer' : 'default', opacity: hasAnalysis || reply.enabled ? 1 : 0.7 }}>
        <input type="checkbox" role="switch" checked={reply.enabled} disabled={busy || (!hasAnalysis && !reply.enabled)} onChange={e => void toggle(e.target.checked)} style={{ marginTop: 3, accentColor: GREEN }} />
        <span>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: 'var(--text, #fff)' }}>Show my CV analysis on my profile</span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-3, #8b98a8)', lineHeight: 1.5 }}>
            {reply.enabled
              ? 'On. Anyone who views your profile can see the analysis below. Only the positives are shown: skills, roles that fit and what is hot. Your weaknesses stay with you.'
              : 'Off. Nobody else can see your analysis until you switch this on. When you do, only the positives are shown: skills, roles that fit and what is hot. Your weaknesses stay with you.'}
          </span>
        </span>
      </label>
      {problem && <div role="alert" style={{ color: '#F87171', fontSize: 13 }}>{problem}</div>}

      {!hasAnalysis ? (
        <div style={{ ...muted, padding: 16, borderRadius: 12, border: '1px solid var(--border, rgba(255,255,255,0.1))' }}>
          You have not saved an analysis yet. Analyse your CV, press <strong>Share this analysis</strong> or <strong>Show on my profile</strong>, and it will appear here.
          <div style={{ marginTop: 10 }}>
            <button type="button" onClick={() => navigate('/dashboard?tab=cv-salary')} style={{ background: GREEN, color: '#04130d', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Analyse my CV</button>
          </div>
        </div>
      ) : (
        <>
          <div style={muted}>This is the analysis from {when(reply.view!.createdAt)}. To show a newer one, analyse your CV again and press <strong>Show on my profile</strong>.</div>
          <CvAnalysisView view={reply.view!} />
        </>
      )}
    </div>
  );
}
