import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { fetchInterviewers, type PublicInterviewer } from '../api/interviewersApi';
import { readInterviewerChoice, writeInterviewerChoice, type InterviewerChoice } from '../lib/interviewerChoice';

// "Your interviewers" (2026-10-07): the candidate picks who interviews them from the interviewers an admin has set up. One row for the HR interviewer and one for the
// technical interviewer; each card shows the face, the name, a one-line description and the personality bars. The choice is remembered and read when the room opens.

const TRAIT_LABELS: { key: keyof PublicInterviewer['traits']; label: string }[] = [
  { key: 'depth', label: 'Depth' }, { key: 'strictness', label: 'Strictness' }, { key: 'warmth', label: 'Warmth' }, { key: 'humour', label: 'Humour' }, { key: 'pace', label: 'Pace' },
];

function Portrait({ iv }: { iv: PublicInterviewer }) {
  // A portrait picture if one has been saved for this interviewer, else the room behind them, else a plain tile with their initial.
  const [src, setSrc] = useState<string | null>(`/images/interviewers/${iv.id}.jpg`);
  const fallback = iv.backgroundUrl;
  return (
    <div style={{ aspectRatio: '4 / 3', borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg, #232b3b, #3b475c)', position: 'relative' }}>
      {src ? (
        <img src={src} alt="" onError={() => setSrc(s => (s && s !== fallback ? fallback : null))} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%', display: 'block' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>{iv.displayName.slice(0, 1)}</div>
      )}
    </div>
  );
}

function Card({ iv, selected, onPick }: { iv: PublicInterviewer; selected: boolean; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} aria-pressed={selected}
      style={{
        flex: '1 1 150px', minWidth: 0, maxWidth: 220, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', padding: 8, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 8,
        background: selected ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selected ? 'rgba(52,211,153,0.55)' : 'var(--border)'}`, color: 'var(--text)',
      }}>
      <div style={{ position: 'relative' }}>
        <Portrait iv={iv} />
        {selected && <span style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: '#34D399', color: '#04120c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={14} strokeWidth={3} /></span>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800 }}>{iv.displayName}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.4, minHeight: 48 }}>{iv.description}</div>
      <div style={{ display: 'grid', gap: 3 }}>
        {TRAIT_LABELS.map(t => (
          <div key={t.key} style={{ display: 'grid', gridTemplateColumns: '58px 1fr', alignItems: 'center', gap: 6, fontSize: 9.5, color: 'var(--text-3)' }}>
            <span>{t.label}</span>
            <span style={{ display: 'flex', gap: 2 }}>{[1, 2, 3, 4, 5].map(n => <span key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= iv.traits[t.key] ? '#34D399' : 'var(--border)' }} />)}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

export function InterviewerPicker() {
  const [roster, setRoster] = useState<PublicInterviewer[]>([]);
  const [choice, setChoice] = useState<InterviewerChoice>(() => readInterviewerChoice());

  useEffect(() => { void fetchInterviewers().then(setRoster); }, []);

  const rows: { seat: 'hr' | 'technical'; title: string; items: PublicInterviewer[] }[] = [
    { seat: 'hr', title: 'Your HR interviewer', items: roster.filter(i => i.role === 'hr') },
    { seat: 'technical', title: 'Your technical interviewer', items: roster.filter(i => i.role === 'technical') },
  ];
  // Nothing to choose from (or the list couldn't load): show nothing, and the interview uses the default interviewers.
  if (!rows.some(r => r.items.length > 1)) return null;

  const selectedId = (seat: 'hr' | 'technical', items: PublicInterviewer[]) =>
    items.find(i => i.id === choice[seat])?.id ?? items.find(i => i.defaultFor === seat)?.id ?? items[0]?.id;

  function pick(seat: 'hr' | 'technical', id: string) {
    const next = { ...choice, [seat]: id };
    setChoice(next);
    writeInterviewerChoice(next);
  }

  return (
    <div style={{ marginTop: 4, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>Choose your interviewers</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 10 }}>Each has their own voice and style. You can change them any time.</div>
      {rows.filter(r => r.items.length > 1).map(r => (
        <div key={r.seat} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>{r.title}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {r.items.map(iv => <Card key={iv.id} iv={iv} selected={selectedId(r.seat, r.items) === iv.id} onPick={() => pick(r.seat, iv.id)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
