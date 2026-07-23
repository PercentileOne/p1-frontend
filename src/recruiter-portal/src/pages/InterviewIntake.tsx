import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { buildCVContext, buildJobSpecContext, buildPersonalisedQuestions, buildSarahIntro, buildJamesIntro } from '../utils/contextBuilder';
import { explainApi } from '../api/explainApi';
import { generateIntros, parseCVWithAI, aiScoringConfigured } from '../api/aiScoring';
import { FileUpload } from '../components/FileUpload';

type Step = 'job-spec' | 'cv' | 'preparing';
type JobSpecMode = 'paste' | 'upload' | 'url';

interface LocationState {
  jobDescriptionText?: string;
  cvText?: string;
}

export default function InterviewIntake() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const external = (location.state ?? {}) as LocationState;
  const urlParams = new URLSearchParams(location.search);
  const urlJobSpec = urlParams.get('jobSpec') ?? '';

  const initialJobSpec = external.jobDescriptionText ?? urlJobSpec;
  const [step, setStep] = useState<Step>(initialJobSpec ? (external.cvText ? 'preparing' : 'cv') : 'job-spec');
  const [jobSpec, setJobSpec] = useState(initialJobSpec);
  const [jobSpecMode, setJobSpecMode] = useState<JobSpecMode>('paste');
  const [jobSpecUrl, setJobSpecUrl] = useState('');
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [cvText, setCvText] = useState(external.cvText ?? '');
  const [preparingMsg, setPreparingMsg] = useState('Analysing your CV…');

  // Auto-advance if both were pre-filled (enterprise / Magic Button path)
  useEffect(() => {
    if (external.jobDescriptionText && external.cvText) {
      prepare(external.jobDescriptionText, external.cvText);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFromUrl = async () => {
    const raw = jobSpecUrl.trim();
    if (!raw) return;
    const url = raw.startsWith('http') ? raw : `https://${raw}`;
    setUrlFetching(true);
    setUrlError('');
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error('Could not fetch that URL.');
      const json = await res.json();
      const html: string = json.contents ?? '';
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // strip nav/header/footer/script/style noise
      ['script','style','nav','header','footer','aside'].forEach(tag => {
        doc.querySelectorAll(tag).forEach(el => el.remove());
      });
      const text = (doc.body?.innerText ?? doc.body?.textContent ?? '').replace(/\s{3,}/g, '\n\n').trim();
      if (text.length < 50) throw new Error('Page had no readable text. Try pasting instead.');
      setJobSpec(text);
      setUrlFetching(false);
    } catch (e: unknown) {
      setUrlError(e instanceof Error ? e.message : 'Failed to fetch URL.');
      setUrlFetching(false);
    }
  };

  const prepare = async (js: string, cv: string) => {
    setStep('preparing');

    const msgs = [
      'Parsing your CV with AI…',
      'Extracting skills and experience…',
      'Briefing your interviewers…',
      'Generating your questions…',
      'Almost ready…',
    ];
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < msgs.length) setPreparingMsg(msgs[i]);
    }, 900);

    const cvCtx = cv.trim()
      ? aiScoringConfigured
        ? await parseCVWithAI(cv).catch(() => buildCVContext(cv))
        : buildCVContext(cv)
      : buildCVContext('');
    const jobCtx = buildJobSpecContext(js);

    // Run intros + questions in parallel — all three are independent
    const [introResult, questions] = await Promise.all([
      // AI intros (vary each session) — fall back to templates if API unavailable
      aiScoringConfigured
        ? generateIntros(cvCtx, jobCtx).catch(() => ({
            sarahIntro: buildSarahIntro(cvCtx, jobCtx),
            jamesIntro: buildJamesIntro(cvCtx, jobCtx),
          }))
        : Promise.resolve({
            sarahIntro: buildSarahIntro(cvCtx, jobCtx),
            jamesIntro: buildJamesIntro(cvCtx, jobCtx),
          }),
      // Questions from Explain API or local templates
      explainApi.quickGenerate({ jobDescriptionText: js, exampleCvText: cv })
        .then(pack => pack.questions)
        .catch(() => buildPersonalisedQuestions(cvCtx, jobCtx)),
    ]);

    clearInterval(interval);

    navigate(`/interview-room/${packId}`, {
      state: { cvCtx, jobCtx, questions, ...introResult },
      replace: true,
    });
  };

  const Field = ({ value, onChange, placeholder, rows = 10 }: {
    value: string; onChange: (v: string) => void; placeholder: string; rows?: number;
  }) => (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '16px', color: 'var(--text)', fontSize: '14px',
        lineHeight: 1.65, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
        boxSizing: 'border-box',
      }}
    />
  );

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      fontFamily: '-apple-system,"Segoe UI",sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 16px',
    }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
        {(['job-spec', 'cv', 'preparing'] as Step[]).map((s, i) => (
          <div key={s} style={{
            width: step === s ? '24px' : '8px', height: '8px', borderRadius: '4px',
            background: step === s ? 'var(--blue)' : i < ['job-spec','cv','preparing'].indexOf(step) ? 'rgba(79,142,247,0.4)' : 'rgba(255,255,255,0.1)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: '640px' }}>
        <AnimatePresence mode="wait">

          {/* Step 1: Job Spec */}
          {step === 'job-spec' && (
            <motion.div key="job-spec" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '8px' }}>Step 1 of 2</div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Add the job description</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                  Your interviewers will tailor every question to this specific role.
                </p>
              </div>

              {/* Mode tabs */}
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg3)', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
                {(['paste', 'upload', 'url'] as JobSpecMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => { setJobSpecMode(mode); setUrlError(''); }}
                    style={{
                      flex: 1, padding: '8px', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: jobSpecMode === mode ? 'var(--bg)' : 'transparent',
                      color: jobSpecMode === mode ? 'var(--text)' : 'var(--text-3)',
                      boxShadow: jobSpecMode === mode ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                    }}
                  >
                    {mode === 'paste' ? '📋 Paste' : mode === 'upload' ? '📄 Upload' : '🔗 URL'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {jobSpecMode === 'paste' && (
                  <motion.div key="js-paste" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Field
                      value={jobSpec}
                      onChange={setJobSpec}
                      placeholder="Paste the full job description here — title, responsibilities, required skills, company background…"
                      rows={12}
                    />
                  </motion.div>
                )}

                {jobSpecMode === 'upload' && (
                  <motion.div key="js-upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <FileUpload label="job description" onExtracted={(text) => setJobSpec(text)} />
                    {jobSpec.trim().length >= 50 && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', fontSize: '13px', color: '#34D399' }}>
                        ✓ Job description extracted — ready to continue
                      </div>
                    )}
                  </motion.div>
                )}

                {jobSpecMode === 'url' && (
                  <motion.div key="js-url" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="url"
                        value={jobSpecUrl}
                        onChange={e => { setJobSpecUrl(e.target.value); setUrlError(''); }}
                        onKeyDown={e => e.key === 'Enter' && fetchFromUrl()}
                        placeholder="https://company.com/careers/job-title"
                        style={{
                          flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
                          borderRadius: '10px', padding: '13px 16px', color: 'var(--text)',
                          fontSize: '14px', outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                      <button
                        onClick={fetchFromUrl}
                        disabled={urlFetching || !jobSpecUrl.trim()}
                        style={{
                          background: 'var(--blue)', color: '#fff', border: 'none',
                          borderRadius: '10px', padding: '13px 20px', fontSize: '13px',
                          fontWeight: 700, cursor: urlFetching ? 'default' : 'pointer',
                          opacity: !jobSpecUrl.trim() ? 0.4 : 1, whiteSpace: 'nowrap',
                        }}
                      >
                        {urlFetching ? '…' : 'Fetch'}
                      </button>
                    </div>
                    {urlError && (
                      <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--red)' }}>{urlError}</div>
                    )}
                    {jobSpec.trim().length >= 50 && !urlError && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', fontSize: '13px', color: '#34D399' }}>
                        ✓ Job description fetched — ready to continue
                      </div>
                    )}
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '12px', lineHeight: 1.6 }}>
                      Paste a direct link to the job posting. Works best with public job boards and company careers pages.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={() => setStep('cv')}
                  disabled={jobSpec.trim().length < 50}
                  style={{
                    background: jobSpec.trim().length >= 50 ? 'var(--blue)' : 'rgba(79,142,247,0.3)',
                    color: '#fff', border: 'none', borderRadius: '10px',
                    padding: '13px 32px', fontSize: '14px', fontWeight: 700,
                    cursor: jobSpec.trim().length >= 50 ? 'pointer' : 'default',
                  }}
                >
                  Next: Add your CV →
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: CV */}
          {step === 'cv' && (
            <motion.div key="cv" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '8px' }}>Step 2 of 2</div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Add your CV</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                  Sarah and James will reference your actual companies, achievements, and skills — making the simulation feel completely real.
                </p>
              </div>

              {/* Upload zone */}
              <FileUpload
                label="CV"
                onExtracted={(text) => setCvText(text)}
              />

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>or paste below</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>

              <Field
                value={cvText}
                onChange={setCvText}
                placeholder="Paste your CV text here — work history, skills, achievements, education…"
                rows={7}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <button onClick={() => setStep('job-spec')}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '13px 24px', fontSize: '14px', color: 'var(--text-2)', cursor: 'pointer' }}>
                  ← Back
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => prepare(jobSpec, '')}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '13px 20px', fontSize: '13px', color: 'var(--text-3)', cursor: 'pointer' }}>
                    Skip CV
                  </button>
                  <button
                    onClick={() => prepare(jobSpec, cvText)}
                    disabled={cvText.trim().length < 50}
                    style={{
                      background: cvText.trim().length >= 50 ? 'var(--blue)' : 'rgba(79,142,247,0.3)',
                      color: '#fff', border: 'none', borderRadius: '10px',
                      padding: '13px 32px', fontSize: '14px', fontWeight: 700,
                      cursor: cvText.trim().length >= 50 ? 'pointer' : 'default',
                    }}
                  >
                    Start Interview →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Preparing */}
          {step === 'preparing' && (
            <motion.div key="preparing" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '48px 0' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', margin: '0 auto 24px' }}
              />
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Preparing your session</div>
              <motion.div
                key={preparingMsg}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: '14px', color: 'var(--text-3)' }}
              >
                {preparingMsg}
              </motion.div>

              {/* Interviewer preview */}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '40px' }}>
                {[
                  { initials: 'SM', name: 'Sarah Mitchell', role: 'HR Director', gradient: 'linear-gradient(135deg,#667eea,#764ba2)' },
                  { initials: 'JO', name: 'James Okafor', role: 'Technical Lead', gradient: 'linear-gradient(135deg,#1B3A6B,#2563eb)' },
                ].map(p => (
                  <motion.div key={p.name} animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 3, delay: p.name === 'Sarah Mitchell' ? 0 : 1.5 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#fff' }}>{p.initials}</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>{p.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.role}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
