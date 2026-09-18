import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, AlertTriangle, Mic } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { ChairSpinner } from './ChairSpinner';
import { CvAnalysisVoiceOverlay } from './CvAnalysisVoiceOverlay';
import { analyzeCv, matchRolesToCareers, type CvAnalysisResult, type CvRoleMatch } from '../api/cvAnalysisApi';
import { useAuth } from '../context/AuthContext';

interface Props {
  onClose: () => void;
}

type Step = 'upload' | 'analyzing' | 'results' | 'error';

const ACCENT = '#34D399';

function levelColor(level: number) {
  if (level >= 7) return '#34D399';
  if (level >= 4) return '#F59E0B';
  return '#EF4444';
}

function fmtK(n: number) {
  return n >= 1000 ? `£${Math.round(n / 1000)}k` : `£${n}`;
}

// Copy-trimmed from the candidate portal's CvAnalysisModal.tsx — same CareersPanel-style visual
// shell (eyebrow label, bold title, primary voice button up top, icon-labeled sections below).
// Always third-person/hiring-fit framing here (audience='candidate') — this portal only ever
// analyses a CANDIDATE's CV, never the recruiter's own, so there's no self/candidate toggle to
// wire up like the shared candidate-portal component has.
export function CvAnalysisModal({ onClose }: Props) {
  const { token } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<CvAnalysisResult | null>(null);
  const [roleMatches, setRoleMatches] = useState<CvRoleMatch[]>([]);
  const [showVoice, setShowVoice] = useState(false);

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
      matchRolesToCareers(analysis.suggestedRoles).then(setRoleMatches).catch(() => setRoleMatches([]));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong analysing this CV — please try again.');
      setStep('error');
    }
  }

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
                  CV / Salary · Candidate Evaluation
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>
                  What roles fit this candidate?
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
              <button
                onClick={() => setShowVoice(true)}
                style={{
                  marginTop: 14, width: '100%',
                  background: 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(52,211,153,0.10))',
                  border: '1px solid rgba(52,211,153,0.4)', borderRadius: 10,
                  padding: '10px 16px', fontSize: 12.5, fontWeight: 700, color: ACCENT,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Mic size={14} /> Talk Me Through This CV
              </button>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Skills bar chart */}
                <section>
                  <SectionHeading icon={<TrendingUp size={13} />}>Skills Breakdown</SectionHeading>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.skills.map(s => (
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

                {/* Roles table */}
                <section>
                  <SectionHeading icon={<Sparkles size={13} />}>Roles This Candidate Is Suited For</SectionHeading>
                  {roleMatches.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#8080b0', padding: '8px 0' }}>Matching against real roles…</div>
                  ) : (
                    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                      {roleMatches.map((m, i) => (
                        <div key={m.title} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 14px', fontSize: 13,
                          borderBottom: i < roleMatches.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                          background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent',
                        }}>
                          <span style={{ fontWeight: 600, color: '#fff' }}>{m.career!.title}</span>
                          <span style={{ color: ACCENT, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {fmtK(m.career!.salary.uk.starting)} – {fmtK(m.career!.salary.uk.expert)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Strengths / weaknesses / inconsistencies */}
                <NarrativeList title="Strengths" items={result.strengths} color="#34D399" />
                <NarrativeList title="Weaknesses" items={result.weaknesses} color="#F59E0B" />
                {result.inconsistencies.length > 0 && (
                  <NarrativeList title="Inconsistencies Worth Addressing" items={result.inconsistencies} color="#EF4444" />
                )}
              </div>
            )}
          </div>
        </motion.div>

        {showVoice && result && (
          <CvAnalysisVoiceOverlay narrativeScript={result.narrativeScript} title="This Candidate's CV" onClose={() => setShowVoice(false)} />
        )}
      </motion.div>
    </AnimatePresence>
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
