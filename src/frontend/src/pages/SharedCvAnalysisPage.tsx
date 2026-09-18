import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, Sparkles, TrendingUp } from 'lucide-react';
import { CvAnalysisVoiceOverlay } from '../components/CvAnalysisVoiceOverlay';
import { fetchSharedCvAnalysis, type CvAnalysisHistoryRecord } from '../api/cvAnalysisApi';

const ACCENT = '#34D399';

function levelColor(level: number) {
  if (level >= 7) return '#34D399';
  if (level >= 4) return '#F59E0B';
  return '#EF4444';
}

function fmtK(n: number) {
  return n >= 1000 ? `£${Math.round(n / 1000)}k` : `£${n}`;
}

// Public, unauthenticated view for a shared CV Analyzer link (Francis, 2026-09-18) — "Copy
// and/or Share" so a candidate can send their own analysis to a friend or mentor without them
// needing an account. Same shape as SharedInterviewPage.tsx: no nav chrome, fetched by token.
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

  const { analysis, roleMatches } = record;
  const subjectLabel = record.candidateName ?? 'This CV';

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
          Shared from TheInterviewChair.com — no account needed to view.
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <section>
            <SectionHeading icon={<TrendingUp size={13} />}>Skills Breakdown</SectionHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {analysis.skills.map(s => (
                <div key={s.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#c0bcd0', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ color: '#8080b0' }}>{s.yearsNote ?? ''}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${s.level * 10}%` }} transition={{ duration: 0.6 }}
                      style={{ height: '100%', background: levelColor(s.level), borderRadius: 4 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading icon={<Sparkles size={13} />}>Roles Worth Applying For</SectionHeading>
            {roleMatches.length === 0 ? (
              <div style={{ fontSize: 12, color: '#8080b0', padding: '8px 0' }}>No close real-role matches were found for this CV.</div>
            ) : (
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                {roleMatches.map((m, i) => (
                  <div key={m.title} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 14px', fontSize: 13,
                    borderBottom: i < roleMatches.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                    background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{m.careerTitle}</span>
                    <span style={{ color: ACCENT, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtK(m.salaryUkStarting)} – {fmtK(m.salaryUkExpert)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <NarrativeList title="Strengths" items={analysis.strengths} color="#34D399" />
          <NarrativeList title="Weaknesses" items={analysis.weaknesses} color="#F59E0B" />
          {analysis.inconsistencies.length > 0 && (
            <NarrativeList title="Inconsistencies Worth Addressing" items={analysis.inconsistencies} color="#EF4444" />
          )}
        </div>
      </div>

      {showVoice && (
        <CvAnalysisVoiceOverlay narrativeScript={analysis.narrativeScript} title={subjectLabel} onClose={() => setShowVoice(false)} />
      )}
    </div>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8080b0', marginBottom: 12 }}>
      {icon} {children}
    </div>
  );
}

function NarrativeList({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeading icon={<span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />}>{title}</SectionHeading>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 13, color: '#e0dcff', lineHeight: 1.6 }}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
