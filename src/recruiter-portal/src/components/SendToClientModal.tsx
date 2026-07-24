import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildClientUrl, generateFollowUps, type ClientSession } from '../utils/clientSession';
import type { CVContext, JobSpecContext } from '../utils/contextBuilder';
import type { InterviewQuestion } from '../api/explainApi';

interface Props {
  cvCtx: CVContext;
  jobCtx: JobSpecContext;
  questions: InterviewQuestion[];
  onClose: () => void;
}

export function SendToClientModal({ cvCtx, jobCtx, questions, onClose }: Props) {
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  const fullName = [cvCtx.firstName, cvCtx.lastName].filter(Boolean).join(' ') || 'Candidate';

  function generate() {
    const session: ClientSession = {
      version: 2,
      meta: {
        candidateName: fullName,
        currentRole: cvCtx.roles[0] ?? '',
        currentCompany: cvCtx.experience?.[0]?.company ?? cvCtx.companies[0] ?? '',
        recruiterName: recruiterName || undefined,
        recruiterNotes: recruiterNotes || undefined,
        interviewDate: interviewDate || undefined,
        interviewTime: interviewTime || undefined,
        interviewLocation: interviewLocation || undefined,
        generatedAt: Date.now(),
      },
      cvCtx: {
        firstName: cvCtx.firstName,
        lastName: cvCtx.lastName,
        candidateName: cvCtx.candidateName,
        roles: cvCtx.roles,
        companies: cvCtx.companies,
        dates: cvCtx.dates,
        skills: cvCtx.skills,
        technologies: cvCtx.technologies,
        experience: cvCtx.experience,
        education: cvCtx.education,
        achievements: cvCtx.achievements,
        certifications: cvCtx.certifications,
        responsibilities: cvCtx.responsibilities,
        leadershipSignals: cvCtx.leadershipSignals,
        yearsOfExperience: cvCtx.yearsOfExperience,
        seniority: cvCtx.seniority,
        summary: cvCtx.summary,
        _source: cvCtx._source,
        // rawText intentionally omitted — keeps URL size manageable
      },
      jobCtx: {
        title: jobCtx.title,
        company: jobCtx.company,
        industry: jobCtx.industry,
        requiredSkills: jobCtx.requiredSkills,
        techStack: jobCtx.techStack,
        responsibilities: jobCtx.responsibilities,
        behaviouralThemes: jobCtx.behaviouralThemes,
        leadershipExpectations: jobCtx.leadershipExpectations,
        seniority: jobCtx.seniority,
        // omit rawText
      },
      questions: questions.map(q => ({
        ...q,
        followUps: generateFollowUps(q),
      })),
    };

    setLink(buildClientUrl(session));
  }

  useEffect(() => { generate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto' }}
        >
          {/* Header */}
          <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>Send to Client</div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>
                Generate a secure interview brief for {fullName ? <strong style={{ color: 'var(--text-2)' }}>{fullName}</strong> : 'this candidate'}.
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '20px', padding: '0', lineHeight: 1 }}>×</button>
          </div>

          <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Optional fields */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Interview Details (optional)
              </div>

              <Field label="Your name (recruiter)" value={recruiterName} onChange={setRecruiterName} placeholder="e.g. Mike Afolabi" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Field label="Interview date" value={interviewDate} onChange={setInterviewDate} placeholder="e.g. Fri 1 Aug 2025" type="text" />
                <Field label="Interview time" value={interviewTime} onChange={setInterviewTime} placeholder="e.g. 10:00am" type="text" />
              </div>

              <Field label="Location / link" value={interviewLocation} onChange={setInterviewLocation} placeholder="e.g. Zoom · zoom.us/j/123 or Office — Floor 3" />

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Recruiter notes for the client</label>
                <textarea
                  value={recruiterNotes}
                  onChange={e => setRecruiterNotes(e.target.value)}
                  placeholder="e.g. Strong culture fit. Pay attention to Azure experience — it's critical for this role."
                  rows={3}
                  style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text)', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>

              <button
                onClick={generate}
                style={{ alignSelf: 'flex-start', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '7px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}
              >
                Update link
              </button>
            </div>

            {/* What's included */}
            <div style={{ fontSize: '12px', color: 'var(--text-3)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-2)', marginBottom: '2px' }}>This brief includes:</div>
              {[
                `${questions.filter(q => q.source !== 'HR').length} role-specific questions${jobCtx.company ? ` for ${jobCtx.company}` : ''}`,
                `${questions.filter(q => q.source === 'HR').length} culture & fit questions`,
                'Follow-up probes for every question',
                'Model answer guide for each question',
                'Recommended interview structure',
                'Structured candidate profile & CV',
              ].map(item => (
                <div key={item} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: '#34D399' }}>✓</span> {item}
                </div>
              ))}
            </div>

            {/* Link */}
            {link && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Secure client link
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{
                    flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '10px 12px', fontSize: '12px', color: 'var(--text-3)', wordBreak: 'break-all',
                    lineHeight: 1.5, maxHeight: '60px', overflow: 'hidden', fontFamily: 'monospace',
                  }}>
                    {link.slice(0, 80)}…
                  </div>
                  <button
                    onClick={copyLink}
                    style={{
                      flexShrink: 0, background: copied ? 'rgba(52,211,153,0.15)' : 'var(--blue)',
                      border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'var(--blue)'}`,
                      borderRadius: '8px', padding: '0 18px', fontSize: '13px', fontWeight: 700,
                      color: copied ? '#34D399' : '#fff', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {copied ? '✓ Copied' : 'Copy link'}
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '8px' }}>
                  All interview data is encoded in the link — no account required for the client. Share by email or message.
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: '5px' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
      />
    </div>
  );
}
