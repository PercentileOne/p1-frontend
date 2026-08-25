import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileUpload } from '../components/FileUpload';
import { logFlowEvent } from '../api/flowLogger';
import { type Career, searchCareers, reportMissingCareerTitle } from '../api/careersApi';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'it', name: 'Italian' },
  { code: 'pl', name: 'Polish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
  { code: 'sw', name: 'Swahili' },
  { code: 'ro', name: 'Romanian' },
];

const DIFFICULTIES = [
  {
    value: 'Standard',
    color: '#34D399',
    borderColor: 'rgba(52,211,153,0.3)',
    desc: 'Well-rounded questions to build genuine confidence and solid preparation.',
  },
  {
    value: 'Pro',
    color: '#F59E0B',
    borderColor: 'rgba(245,158,11,0.3)',
    desc: 'Challenging questions that probe deeper — sharpen your edge beyond the basics.',
  },
  {
    value: 'Expert',
    color: '#EF4444',
    borderColor: 'rgba(239,68,68,0.3)',
    desc: "We'll treat you like the leading authority in your field. Intense. Technical. Unforgiving.",
  },
];

interface IncomingState {
  jobSpec?: string;
  jobTitle?: string;
  company?: string;
  preferredName?: string;
  // From a recruiter's received interview prep — a real CV/difficulty already on file for
  // this exact upcoming interview, unlike the general dashboard-initiated case above.
  cvText?: string;
  difficulty?: string;
}

const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`;

// Candidate-portal counterpart to recruiter-portal's InterviewPackStart.tsx — same setup
// screen (CV, job title/spec, language, difficulty, recording consent) so every practice
// interview here starts from a real CV/job, not the bare demo-default questions
// InterviewRoomPage falls back to when it receives no route state at all.
export default function InterviewPackStart() {
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = (location.state ?? {}) as IncomingState;

  const [jobTitle, setJobTitle] = useState(incoming.jobTitle ?? '');
  const [cvText, setCvText] = useState(incoming.cvText ?? '');
  const [cvFileName, setCvFileName] = useState('');
  const [cvInputTab, setCvInputTab] = useState<'upload' | 'text'>('upload');
  // Deliberately not pre-filled from incoming.preferredName (e.g. the candidate's own
  // account name) — this field means "what should the AI call you in THIS interview",
  // which is usually the name on the CV being tested, not always the account holder's own.
  const [preferredName, setPreferredName] = useState('');
  const [jobSpec, setJobSpec] = useState(incoming.jobSpec ?? '');
  const [jobSpecFileName, setJobSpecFileName] = useState('');
  const [activeTab, setActiveTab] = useState<'jobspec' | 'cv'>('cv');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedDifficulty, setSelectedDifficulty] = useState(incoming.difficulty ?? 'Standard');
  const [consentToRecord, setConsentToRecord] = useState(true);
  // Only shown after a blocked attempt to start — not on first load, so an empty form
  // doesn't look like it's already in an error state before the candidate's done anything.
  const [attemptedStart, setAttemptedStart] = useState(false);

  // Job title type-ahead — suggests real careers from the database as the candidate
  // types, but never blocks free text (a title genuinely missing from the database is
  // still a valid interview to run; it's just reported so the population job can catch up).
  const [jobTitleSuggestions, setJobTitleSuggestions] = useState<Career[]>([]);
  const [showJobTitleSuggestions, setShowJobTitleSuggestions] = useState(false);
  const jobTitleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMatchedTitleRef = useRef<string | null>(null); // avoids re-reporting the same free-typed title repeatedly

  const handleJobTitleChange = useCallback((value: string) => {
    setJobTitle(value);
    if (jobTitleDebounceRef.current) clearTimeout(jobTitleDebounceRef.current);
    if (value.trim().length < 2) { setJobTitleSuggestions([]); setShowJobTitleSuggestions(false); return; }
    jobTitleDebounceRef.current = setTimeout(async () => {
      const results = await searchCareers(value, 8);
      setJobTitleSuggestions(results);
      setShowJobTitleSuggestions(results.length > 0);
    }, 280);
  }, []);

  const selectJobTitleSuggestion = useCallback((c: Career) => {
    setJobTitle(c.title);
    lastMatchedTitleRef.current = c.title;
    setShowJobTitleSuggestions(false);
  }, []);

  const handleJobTitleBlur = useCallback(() => {
    setTimeout(() => setShowJobTitleSuggestions(false), 150); // let a suggestion click register first
    const typed = jobTitle.trim();
    if (typed.length < 3 || typed === lastMatchedTitleRef.current) return;
    const matchesKnownCareer = jobTitleSuggestions.some(c => c.title.toLowerCase() === typed.toLowerCase());
    if (!matchesKnownCareer) {
      lastMatchedTitleRef.current = typed; // only report once per distinct typed title
      void reportMissingCareerTitle(typed);
    }
  }, [jobTitle, jobTitleSuggestions]);

  useEffect(() => {
    logFlowEvent('UPLOAD_SCREEN_VIEW', { hasIncomingJobSpec: Boolean(incoming.jobSpec) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    if (!hasEnough) {
      setAttemptedStart(true);
      if (!hasCV) setActiveTab('cv'); // surface the CV upload area even if they're on the Job Spec tab
      logFlowEvent('START_INTERVIEW_BLOCKED', { hasRole, hasCV });
      return;
    }
    logFlowEvent('START_INTERVIEW_CLICKED', {
      hasJobSpec: Boolean(jobSpec.trim()),
      hasCv: Boolean(cvText.trim()),
      hasJobTitle: Boolean(jobTitle.trim()),
      selectedLanguage,
      selectedDifficulty,
    });
    navigate('/interview/standard', {
      state: {
        jobTitle: jobTitle.trim() || incoming.jobTitle || '',
        company: incoming.company || '',
        jobSpecText: jobSpec.trim() || incoming.jobSpec || '',
        cvText: cvText.trim() || undefined,
        preferredName: preferredName.trim() || undefined,
        selectedLanguage,
        selectedDifficulty,
        autoStart: true,
        consentToRecord,
      },
    });
  };

  const difficulty = DIFFICULTIES.find(d => d.value === selectedDifficulty) ?? DIFFICULTIES[0];
  const hasCV = cvText.trim().length > 20 || cvFileName.length > 0;
  const hasRole = jobTitle.trim().length > 2 || jobSpec.trim().length > 20;
  const hasEnough = hasRole && hasCV;
  const missingParts = [!hasRole && 'a job title (or job spec)', !hasCV && 'your CV'].filter(Boolean) as string[];

  const tabStyle = (active: boolean) => ({
    flex: 1,
    padding: '11px 16px',
    background: active ? 'var(--bg3)' : 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
    color: active ? 'var(--text)' : 'var(--text-3)',
    fontSize: '13px',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    letterSpacing: '0.01em',
  } as React.CSSProperties);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: '-apple-system,"Segoe UI",sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '0' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg,#34D399,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.05em' }}>IM</div>
            <span style={{ fontWeight: 800, fontSize: '20px', color: '#fff' }}>
              Interview<span style={{ color: '#34D399' }}>Me</span><span style={{ color: '#4F8EF7' }}>.global</span>
            </span>
          </div>

          {incoming.company && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)',
              borderRadius: '8px', padding: '6px 14px',
              fontSize: '12px', fontWeight: 700, color: 'var(--blue)', marginBottom: '20px',
            }}>
              {incoming.company}{incoming.jobTitle ? ` · ${incoming.jobTitle}` : ''}
            </div>
          )}

          <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', marginBottom: '10px', lineHeight: 1.2 }}>
            Set up your interview
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
            Tell us about the role — we'll tailor every question to match
          </p>
        </div>

        {/* Job Title */}
        <div style={{ background: 'var(--bg2)', border: `1px solid ${attemptedStart && !hasRole ? 'rgba(245,158,11,0.5)' : 'var(--border)'}`, borderRadius: '16px', padding: '24px 28px', marginBottom: '16px', transition: 'border-color 0.15s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Job Title</span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 400 }}>(or upload a Job Spec)</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={jobTitle}
              onChange={e => handleJobTitleChange(e.target.value)}
              onFocus={e => { e.target.style.borderColor = 'rgba(79,142,247,0.5)'; if (jobTitleSuggestions.length > 0) setShowJobTitleSuggestions(true); }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; handleJobTitleBlur(); }}
              placeholder="e.g. Head of Engineering, Senior Product Manager, Registered Nurse…"
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '13px 16px', color: 'var(--text)', fontSize: '14px',
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
            />
            {showJobTitleSuggestions && jobTitleSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#0d0c1e', border: '1px solid rgba(79,142,247,0.3)', borderRadius: '10px', overflow: 'hidden', zIndex: 20, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                {jobTitleSuggestions.map(c => (
                  <div
                    key={c.id}
                    onMouseDown={() => selectJobTitleSuggestion(c)}
                    style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,142,247,0.1)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{c.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{c.category}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Job Spec + CV — tabbed */}
        <div style={{ background: 'var(--bg2)', border: `1px solid ${attemptedStart && !hasCV ? 'rgba(245,158,11,0.5)' : 'var(--border)'}`, borderRadius: '16px', marginBottom: '16px', overflow: 'hidden', transition: 'border-color 0.15s' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button style={tabStyle(activeTab === 'cv')} onClick={() => setActiveTab('cv')}>
              👤 Your CV {cvText || cvFileName ? '✓' : '* required'}
            </button>
            <button style={tabStyle(activeTab === 'jobspec')} onClick={() => setActiveTab('jobspec')}>
              📄 Job Spec {incoming.jobSpec ? '✓' : '(optional)'}
            </button>
          </div>

          {/* Tab content */}
          <div style={{ padding: '24px 28px' }}>

            {activeTab === 'jobspec' && (
              <>
                <FileUpload
                  label="Job Spec"
                  onExtracted={(text, name) => {
                    setJobSpec(text);
                    setJobSpecFileName(name);
                    logFlowEvent('JOB_SPEC_UPLOADED', { fileName: name, charCount: text.length });
                  }}
                />
                {!jobSpecFileName && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>or paste below</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    </div>
                    <textarea
                      value={jobSpec}
                      onChange={e => setJobSpec(e.target.value)}
                      placeholder="Paste the full job description here…"
                      rows={6}
                      style={{
                        width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                        borderRadius: '10px', padding: '14px', color: 'var(--text)', fontSize: '13px',
                        lineHeight: 1.65, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                  </>
                )}
                {jobSpecFileName && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#34D399' }}>✓ {jobSpecFileName} loaded</div>
                )}
              </>
            )}

            {activeTab === 'cv' && (
              <>
                {/* Known As */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Known As</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 400 }}>(optional — overrides your account name)</span>
                  </div>
                  <input
                    type="text"
                    value={preferredName}
                    onChange={e => setPreferredName(e.target.value)}
                    placeholder="e.g. Clifford, Alex, Dr. Patel…"
                    style={{
                      width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderRadius: '10px', padding: '13px 16px', color: 'var(--text)', fontSize: '14px',
                      fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(79,142,247,0.5)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
                  />
                </div>

                {/* CV input tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
                  {(['upload', 'text'] as const).map(t => (
                    <button key={t} onClick={() => setCvInputTab(t)} style={{
                      padding: '7px 16px', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                      color: cvInputTab === t ? 'var(--blue)' : 'var(--text-3)',
                      borderBottom: cvInputTab === t ? '2px solid var(--blue)' : '2px solid transparent',
                      marginBottom: '-1px', transition: 'all 0.15s',
                    }}>
                      {t === 'upload' ? 'CV Upload' : 'CV Text'}
                    </button>
                  ))}
                </div>
                {cvInputTab === 'upload' && (
                  <>
                    <FileUpload
                      label="CV"
                      onExtracted={(text, name) => {
                        setCvText(text);
                        setCvFileName(name);
                        logFlowEvent('CV_UPLOADED', { fileName: name, charCount: text.length });
                      }}
                    />
                    {cvFileName && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#34D399' }}>✓ {cvFileName} loaded</div>
                    )}
                  </>
                )}
                {cvInputTab === 'text' && (
                  <textarea
                    value={cvText}
                    onChange={e => { setCvText(e.target.value); setCvFileName(''); }}
                    placeholder="Paste your CV / résumé text here — skills, experience, achievements…"
                    rows={8}
                    style={{
                      width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderRadius: '10px', padding: '14px', color: 'var(--text)', fontSize: '13px',
                      lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                )}
              </>
            )}

          </div>
        </div>

        {/* Language + Difficulty — side by side */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>

          {/* Language */}
          <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 22px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '14px' }}>
              Interview Language
            </div>
            <select
              value={selectedLanguage}
              onChange={e => { setSelectedLanguage(e.target.value); logFlowEvent('LANGUAGE_SELECTED', { language: e.target.value }); }}
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '12px 14px', color: 'var(--text)', fontSize: '14px',
                fontFamily: 'inherit', outline: 'none', cursor: 'pointer', appearance: 'none',
                backgroundImage: SELECT_CHEVRON,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
              }}
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '10px', lineHeight: 1.5 }}>
              Sarah and James will speak, ask, and respond entirely in {LANGUAGES.find(l => l.code === selectedLanguage)?.name ?? 'English'}.
            </div>
          </div>

          {/* Difficulty */}
          <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 22px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '14px' }}>
              Question Difficulty
            </div>
            <select
              value={selectedDifficulty}
              onChange={e => setSelectedDifficulty(e.target.value)}
              style={{
                width: '100%', background: 'var(--bg3)',
                border: `1px solid ${difficulty.borderColor}`,
                borderRadius: '10px', padding: '12px 14px',
                color: difficulty.color,
                fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', outline: 'none', cursor: 'pointer', appearance: 'none',
                backgroundImage: SELECT_CHEVRON,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
              }}
            >
              {DIFFICULTIES.map(d => (
                <option key={d.value} value={d.value} style={{ color: d.color, background: '#0c1220' }}>{d.value}</option>
              ))}
            </select>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '10px', lineHeight: 1.5 }}>
              {difficulty.desc}
            </div>
          </div>

        </div>

        {/* Recording consent — record widget toggle */}
        <button
          onClick={() => setConsentToRecord(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            width: '100%', marginTop: '4px', marginBottom: '16px',
            background: consentToRecord ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${consentToRecord ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px', padding: '14px 18px',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            transition: 'all 0.25s ease',
          }}
        >
          {/* Record dot */}
          <span style={{ position: 'relative', flexShrink: 0, width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{
              display: 'block', width: '14px', height: '14px', borderRadius: '50%',
              background: consentToRecord ? '#ef4444' : 'rgba(255,255,255,0.2)',
              transition: 'background 0.25s ease',
              boxShadow: consentToRecord ? '0 0 0 0 rgba(239,68,68,0.6)' : 'none',
              animation: consentToRecord ? 'recPulse 1.6s ease-out infinite' : 'none',
            }} />
          </span>
          {/* Label */}
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: consentToRecord ? '#f87171' : 'var(--text-3)', transition: 'color 0.25s', letterSpacing: '0.01em' }}>
              {consentToRecord ? 'Recording on' : 'Recording off'}
            </span>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', marginTop: '2px', lineHeight: 1.4 }}>
              {consentToRecord
                ? 'Recruiters can watch your interview back. Tap to turn off.'
                : 'Interview will not be recorded. Tap to enable.'}
            </span>
          </span>
          {/* On/off pill */}
          <span style={{
            flexShrink: 0, fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em',
            padding: '4px 10px', borderRadius: '20px',
            background: consentToRecord ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
            color: consentToRecord ? '#f87171' : 'var(--text-3)',
            transition: 'all 0.25s',
          }}>
            {consentToRecord ? 'ON' : 'OFF'}
          </span>
        </button>
        <style>{`
          @keyframes recPulse {
            0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
            70%  { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
            100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          }
        `}</style>

        {/* CTA — deliberately not `disabled`: a disabled button can't tell you why it won't
            click. Instead, clicking while incomplete surfaces exactly what's missing below. */}
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            background: hasEnough
              ? 'linear-gradient(135deg, var(--blue), #a78bfa)'
              : 'rgba(79,142,247,0.25)',
            color: '#fff', border: 'none', borderRadius: '12px',
            padding: '18px', fontSize: '16px', fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '-0.01em', transition: 'opacity 0.2s',
          }}
        >
          Start Interview →
        </button>

        {attemptedStart && !hasEnough && (
          <div style={{ marginTop: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '11px 16px', fontSize: '13px', color: 'var(--amber)', fontWeight: 600, textAlign: 'center' }}>
            ⚠️ Add {missingParts.join(' and ')} before you can start.
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-3)', marginTop: '14px', lineHeight: 1.6 }}>
          Your CV is never stored. This session is private and confidential.
        </p>
      </motion.div>
    </div>
  );
}
