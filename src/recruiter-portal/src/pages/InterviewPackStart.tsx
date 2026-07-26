import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileUpload } from '../components/FileUpload';

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
  const [showJobSpec, setShowJobSpec] = useState(!incoming.jobSpec);

  const handleStart = () => {
    navigate('/interview-room/demo', {
      state: {
        jobSpecText: jobSpec.trim() || incoming.jobSpec || '',
        cvText: cvText.trim() || undefined,
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
        style={{
          width: '100%',
          maxWidth: '600px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
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
              background: 'rgba(79,142,247,0.08)',
              border: '1px solid rgba(79,142,247,0.2)',
              borderRadius: '8px', padding: '6px 14px',
              fontSize: '12px', fontWeight: 700, color: 'var(--blue)',
              marginBottom: '20px',
            }}>
              {incoming.company && `${incoming.company} · `}{incoming.jobTitle}
            </div>
          )}

          <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', marginBottom: '10px', lineHeight: 1.2 }}>
            Upload Your CV and/or Job Spec Below
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
            We'll tailor your interview to this exact role
          </p>
        </div>

        {/* CV Upload */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: '16px' }}>
            Your CV (recommended)
          </div>

          <FileUpload
            label="CV"
            onExtracted={(text, name) => {
              setCvText(text);
              setCvFileName(name);
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
                  width: '100%',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px',
                  color: 'var(--text)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </>
          )}

          {cvFileName && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-3)' }}>
              ✓ {cvFileName} loaded
            </div>
          )}
        </div>

        {/* Job Spec — show if not pre-filled, or toggle */}
        {incoming.jobSpec ? (
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setShowJobSpec(v => !v)}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-3)', fontSize: '12px',
                cursor: 'pointer', padding: '0 4px',
                textDecoration: 'underline',
              }}
            >
              {showJobSpec ? 'Hide job spec ↑' : 'View / edit job spec ↓'}
            </button>
          </div>
        ) : null}

        {showJobSpec && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              overflow: 'hidden',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>
              Job Spec
            </div>
            <textarea
              value={jobSpec}
              onChange={e => setJobSpec(e.target.value)}
              placeholder="Paste the full job description here…"
              rows={8}
              style={{
                width: '100%',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px',
                color: 'var(--text)',
                fontSize: '13px',
                lineHeight: 1.65,
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </motion.div>
        )}

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={!hasEnough}
          style={{
            width: '100%',
            background: hasEnough
              ? 'linear-gradient(135deg, var(--blue), #a78bfa)'
              : 'rgba(79,142,247,0.25)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '18px',
            fontSize: '16px',
            fontWeight: 800,
            cursor: hasEnough ? 'pointer' : 'default',
            fontFamily: 'inherit',
            letterSpacing: '-0.01em',
            transition: 'opacity 0.2s',
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
