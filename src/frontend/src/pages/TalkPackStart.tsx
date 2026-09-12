import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { logFlowEvent } from '../api/flowLogger';
import { useAuthStore } from '../auth/authStore';

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

// Kept deliberately short — both avatars stay live and listening for the whole talk (see
// project plan), so every extra minute costs real LiveAvatar money. 5 min is the hard cap.
const DURATIONS = [
  { minutes: 3, label: '3 minutes', desc: 'A quick, focused rep — great for a first practice run.' },
  { minutes: 5, label: '5 minutes', desc: 'The realistic length for most classroom/university talk assessments.' },
];

interface IncomingState {
  subject?: string;
}

const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`;

// Candidate-portal "New Talk" intake screen — sibling to InterviewPackStart.tsx, same card
// language and validation pattern, trimmed to what a spoken presentation actually needs
// (Subject instead of Job Title, a talk-type toggle, a duration cap instead of question count;
// no CV/job-spec/Special Focus — none of that applies to a talk).
export default function TalkPackStart() {
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = (location.state ?? {}) as IncomingState;

  const [subject, setSubject] = useState(incoming.subject ?? '');
  const [isPersonalStory, setIsPersonalStory] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(3);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const authFirstName = useAuthStore(s => s.user?.firstName);
  const [preferredName, setPreferredName] = useState(authFirstName ?? '');
  const [consentToRecord, setConsentToRecord] = useState(true);
  // Kept entirely client-side — these images are only ever shown to the candidate themselves
  // during their own talk (no one else is watching live), and the desktop recording path
  // captures the whole browser tab anyway, so there's no need to upload/store them server-side.
  const [notesFiles, setNotesFiles] = useState<File[]>([]);
  const [attemptedStart, setAttemptedStart] = useState(false);

  const onNotesSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setNotesFiles(prev => [...prev, ...files]);
    e.target.value = '';
  }, []);

  const removeNoteFile = useCallback((name: string) => {
    setNotesFiles(prev => prev.filter(f => f.name !== name));
  }, []);

  const hasSubject = subject.trim().length > 2;

  const handleStart = () => {
    if (!hasSubject) {
      setAttemptedStart(true);
      logFlowEvent('START_TALK_BLOCKED', { hasSubject });
      return;
    }
    logFlowEvent('START_TALK_CLICKED', {
      hasSubject: true,
      isPersonalStory,
      selectedDuration,
      selectedLanguage,
      notesFileCount: notesFiles.length,
    });
    navigate('/talk/standard', {
      state: {
        subject: subject.trim(),
        isPersonalStory,
        targetDurationSeconds: selectedDuration * 60,
        preferredName: preferredName.trim() || undefined,
        selectedLanguage,
        consentToRecord,
        notesFiles,
      },
    });
  };

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

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: 'linear-gradient(135deg,#34D399,#047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>TIC</div>
            <span style={{ fontWeight: 800, fontSize: '20px', color: '#fff' }}>
              <span style={{ color: '#34D399' }}>The</span>Interview<span style={{ color: '#34D399' }}>Chair</span><span style={{ color: 'rgba(255,255,255,0.55)' }}>.com</span>
            </span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', marginBottom: '10px', lineHeight: 1.2 }}>
            Set up your talk
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
            Amina and Wayne will be right there with you — encouraging and giving tips, the whole way through
          </p>
        </div>

        {/* Subject */}
        <div style={{ background: 'var(--bg2)', border: `1px solid ${attemptedStart && !hasSubject ? 'rgba(245,158,11,0.5)' : 'var(--border)'}`, borderRadius: '16px', padding: '24px 28px', marginBottom: '16px', transition: 'border-color 0.15s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Subject of your talk</span>
          </div>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Climate Change, An Issue I Faced as a Child, The French Revolution…"
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

        {/* Talk type — feeds both Wayne's tips and the scoring prompt: a factual subject gets
            real subject-matter tips and is scored for accuracy; a personal/experiential one
            gets storytelling-structure tips and is scored for authenticity instead. */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '14px' }}>
            What kind of talk is this?
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {([
              { value: false, label: 'Factual / informational', desc: 'A topic you\'re explaining — Wayne gives real subject tips' },
              { value: true, label: 'Personal / experiential', desc: 'Something you lived through — Wayne gives storytelling tips' },
            ] as const).map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setIsPersonalStory(opt.value)}
                style={{
                  flex: 1, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  background: isPersonalStory === opt.value ? 'rgba(79,142,247,0.1)' : 'var(--bg3)',
                  border: `1px solid ${isPersonalStory === opt.value ? 'var(--blue)' : 'var(--border)'}`,
                  borderRadius: '10px', padding: '14px 16px', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: isPersonalStory === opt.value ? 'var(--blue)' : 'var(--text)' }}>{opt.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px', lineHeight: 1.4 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration + Language + Known As */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>

          {/* Duration */}
          <div style={{ flex: '1 1 220px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 22px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '14px' }}>
              Length
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {DURATIONS.map(d => (
                <button
                  key={d.minutes}
                  type="button"
                  onClick={() => setSelectedDuration(d.minutes)}
                  style={{
                    flex: 1, cursor: 'pointer', fontFamily: 'inherit',
                    background: selectedDuration === d.minutes ? 'rgba(52,211,153,0.12)' : 'var(--bg3)',
                    border: `1px solid ${selectedDuration === d.minutes ? '#34D399' : 'var(--border)'}`,
                    borderRadius: '10px', padding: '12px 10px',
                    color: selectedDuration === d.minutes ? '#34D399' : 'var(--text)',
                    fontSize: '14px', fontWeight: 700,
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '10px', lineHeight: 1.5 }}>
              {DURATIONS.find(d => d.minutes === selectedDuration)?.desc}
            </div>
          </div>

          {/* Language */}
          <div style={{ flex: '1 1 200px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 22px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '14px' }}>
              Talk Language
            </div>
            <select
              value={selectedLanguage}
              onChange={e => setSelectedLanguage(e.target.value)}
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
              Amina and Wayne will speak entirely in {LANGUAGES.find(l => l.code === selectedLanguage)?.name ?? 'English'}.
            </div>
          </div>

          {/* Known As */}
          <div style={{ flex: '1 1 200px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 22px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)', marginBottom: '14px' }}>
              Known As
            </div>
            <input
              type="text"
              value={preferredName}
              onChange={e => setPreferredName(e.target.value)}
              placeholder="e.g. Clifford, Alex, Dr. Patel…"
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '12px 14px', color: 'var(--text)', fontSize: '14px',
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(79,142,247,0.5)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '10px', lineHeight: 1.5 }}>
              Optional — overrides your account name.
            </div>
          </div>

        </div>

        {/* Supporting notes/diagrams — upload-once-up-front, per Francis's own instinct rather
            than a live screen-share. Purely client-side: only the candidate themselves ever
            sees these during the talk, and the desktop recording captures the whole tab anyway,
            so there's nothing to upload to a server. */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px 28px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Supporting notes / diagrams</span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
          </div>
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            border: '2px dashed var(--border)', borderRadius: '12px', padding: '20px',
            cursor: 'pointer', fontSize: '13px', color: 'var(--text-3)',
          }}>
            <input type="file" accept="image/*" multiple onChange={onNotesSelected} style={{ display: 'none' }} />
            📎 Add images to flip through during your talk
          </label>
          {notesFiles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
              {notesFiles.map(f => (
                <span key={f.name} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)',
                  borderRadius: '20px', padding: '6px 8px 6px 14px', fontSize: '12.5px', color: 'var(--text)', fontWeight: 600,
                }}>
                  {f.name}
                  <button
                    type="button"
                    onClick={() => removeNoteFile(f.name)}
                    aria-label={`Remove ${f.name}`}
                    style={{
                      width: '18px', height: '18px', borderRadius: '50%', border: 'none',
                      background: 'rgba(255,255,255,0.08)', color: 'var(--text-3)', fontSize: '12px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Recording consent */}
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
          <span style={{ position: 'relative', flexShrink: 0, width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{
              display: 'block', width: '14px', height: '14px', borderRadius: '50%',
              background: consentToRecord ? '#ef4444' : 'rgba(255,255,255,0.2)',
              transition: 'background 0.25s ease',
              animation: consentToRecord ? 'recPulse 1.6s ease-out infinite' : 'none',
            }} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: consentToRecord ? '#f87171' : 'var(--text-3)', transition: 'color 0.25s', letterSpacing: '0.01em' }}>
              {consentToRecord ? 'Recording on' : 'Recording off'}
            </span>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', marginTop: '2px', lineHeight: 1.4 }}>
              {consentToRecord
                ? 'You can watch it back and share it afterwards. Tap to turn off.'
                : 'Your talk will not be recorded. Tap to enable.'}
            </span>
          </span>
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

        {/* CTA */}
        <button
          onClick={handleStart}
          style={{
            width: '100%',
            background: hasSubject
              ? 'linear-gradient(135deg, var(--blue), #a78bfa)'
              : 'rgba(79,142,247,0.25)',
            color: '#fff', border: 'none', borderRadius: '12px',
            padding: '18px', fontSize: '16px', fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em',
          }}
        >
          Start Talk →
        </button>

        {attemptedStart && !hasSubject && (
          <div style={{ marginTop: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '11px 16px', fontSize: '13px', color: 'var(--amber)', fontWeight: 600, textAlign: 'center' }}>
            ⚠️ Add a subject before you can start.
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-3)', marginTop: '14px', lineHeight: 1.6 }}>
          This session is private and confidential.
        </p>
      </motion.div>
    </div>
  );
}
