import { useEffect, useRef, useState } from 'react';
import { Check, Volume2 } from 'lucide-react';
import { fetchInterviewers, type PublicInterviewer } from '../api/interviewersApi';
import { fetchAvatarAudioPcm } from '../api/liveAvatarApi';
import { unlockTTSAudio } from '../api/ttsApi';
import { playPcm } from '../lib/playPcm';
import { getInterviewTicket } from '../api/entitlementsApi';
import { useSpatiusAvatarSession, INTERVIEW_TOKEN_PATH } from '../hooks/useSpatiusAvatarSession';
import { deviceCanUseSpatiusInRoom } from '../hooks/useSpatiusSeat';
import { SpatiusSeatStage } from './SpatiusSeatStage';
import { readInterviewerChoice, writeInterviewerChoice, type InterviewerChoice } from '../lib/interviewerChoice';

// "Your interviewers" (2026-10-07): the candidate picks who interviews them from the interviewers an admin has set up. One row for the HR interviewer and one for the
// technical interviewer; each card shows the face, the name, a one-line description and the personality bars. The choice is remembered and read when the room opens.

const TRAIT_LABELS: { key: keyof PublicInterviewer['traits']; label: string }[] = [
  { key: 'depth', label: 'Depth' }, { key: 'strictness', label: 'Strictness' }, { key: 'warmth', label: 'Warmth' }, { key: 'humour', label: 'Humour' }, { key: 'pace', label: 'Pace' },
];

type Preview = { id: string; state: 'loading' | 'playing' | 'error'; face: boolean };

function Portrait({ iv, children }: { iv: PublicInterviewer; children?: React.ReactNode }) {
  // The uploaded portrait if there is one, else the picture file shipped with the site, else the room behind them, else a plain tile with their initial.
  const chain = [iv.portraitUrl, `/images/interviewers/${iv.id}.jpg`, iv.backgroundUrl].filter((u): u is string => !!u);
  const [step, setStep] = useState(0);
  const src = chain[step] ?? null;
  return (
    <div style={{ aspectRatio: '4 / 3', borderRadius: 10, overflow: 'hidden', background: 'linear-gradient(135deg, #232b3b, #3b475c)', position: 'relative' }}>
      {src ? (
        <img src={src} alt="" onError={() => setStep(n => n + 1)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%', display: 'block' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>{iv.displayName.slice(0, 1)}</div>
      )}
      {children}
    </div>
  );
}

function Card({ iv, selected, onPick, preview, busy, onSayHi, stageRef, sp }: {
  iv: PublicInterviewer; selected: boolean; onPick: () => void; preview: Preview | null; busy: boolean; onSayHi: () => void;
  stageRef: React.RefObject<HTMLDivElement | null>; sp: ReturnType<typeof useSpatiusAvatarSession>;
}) {
  const mine = preview?.id === iv.id ? preview : null;
  const seat = iv.role === 'technical' ? 'technical' : 'hr';
  return (
    <div
      style={{
        flex: '1 1 150px', minWidth: 0, maxWidth: 220, padding: 8, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 8,
        background: selected ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selected ? 'rgba(52,211,153,0.55)' : 'var(--border)'}`, color: 'var(--text)',
      }}>
      <button type="button" onClick={onPick} aria-pressed={selected}
        style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', fontFamily: 'inherit' }}>
        <div style={{ position: 'relative' }}>
          <Portrait iv={iv}>
            {mine?.face && <SpatiusSeatStage seat={seat} avatarId={iv.avatarId} backgroundUrl={iv.backgroundUrl} stageRef={stageRef} visible={sp.rendered} live={sp.status === 'connected'} rendered={sp.rendered} rounded={false} />}
          </Portrait>
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
      <button type="button" onClick={onSayHi} disabled={busy}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 10, fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
          cursor: busy ? 'default' : 'pointer', opacity: busy && !mine ? 0.5 : 1, color: 'var(--text)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
        }}>
        <Volume2 size={14} />
        {mine?.state === 'loading' ? 'Getting ready…' : mine?.state === 'playing' ? 'Speaking…' : `Say hi to ${iv.displayName}`}
      </button>
      {mine?.state === 'error' && <div style={{ fontSize: 10.5, color: 'var(--text-3)', textAlign: 'center' }}>Couldn't play the preview just now.</div>}
    </div>
  );
}

export function InterviewerPicker() {
  const [roster, setRoster] = useState<PublicInterviewer[]>([]);
  const [choice, setChoice] = useState<InterviewerChoice>(() => readInterviewerChoice());
  // "Say hi": one interviewer at a time greets the candidate, so they can hear the voice and accent before choosing. The face is drawn by Spatius where the device
  // allows it; otherwise (a phone, or the face service unavailable) only the voice plays. The connection is closed as soon as the greeting ends.
  const [preview, setPreview] = useState<Preview | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sp = useSpatiusAvatarSession(stageRef);
  const runRef = useRef(0);

  useEffect(() => { void fetchInterviewers().then(setRoster); }, []);

  const rows: { seat: 'hr' | 'technical'; title: string; items: PublicInterviewer[] }[] = [
    { seat: 'hr', title: 'Your HR interviewer', items: roster.filter(i => i.role === 'hr') },
    { seat: 'technical', title: 'Your technical interviewer', items: roster.filter(i => i.role === 'technical') },
  ];
  // Nothing to choose from (or the list couldn't load): show nothing, and the interview uses the default interviewers.
  if (!rows.some(r => r.items.length > 1)) return null;

  const selectedId = (seat: 'hr' | 'technical', items: PublicInterviewer[]) =>
    items.find(i => i.id === choice[seat])?.id ?? items.find(i => i.defaultFor === seat)?.id ?? items[0]?.id;

  async function sayHi(iv: PublicInterviewer) {
    unlockTTSAudio(); // inside the tap, before anything is awaited, so phones allow the sound
    const run = ++runRef.current;
    const stale = () => runRef.current !== run;
    const role = iv.role === 'technical' ? 'technical' : 'hr';
    const text = `Hi there, I'm ${iv.displayName}, welcome to TheInterviewChair.com.`;
    await sp.disconnect(true);
    if (stale()) return;
    const face = deviceCanUseSpatiusInRoom();
    setPreview({ id: iv.id, state: 'loading', face });
    try {
      let heard = false;
      if (face) {
        try {
          await Promise.race([
            sp.connect(iv.avatarId, getInterviewTicket() ?? '', undefined, INTERVIEW_TOKEN_PATH),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('connect timed out')), 15000)),
          ]);
          if (stale()) return;
          await new Promise<void>((resolve, reject) => {
            let started = false;
            const watchdog = window.setTimeout(() => { if (!started) { sp.interrupt(); reject(new Error('speech did not start')); } }, 12000);
            sp.speak(text, role, () => { started = true; window.clearTimeout(watchdog); if (!stale()) setPreview({ id: iv.id, state: 'playing', face }); }, iv.id)
              .then(() => { window.clearTimeout(watchdog); resolve(); }, e => { window.clearTimeout(watchdog); reject(e); });
          });
          heard = true;
        } catch {
          if (stale()) return;
          await sp.disconnect(true); // no face: fall through to the voice on its own
          setPreview({ id: iv.id, state: 'loading', face: false });
        }
      }
      if (!heard) {
        const pcm = await fetchAvatarAudioPcm(text, role, iv.id);
        if (stale()) return;
        setPreview({ id: iv.id, state: 'playing', face: false });
        await playPcm(pcm);
      }
      if (stale()) return;
      await new Promise(r => setTimeout(r, 900)); // let the face settle before it goes back to the photo
      if (stale()) return;
      await sp.disconnect(true);
      setPreview(null);
    } catch {
      if (stale()) return;
      await sp.disconnect(true);
      setPreview({ id: iv.id, state: 'error', face: false });
    }
  }

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
            {r.items.map(iv => <Card key={iv.id} iv={iv} selected={selectedId(r.seat, r.items) === iv.id} onPick={() => pick(r.seat, iv.id)}
              preview={preview} busy={preview?.state === 'loading' || preview?.state === 'playing'} onSayHi={() => void sayHi(iv)} stageRef={stageRef} sp={sp} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
