import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { readSessionFromHash, type ClientSession } from '../../utils/clientSession';
import ClientOverview from './ClientOverview';
import ClientQuestions from './ClientQuestions';
import ClientProfile from './ClientProfile';

type ClientTab = 'overview' | 'questions' | 'profile';

export default function ClientPortal() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [tab, setTab] = useState<ClientTab>('overview');
  const [error, setError] = useState(false);

  useEffect(() => {
    const s = readSessionFromHash();
    if (s) setSession(s);
    else setError(true);
  }, []);

  if (error) return <ClientError />;
  if (!session) return <ClientLoading />;

  const { meta, jobCtx } = session;

  const TABS: { id: ClientTab; label: string }[] = [
    { id: 'overview', label: 'Interview Overview' },
    { id: 'questions', label: `Questions (${session.questions.length})` },
    { id: 'profile', label: 'Candidate Profile' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
                EXPLAIN
              </span>
              <span style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: 500 }}>Interview Brief</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              Prepared by {meta.recruiterName ?? 'your recruiter'}
            </div>
          </div>
        </div>
      </div>

      {/* Candidate hero */}
      <div style={{ background: 'linear-gradient(135deg, #0f1729 0%, #111827 100%)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: 800, color: '#fff',
            }}>
              {meta.candidateName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                {meta.candidateName}
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                {meta.currentRole}{meta.currentCompany ? ` · ${meta.currentCompany}` : ''}
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Chip label={`Applying for: ${jobCtx.title}`} accent />
                {jobCtx.company && <Chip label={jobCtx.company} />}
                {meta.interviewDate && <Chip label={`Interview: ${meta.interviewDate}${meta.interviewTime ? ' at ' + meta.interviewTime : ''}`} />}
                {meta.interviewLocation && <Chip label={meta.interviewLocation} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '0' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '14px 20px', fontSize: '13px', fontWeight: 600,
                color: tab === t.id ? 'var(--blue)' : 'var(--text-3)',
                borderBottom: `2px solid ${tab === t.id ? 'var(--blue)' : 'transparent'}`,
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'overview'   && <ClientOverview session={session} />}
            {tab === 'questions'  && <ClientQuestions session={session} />}
            {tab === 'profile'    && <ClientProfile session={session} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
          Prepared by Explain · explain.global · This brief is confidential and intended only for the named interviewer
        </span>
      </div>
    </div>
  );
}

function Chip({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span style={{
      fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px',
      background: accent ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.06)',
      color: accent ? '#4F8EF7' : 'rgba(255,255,255,0.5)',
      border: `1px solid ${accent ? 'rgba(79,142,247,0.25)' : 'rgba(255,255,255,0.08)'}`,
    }}>
      {label}
    </span>
  );
}

function ClientLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px', color: 'var(--text)' }}>EXPLAIN</div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Loading your interview brief…</div>
      </div>
    </div>
  );
}

function ClientError() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
        <div style={{ fontSize: '17px', fontWeight: 800, marginBottom: '16px', color: 'var(--text)' }}>EXPLAIN</div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Brief not found</div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
          This link may have expired or been entered incorrectly. Please ask your recruiter to resend the interview brief.
        </div>
      </div>
    </div>
  );
}
