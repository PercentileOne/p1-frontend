import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { logFlowEvent } from '../api/flowLogger';
import { CERTIFICATION_BANK, type CertificationBankEntry } from '../data/certificationBank';

// Intake screen for the Certifications & Exams mode — copy-trimmed from InterviewPackStart.tsx's
// shell (card layout, validation-on-attempt, back button, header treatment) but the FIELDS are
// entirely different: a finite cert/exam picker instead of free-text job title/CV, no mic
// consent (no spoken answers), no language selector (English only for v1).

const QUESTION_COUNTS = [15, 30, 60];

const CATEGORY_LABELS: Record<CertificationBankEntry['category'], string> = {
  certification: 'Professional Certifications',
  gcse: 'GCSE',
  'a-level': 'A-Level',
};

export default function CertExamStart() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(30);
  const [preferredName, setPreferredName] = useState('');
  const [attemptedStart, setAttemptedStart] = useState(false);

  useEffect(() => { logFlowEvent('CERT_EXAM_PICKER_VIEW'); }, []);

  const selected = CERTIFICATION_BANK.find(c => c.id === selectedId) ?? null;
  const byCategory = (Object.keys(CATEGORY_LABELS) as CertificationBankEntry['category'][])
    .map(category => ({ category, items: CERTIFICATION_BANK.filter(c => c.category === category) }))
    .filter(g => g.items.length > 0);

  function pick(cert: CertificationBankEntry) {
    if (!cert.enabled) return;
    setSelectedId(cert.id);
    logFlowEvent('CERT_SELECTED', { certId: cert.id, examCode: cert.examCode });
  }

  function handleStart() {
    if (!selected) {
      setAttemptedStart(true);
      return;
    }
    logFlowEvent('START_CERT_EXAM_CLICKED', { certId: selected.id, questionCount });
    navigate(`/cert-exam/${selected.id}`, {
      state: { certId: selected.id, questionCount, preferredName: preferredName.trim() || undefined },
    });
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: '-apple-system,"Segoe UI",sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px 60px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: '640px', display: 'flex', flexDirection: 'column' }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
            background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, padding: 0,
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', marginBottom: '10px', lineHeight: 1.2 }}>
            Certifications & Exams
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
            Pick a certification or exam — Michelle will brief you, then it's a fully
            multiple-choice mock exam, scored just like the real thing.
          </p>
        </div>

        <div style={{
          background: 'var(--bg2)',
          border: `1px solid ${attemptedStart && !selected ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
          borderRadius: '16px', marginBottom: '16px', padding: '20px', transition: 'border-color 0.15s',
        }}>
          {byCategory.map(({ category, items }) => (
            <div key={category} style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
                {CATEGORY_LABELS[category]}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map(cert => {
                  const isSelected = selectedId === cert.id;
                  return (
                    <button
                      key={cert.id}
                      onClick={() => pick(cert)}
                      disabled={!cert.enabled}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        textAlign: 'left', padding: '14px 16px', borderRadius: '10px',
                        background: isSelected ? 'rgba(79,142,247,0.1)' : 'var(--bg3)',
                        border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                        cursor: cert.enabled ? 'pointer' : 'default',
                        opacity: cert.enabled ? 1 : 0.5,
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{cert.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{cert.vendor} · {cert.examCode}</div>
                      </div>
                      {cert.enabled ? (
                        isSelected && <CheckCircle2 size={18} color="#4F8EF7" />
                      ) : (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '3px 9px', whiteSpace: 'nowrap' }}>
                          Coming soon
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {attemptedStart && !selected && (
            <div style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>Pick a certification or exam to continue.</div>
          )}
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '16px', padding: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
            Number of questions
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {QUESTION_COUNTS.map(n => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  background: questionCount === n ? 'rgba(79,142,247,0.1)' : 'var(--bg3)',
                  border: `1px solid ${questionCount === n ? 'var(--blue)' : 'var(--border)'}`,
                  color: questionCount === n ? 'var(--blue)' : 'var(--text-2)',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', margin: '18px 0 10px' }}>
            Known as (optional)
          </div>
          <input
            value={preferredName}
            onChange={e => setPreferredName(e.target.value)}
            placeholder="How should Michelle address you?"
            style={{
              width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '11px 14px', color: 'var(--text)', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <motion.button
          onClick={handleStart}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', color: '#fff', border: 'none',
            borderRadius: '13px', padding: '16px', fontSize: '15px', fontWeight: 800, cursor: 'pointer',
          }}
        >
          Begin Exam →
        </motion.button>
      </motion.div>
    </div>
  );
}
