import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileUpload } from '../components/FileUpload';
import { logFlowEvent } from '../api/flowLogger';

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

interface IncomingState {
  jobSpec?: string;
  jobTitle?: string;
  company?: string;
}

export default function InterviewPackStart() {
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = (location.state ?? {}) as IncomingState;

  const [cvText, setCvText] = useState('');
  const [cvFileName, setCvFileName] = useState('');
  const [jobSpec, setJobSpec] = useState(incoming.jobSpec ?? '');
  const [jobSpecFileName, setJobSpecFileName] = useState('');
  const [showJobSpec, setShowJobSpec] = useState(!incoming.jobSpec);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    logFlowEvent('UPLOAD_SCREEN_VIEW', { hasIncomingJobSpec: Boolean(incoming.jobSpec) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    logFlowEvent('START_INTERVIEW_CLICKED', {
      hasJobSpec: Boolean(jobSpec.trim()),
      hasCv: Boolean(cvText.trim()),
      selectedLanguage,
    });
    navigate('/interview-room/demo', {
      state: {
        jobSpecText: jobSpec.trim() || incoming.jobSpec || '',
        cvText: cvText.trim() || undefined,
        selectedLanguage,
        autoStart: true,
      },
    });
  };

  const hasEnough = jobSpec.trim().length > 20 || (incoming.jobSpec?.length ?? 0) > 20;

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
            <img src="/assets/explain-logo.svg" width={36} height={36} alt="Explain" style={{ borderRadius: '50%' }} />
            <span style={{ fontWeight: 800, fontSize: '20px', color: '#fff' }}>
              explain<span style={{ color: 'var(--blue)' }}>.global</span>
            </span>
          </div>

          {incoming.jobTitle && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.2)',
              borderRadius: '8px', padding: '6px 14px',
              fontSize: '12px', fontWeight: 700, color: 'var(--blue)', marginBottom: '20px',
            }}>
              {incoming.company && `${incoming.company} · `}{incoming.jobTitle}
            </div>
          )}

          <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', marginBottom: '10px', lineHeight: 1.2 }}>
            Set up your interview
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
            Upload a job spec and/or CV — we'll tailor the entire interview to match
          </p>
        </div>

        {/* Job Spec Upload */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '28px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '16px' }}>
            Job Spec <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </div>

          {incoming.jobSpec ? (
            <div style={{ marginBottom: '8px' }}>
              <button
                onClick={() => setShowJobSpec(v => !v)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer', padding: '0', textDecoration: 'underline' }}
              >
                {showJobSpec ? 'Hide job spec ↑' : 'View / edit job spec ↓'}
              </button>
            </div>
          ) : null}

          {showJobSpec && (
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
                <div style={{ marginTop: '12px', fontSize: '12px', color: '#34D399' }}>
                  ✓ {jobSpecFileName} loaded
                </div>
              )}
            </>
          )}

          {!showJobSpec && !incoming.jobSpec && (
            <button
              onClick={() => setShowJobSpec(true)}
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px dashed var(--border)',
                borderRadius: '10px', padding: '14px', color: 'var(--text-3)', fontSize: '13px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              + Add job spec (strongly recommended)
            </button>
          )}
        </div>

        {/* CV Upload */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '28px', marginBottom: '16px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '16px' }}>
            Your CV <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(recommended)</span>
          </div>

          <FileUpload
            label="CV"
            onExtracted={(text, name) => {
              setCvText(text);
              setCvFileName(name);
              logFlowEvent('CV_UPLOADED', { fileName: name, charCount: text.length });
            }}
          />

          {!cvText && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>or paste below</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
              <textarea
                value={cvText}
                onChange={e => { setCvText(e.target.value); setCvFileName(''); }}
                placeholder="Paste your CV / résumé text here — skills, experience, achievements…"
                rows={5}
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '14px', color: 'var(--text)', fontSize: '13px',
                  lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </>
          )}

          {cvFileName && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#34D399' }}>
              ✓ {cvFileName} loaded
            </div>
          )}
        </div>

        {/* Language */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '24px 28px', marginBottom: '20px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '14px' }}>
            Interview Language
          </div>
          <select
            value={selectedLanguage}
            onChange={e => {
              setSelectedLanguage(e.target.value);
              logFlowEvent('LANGUAGE_SELECTED', { language: e.target.value });
            }}
            style={{
              width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '12px 14px', color: 'var(--text)', fontSize: '14px',
              fontFamily: 'inherit', outline: 'none', cursor: 'pointer', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
            }}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '8px' }}>
            Mike, Sarah, and James will speak in the selected language. Questions will be generated in this language.
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={!hasEnough && !cvText}
          style={{
            width: '100%',
            background: (hasEnough || cvText)
              ? 'linear-gradient(135deg, var(--blue), #a78bfa)'
              : 'rgba(79,142,247,0.25)',
            color: '#fff', border: 'none', borderRadius: '12px',
            padding: '18px', fontSize: '16px', fontWeight: 800,
            cursor: (hasEnough || cvText) ? 'pointer' : 'default',
            fontFamily: 'inherit', letterSpacing: '-0.01em', transition: 'opacity 0.2s',
          }}
        >
          Start Interview →
        </button>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-3)', marginTop: '14px', lineHeight: 1.6 }}>
          Your CV is never stored. This session is private and confidential.
        </p>
      </motion.div>
    </div>
  );
}
