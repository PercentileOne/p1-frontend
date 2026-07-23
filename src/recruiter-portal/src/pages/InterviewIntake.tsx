import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { buildCVContext, buildJobSpecContext, buildPersonalisedQuestions, buildSarahIntro, buildJamesIntro, type CVContext } from '../utils/contextBuilder';
import { explainApi } from '../api/explainApi';
import { generateIntros, parseCVWithAI, aiScoringConfigured } from '../api/aiScoring';
import { FileUpload } from '../components/FileUpload';

type HubTab = 'interview' | 'learn' | 'coming-soon';
type Step = 'inputs' | 'preparing';
type JobSpecMode = 'paste' | 'upload' | 'url';

interface LocationState {
  jobDescriptionText?: string;
  cvText?: string;
}

// ── Structured CV preview card (tabbed) ──────────────────────────────────────

type PreviewTab = 'overview' | 'experience' | 'skills' | 'achievements' | 'qualifications';

function CVPreviewCard({ ctx, parsing }: { ctx: CVContext | null; parsing: boolean }) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('overview');

  if (parsing) {
    return (
      <div style={{ marginTop: '16px', padding: '20px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: '18px', height: '18px', border: '2px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', flexShrink: 0 }}
        />
        <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Parsing CV with AI…</div>
      </div>
    );
  }
  if (!ctx) return null;

  const initials = [ctx.firstName?.[0], ctx.lastName?.[0]].filter(Boolean).join('') || '?';
  const name = [ctx.firstName, ctx.lastName].filter(Boolean).join(' ') || 'Candidate';
  const isAi = ctx._source === 'ai';

  const tabs: { id: PreviewTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'experience', label: 'Experience', count: (ctx.experience?.length ?? 0) || ctx.roles.length },
    { id: 'skills', label: 'Skills', count: (ctx.skills ?? ctx.technologies).length },
    { id: 'achievements', label: 'Achievements', count: ctx.achievements.length },
    { id: 'qualifications', label: 'Qualifications', count: (ctx.education ?? []).length + ctx.certifications.length },
  ];

  const tabStyle = (id: PreviewTab) => ({
    padding: '7px 14px',
    border: 'none',
    borderRadius: '7px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    background: activeTab === id ? 'var(--bg)' : 'transparent',
    color: activeTab === id ? 'var(--text)' : 'var(--text-3)',
    boxShadow: activeTab === id ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginTop: '16px', background: 'var(--bg3)', border: '1px solid rgba(52,211,153,0.22)', borderRadius: '14px', overflow: 'hidden' }}
    >
      {/* Header row */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
            {[ctx.roles[0], ctx.seniority !== 'Unknown' ? ctx.seniority : null, ctx.yearsOfExperience ? `${ctx.yearsOfExperience} yrs exp` : null].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
          background: isAi ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
          border: `1px solid ${isAi ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)'}`,
          borderRadius: '6px', padding: '3px 9px',
        }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isAi ? '#34D399' : '#FBBF24' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: isAi ? '#34D399' : '#FBBF24', letterSpacing: '0.04em' }}>
            {isAi ? 'AI PARSED' : 'HEURISTIC'}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '4px', overflowX: 'auto', background: 'var(--bg3)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span style={{ marginLeft: '5px', fontSize: '10px', background: 'rgba(79,142,247,0.18)', color: 'var(--blue)', borderRadius: '4px', padding: '1px 5px', fontVariantNumeric: 'tabular-nums' }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '16px 18px', minHeight: '120px' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Current Role', value: ctx.roles[0] },
                  { label: 'Seniority', value: ctx.seniority !== 'Unknown' ? ctx.seniority : null },
                  { label: 'Experience', value: ctx.yearsOfExperience ? `${ctx.yearsOfExperience} years` : null },
                  { label: 'Top Skill', value: (ctx.skills ?? ctx.technologies)[0] },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>{r.label}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'experience' && (
            <motion.div key="experience" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {(ctx.experience ?? []).length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {['Role', 'Company', 'Period'].map(h => (
                          <th key={h} style={{ textAlign: 'left', fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(ctx.experience ?? []).map((e, i) => (
                        <tr key={i} style={{ borderBottom: i < (ctx.experience?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <td style={{ padding: '8px 12px 8px 0', color: 'var(--text)', fontWeight: 600, verticalAlign: 'top' }}>{e.role}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-2)', verticalAlign: 'top' }}>{e.company}</td>
                          <td style={{ padding: '8px 0', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', fontSize: '12px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{e.period}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : ctx.roles.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ctx.roles.map((role, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: '#34D399', flexShrink: 0, marginTop: '3px', fontSize: '10px' }}>●</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{role}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Extracted from CV · upload with job spec for full breakdown</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No experience entries extracted.</div>
              )}
            </motion.div>
          )}

          {activeTab === 'skills' && (
            <motion.div key="skills" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {(() => {
                const all = [...new Set([...(ctx.skills ?? []), ...ctx.technologies])];
                return all.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                    {all.map(t => (
                      <span key={t} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue)', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.18)', borderRadius: '6px', padding: '4px 11px' }}>{t}</span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No skills extracted.</div>
                );
              })()}
            </motion.div>
          )}

          {activeTab === 'achievements' && (
            <motion.div key="achievements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {ctx.achievements.length > 0 ? (
                ctx.achievements.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#34D399', flexShrink: 0, marginTop: '2px', fontSize: '10px' }}>●</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.55 }}>{a}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No achievements extracted.</div>
              )}
            </motion.div>
          )}

          {activeTab === 'qualifications' && (
            <motion.div key="qualifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {(() => {
                const edu = ctx.education ?? [];
                const certs = ctx.certifications ?? [];
                if (edu.length === 0 && certs.length === 0) {
                  return <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No qualifications extracted.</div>;
                }
                // Parse entries like "BSc Computer Science – University of London, 2001"
                const parseEdu = (s: string) => {
                  const yearMatch = s.match(/\b(19|20)\d{2}\b/);
                  const year = yearMatch ? yearMatch[0] : '';
                  const withoutYear = s.replace(/[\s,–-]*\b(19|20)\d{2}\b/, '').trim();
                  const parts = withoutYear.split(/[,–\-]/);
                  const qualification = parts[0]?.trim() ?? s;
                  const institution = parts[1]?.trim() ?? '';
                  const notes = parts.slice(2).join(', ').trim();
                  return { qualification, institution, year, notes };
                };
                const rows = [
                  ...edu.map(e => ({ ...parseEdu(e), type: 'edu' as const })),
                  ...certs.map(c => ({ qualification: c, institution: '', year: '', notes: '', type: 'cert' as const })),
                ];
                return (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          {['Qualification', 'Institution', 'Year', 'Notes'].map(h => (
                            <th key={h} style={{ textAlign: 'left', fontSize: '10px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)', paddingBottom: '8px', paddingRight: '12px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <td style={{ padding: '8px 12px 8px 0', color: 'var(--text)', fontWeight: 600, verticalAlign: 'top' }}>
                              {r.type === 'cert' && <span style={{ fontSize: '10px', marginRight: '6px', color: '#FBBF24' }}>★</span>}
                              {r.qualification}
                            </td>
                            <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-2)', verticalAlign: 'top' }}>{r.institution}</td>
                            <td style={{ padding: '8px 12px 8px 0', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{r.year}</td>
                            <td style={{ padding: '8px 0', color: 'var(--text-3)', fontSize: '12px', verticalAlign: 'top' }}>{r.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function InterviewIntake() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const external = (location.state ?? {}) as LocationState;
  const urlParams = new URLSearchParams(location.search);
  const urlJobSpec = urlParams.get('jobSpec') ?? '';

  const initialJobSpec = external.jobDescriptionText ?? urlJobSpec;
  const [hubTab, setHubTab] = useState<HubTab>('interview');
  const [step, setStep] = useState<Step>('inputs');
  const [jobTitle, setJobTitle] = useState('');
  const [hasTitle, setHasTitle] = useState(!initialJobSpec && !external.cvText);
  const [hasSpec, setHasSpec] = useState(!!initialJobSpec);
  const [hasCv, setHasCv] = useState(!!external.cvText);
  const [jobSpec, setJobSpec] = useState(initialJobSpec);
  const [jobSpecMode, setJobSpecMode] = useState<JobSpecMode>('paste');
  const [jobSpecUrl, setJobSpecUrl] = useState('');
  const [urlFetching, setUrlFetching] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [cvText, setCvText] = useState(external.cvText ?? '');
  const [preparingMsg, setPreparingMsg] = useState('Analysing your CV…');

  // Pre-parsed CV context — populated as soon as the user provides CV text
  const [cvCtxParsed, setCvCtxParsed] = useState<CVContext | null>(null);
  const [parsingCv, setParsingCv] = useState(false);

  // Learn tab state
  const [learnSubject, setLearnSubject] = useState('');
  const [learnLoading, setLearnLoading] = useState(false);
  const [learnLesson, setLearnLesson] = useState<null | {
    concept: string; keyPoints: string[]; example: string; practiceQuestion: string; tip: string;
  }>(null);
  const [learnError, setLearnError] = useState('');

  const openAiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

  const runLearn = async () => {
    if (!learnSubject.trim() || !openAiKey) return;
    setLearnLoading(true); setLearnError(''); setLearnLesson(null);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o', temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are an expert interview coach. Return ONLY valid JSON.' },
            { role: 'user', content: `Create a concise, practical lesson on "${learnSubject.trim()}" for someone preparing for a job interview.\n\nReturn JSON: { "concept": "one-line definition", "keyPoints": ["3-4 bullets"], "example": "concrete example 2-3 sentences", "practiceQuestion": "one interview question testing this", "tip": "one insider tip" }` },
          ],
        }),
      });
      const data = await res.json() as { choices: { message: { content: string } }[] };
      setLearnLesson(JSON.parse(data.choices[0].message.content));
    } catch {
      setLearnError('Could not generate lesson — please try again.');
    } finally {
      setLearnLoading(false);
    }
  };

  // Auto-advance if both were pre-filled (enterprise / Magic Button path)
  useEffect(() => {
    if (external.jobDescriptionText && external.cvText) {
      prepare(external.jobDescriptionText, external.cvText, null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse CV with AI immediately whenever CV text changes (debounced 800ms)
  useEffect(() => {
    if (cvText.trim().length < 50) {
      setCvCtxParsed(null);
      setParsingCv(false);
      return;
    }

    setParsingCv(true);
    const timer = setTimeout(() => {
      const parse = aiScoringConfigured
        ? parseCVWithAI(cvText).catch(() => buildCVContext(cvText))
        : Promise.resolve(buildCVContext(cvText));

      parse.then(ctx => {
        setCvCtxParsed(ctx);
        setParsingCv(false);
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [cvText]);

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

  const prepare = async (js: string, cv: string, preComputedCvCtx: CVContext | null) => {
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

    // Use pre-parsed context if available — avoids a second API call
    const cvCtx = preComputedCvCtx ?? (
      cv.trim()
        ? aiScoringConfigured
          ? await parseCVWithAI(cv).catch(() => buildCVContext(cv))
          : buildCVContext(cv)
        : buildCVContext('')
    );

    const jobCtx = buildJobSpecContext(js);

    const [introResult, questions] = await Promise.all([
      aiScoringConfigured
        ? generateIntros(cvCtx, jobCtx).catch(() => ({
            sarahIntro: buildSarahIntro(cvCtx, jobCtx),
            jamesIntro: buildJamesIntro(cvCtx, jobCtx),
          }))
        : Promise.resolve({
            sarahIntro: buildSarahIntro(cvCtx, jobCtx),
            jamesIntro: buildJamesIntro(cvCtx, jobCtx),
          }),
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

  const HUB_TABS: Array<{ id: string; label: string; navTo?: string }> = [
    { id: 'interview', label: '🎤 Interview' },
    { id: 'learn', label: '📚 Learn' },
    { id: 'challenge', label: '⚡ Challenge', navTo: '/league' },
    { id: 'coming-soon', label: '🔮 Coming Soon' },
  ];

  const LEARN_TOPICS = ['STAR method', 'System Design', 'Stakeholder management', 'Salary negotiation', 'Leadership', 'Behavioural interviews'];

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      fontFamily: '-apple-system,"Segoe UI",sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Hub tab bar */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 0, maxWidth: '640px', width: '100%' }}>
          {HUB_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { if (tab.navTo) { navigate(tab.navTo); } else { setHubTab(tab.id as HubTab); } }}
              style={{
                padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
                color: hubTab === tab.id ? 'var(--blue)' : 'var(--text-3)',
                borderBottom: hubTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom: '-1px', transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── LEARN tab ── */}
        {hubTab === 'learn' && (
          <motion.div key="hub-learn" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px' }}>
            <div style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '6px' }}>Learn</div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Study any topic, instantly</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>Enter any subject and get a focused lesson built for interview preparation.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={learnSubject}
                  onChange={e => setLearnSubject(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runLearn()}
                  placeholder="e.g. C# async/await, STAR method, System Design…"
                  style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', color: 'var(--text)', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={runLearn} disabled={!learnSubject.trim() || learnLoading || !openAiKey}
                  style={{ background: learnSubject.trim() && !learnLoading && openAiKey ? 'var(--blue)' : 'rgba(79,142,247,0.3)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 20px', fontSize: '13px', fontWeight: 700, cursor: learnSubject.trim() && openAiKey ? 'pointer' : 'default', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  {learnLoading ? 'Building…' : 'Learn →'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {LEARN_TOPICS.map(t => (
                  <button key={t} onClick={() => setLearnSubject(t)}
                    style={{ fontSize: '11px', fontWeight: 600, background: learnSubject === t ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${learnSubject === t ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`, color: learnSubject === t ? 'var(--blue)' : 'var(--text-3)', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {t}
                  </button>
                ))}
              </div>
              {learnError && <div style={{ fontSize: '13px', color: 'var(--red)' }}>{learnError}</div>}
              {learnLoading && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px', textAlign: 'center' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    style={{ width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>Generating lesson on <strong>{learnSubject}</strong>…</div>
                </div>
              )}
              {learnLesson && !learnLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.1),rgba(167,139,250,0.08))', border: '1px solid rgba(79,142,247,0.2)', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '8px' }}>What is it?</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.6 }}>{learnLesson.concept}</div>
                  </div>
                  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>Key points</div>
                    {learnLesson.keyPoints.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(79,142,247,0.15)', border: '1px solid rgba(79,142,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'var(--blue)', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.55, paddingTop: '2px' }}>{p}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34D399', marginBottom: '8px' }}>Example</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.65, fontStyle: 'italic' }}>{learnLesson.example}</div>
                  </div>
                  <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '8px' }}>Practice question</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.55 }}>{learnLesson.practiceQuestion}</div>
                  </div>
                  <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '12px', padding: '16px 18px', display: 'flex', gap: '12px' }}>
                    <div style={{ fontSize: '18px' }}>💡</div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: '4px' }}>Insider tip</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>{learnLesson.tip}</div>
                    </div>
                  </div>
                  <button onClick={() => { setLearnLesson(null); setLearnSubject(''); }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 20px', fontSize: '13px', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'center' }}>
                    ← Learn another topic
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── COMING SOON tab ── */}
        {hubTab === 'coming-soon' && (
          <motion.div key="hub-coming" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px' }}>
            <div style={{ width: '100%', maxWidth: '560px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '10px' }}>More coming soon</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.65, marginBottom: '28px' }}>
                We're building visa interview prep, court preparation, driving theory, and more — because Explain isn't just for job interviews.
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '32px' }}>
                {['Visa Interviews', 'Driving Theory', 'Citizenship Tests', 'Court Preparation', 'Academic Admissions', 'Assessment Centres'].map(s => (
                  <span key={s} style={{ fontSize: '12px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '20px', padding: '5px 14px', color: '#a78bfa', fontWeight: 600 }}>{s}</span>
                ))}
              </div>
              <button onClick={() => setHubTab('interview')}
                style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px 32px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Back to Interview →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── INTERVIEW tab ── */}
        {hubTab === 'interview' && (
          <motion.div key="hub-interview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px' }}>

      <div style={{ width: '100%', maxWidth: '640px' }}>
        <AnimatePresence mode="wait">

          {/* ── Inputs step: flexible mode selector ── */}
          {step === 'inputs' && (
            <motion.div key="inputs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Prepare for your interview</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                  Start with just a job title, or add a job description and CV for a fully personalised session.
                </p>
              </div>

              {/* Mode toggle cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                {[
                  { key: 'title', label: '🏷 Job Title', desc: 'Type any role to prepare for', active: hasTitle, toggle: () => setHasTitle(v => !v) },
                  { key: 'spec', label: '📋 Job Spec', desc: 'Paste, upload, or fetch from URL', active: hasSpec, toggle: () => setHasSpec(v => !v) },
                  { key: 'cv', label: '📄 CV', desc: 'Personalise with your experience', active: hasCv, toggle: () => setHasCv(v => !v) },
                ].map(card => (
                  <button key={card.key} onClick={card.toggle}
                    style={{ padding: '14px 10px', background: card.active ? 'rgba(79,142,247,0.1)' : 'var(--bg3)', border: `1.5px solid ${card.active ? 'var(--blue)' : 'var(--border)'}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: card.active ? 'var(--blue)' : 'var(--text-3)', letterSpacing: '0.05em', marginBottom: '4px' }}>{card.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.4 }}>{card.desc}</div>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${card.active ? 'var(--blue)' : 'var(--border)'}`, background: card.active ? 'var(--blue)' : 'transparent', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {card.active && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff' }} />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Job Title section */}
              <AnimatePresence>
                {hasTitle && (
                  <motion.div key="title-section" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Job Title</div>
                    <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                      placeholder="e.g. Senior Fullstack Developer, Boxing Trainer, Software Architect…"
                      style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '13px 16px', color: 'var(--text)', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {['Senior Fullstack Developer', 'Software Architect', 'Professional Boxing Trainer', 'Marketing Manager'].map(ex => (
                        <button key={ex} onClick={() => setJobTitle(ex)}
                          style={{ fontSize: '11px', fontWeight: 600, background: jobTitle === ex ? 'rgba(79,142,247,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${jobTitle === ex ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`, color: jobTitle === ex ? 'var(--blue)' : 'var(--text-3)', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {ex}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Job Spec section */}
              <AnimatePresence>
                {hasSpec && (
                  <motion.div key="spec-section" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>Job Description</div>
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--bg3)', borderRadius: '10px', padding: '4px', marginBottom: '12px' }}>
                      {(['paste', 'upload', 'url'] as JobSpecMode[]).map(mode => (
                        <button key={mode} onClick={() => { setJobSpecMode(mode); setUrlError(''); }}
                          style={{ flex: 1, padding: '7px', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', background: jobSpecMode === mode ? 'var(--bg)' : 'transparent', color: jobSpecMode === mode ? 'var(--text)' : 'var(--text-3)', boxShadow: jobSpecMode === mode ? '0 1px 4px rgba(0,0,0,0.15)' : 'none' }}>
                          {mode === 'paste' ? '📋 Paste' : mode === 'upload' ? '📄 Upload' : '🔗 URL'}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      {jobSpecMode === 'paste' && (
                        <motion.div key="js-paste" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <Field value={jobSpec} onChange={setJobSpec} placeholder="Paste the full job description here…" rows={8} />
                        </motion.div>
                      )}
                      {jobSpecMode === 'upload' && (
                        <motion.div key="js-upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <FileUpload label="job description" onExtracted={(text) => setJobSpec(text)} />
                          {jobSpec.trim().length >= 50 && (
                            <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', fontSize: '13px', color: '#34D399' }}>✓ Job description extracted</div>
                          )}
                        </motion.div>
                      )}
                      {jobSpecMode === 'url' && (
                        <motion.div key="js-url" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="url" value={jobSpecUrl} onChange={e => { setJobSpecUrl(e.target.value); setUrlError(''); }} onKeyDown={e => e.key === 'Enter' && fetchFromUrl()} placeholder="https://company.com/careers/job-title"
                              style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '13px 16px', color: 'var(--text)', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
                            <button onClick={fetchFromUrl} disabled={urlFetching || !jobSpecUrl.trim()}
                              style={{ background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px 20px', fontSize: '13px', fontWeight: 700, cursor: urlFetching ? 'default' : 'pointer', opacity: !jobSpecUrl.trim() ? 0.4 : 1, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                              {urlFetching ? '…' : 'Fetch'}
                            </button>
                          </div>
                          {urlError && <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--red)' }}>{urlError}</div>}
                          {jobSpec.trim().length >= 50 && !urlError && (
                            <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '8px', fontSize: '13px', color: '#34D399' }}>✓ Job description fetched</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CV section */}
              <AnimatePresence>
                {hasCv && (
                  <motion.div key="cv-section" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>CV / Resume</div>
                    <FileUpload label="CV" onExtracted={(text) => setCvText(text)} />
                    <CVPreviewCard ctx={cvCtxParsed} parsing={parsingCv && cvText.trim().length >= 50} />
                    {!cvCtxParsed && !parsingCv && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
                          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>or paste below</span>
                          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                        </div>
                        <Field value={cvText} onChange={setCvText} placeholder="Paste your CV text here — work history, skills, achievements, education…" rows={6} />
                      </>
                    )}
                    {cvCtxParsed && (
                      <details style={{ marginTop: '10px' }}>
                        <summary style={{ fontSize: '12px', color: 'var(--text-3)', cursor: 'pointer', userSelect: 'none', listStyle: 'none' }}>✎ Edit raw CV text</summary>
                        <div style={{ marginTop: '10px' }}><Field value={cvText} onChange={setCvText} placeholder="" rows={5} /></div>
                      </details>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Start button */}
              {(() => {
                const titleOk = hasTitle && jobTitle.trim().length >= 2;
                const specOk = hasSpec && jobSpec.trim().length >= 50;
                const cvOk = hasCv && (cvText.trim().length >= 50 || !!cvCtxParsed);
                const anyToggled = hasTitle || hasSpec || hasCv;
                const canStart = titleOk || specOk || cvOk;
                const effectiveSpec = specOk ? jobSpec : (titleOk ? jobTitle : '');
                const effectiveCv = cvOk ? cvText : '';
                const effectiveCvCtx = cvOk ? cvCtxParsed : null;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    {anyToggled && !canStart && (
                      <span style={{ fontSize: '12px', color: 'var(--text-3)', flex: 1 }}>
                        {hasTitle && !titleOk ? 'Enter a job title to continue' : hasSpec && !specOk ? 'Add more of the job spec to continue' : 'Add your CV text to continue'}
                      </span>
                    )}
                    <button onClick={() => prepare(effectiveSpec, effectiveCv, effectiveCvCtx)} disabled={!canStart}
                      style={{ background: canStart ? 'var(--blue)' : 'rgba(79,142,247,0.3)', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px 32px', fontSize: '14px', fontWeight: 700, cursor: canStart ? 'pointer' : 'default', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      Start Interview →
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {/* Step: Preparing */}
          {step === 'preparing' && (
            <motion.div key="preparing" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '48px 0' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', margin: '0 auto 24px' }}
              />
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Preparing your session</div>
              <motion.div key={preparingMsg} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: '14px', color: 'var(--text-3)' }}>
                {preparingMsg}
              </motion.div>
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
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
