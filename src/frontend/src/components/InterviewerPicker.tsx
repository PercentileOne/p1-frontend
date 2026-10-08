import { useEffect, useRef, useState } from 'react';
import { Check, Volume2 } from 'lucide-react';
import { fetchInterviewers, type PublicInterviewer } from '../api/interviewersApi';
import { fetchAvatarAudioPcm } from '../api/liveAvatarApi';
import { unlockTTSAudio } from '../api/ttsApi';
import { playPcm } from '../lib/playPcm';
import { deviceCanUseSpatiusInRoom } from '../hooks/useSpatiusSeat';
import { preloadSpatiusAvatar, INTERVIEW_TOKEN_PATH } from '../hooks/useSpatiusAvatarSession';
import { getInterviewTicket } from '../api/entitlementsApi';
import { readInterviewerChoice, writeInterviewerChoice, type InterviewerChoice } from '../lib/interviewerChoice';

// "Your interviewers" (2026-10-07): the candidate picks who interviews them from the interviewers an admin has set up. One row for the HR interviewer and one for the
// technical interviewer; each card shows the face, the name, a one-line description and the personality bars. The choice is remembered and read when the room opens.

const TRAIT_LABELS: { key: keyof PublicInterviewer['traits']; label: string }[] = [
  { key: 'depth', label: 'Depth' }, { key: 'strictness', label: 'Strictness' }, { key: 'warmth', label: 'Warmth' }, { key: 'humour', label: 'Humour' }, { key: 'pace', label: 'Pace' },
];

type Preview = { id: string; state: 'loading' | 'playing' | 'error'; frame: boolean; nonce: number; clip?: boolean };

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

// Fetch a face's model ahead of the press (see preloadSpatiusAvatar); computers only, since a phone only plays the voice.
const warm = (iv: PublicInterviewer) => { if (!iv.greetingUrl && deviceCanUseSpatiusInRoom()) void preloadSpatiusAvatar(iv.avatarId, getInterviewTicket() ?? '', INTERVIEW_TOKEN_PATH); };

function Card({ iv, selected, onPick, preview, busy, onSayHi, onClipEnded, onClipFailed }: {
  iv: PublicInterviewer; selected: boolean; onPick: () => void; preview: Preview | null; busy: boolean; onSayHi: () => void; onClipEnded: () => void; onClipFailed: () => void;
}) {
  const mine = preview?.id === iv.id ? preview : null;
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
            {mine?.clip && iv.greetingUrl && <video key={mine.nonce} src={iv.greetingUrl} autoPlay playsInline onEnded={onClipEnded} onError={onClipFailed} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#04060c' }} />}
            {mine?.frame && <iframe key={mine.nonce} title={`${iv.displayName} speaks`} src={`/hello?i=${encodeURIComponent(iv.id)}&auto=1`} allow="autoplay" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, background: '#04060c' }} />}
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
      <button type="button" onClick={onSayHi} disabled={busy} onPointerEnter={() => warm(iv)} onFocus={() => warm(iv)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 10px', borderRadius: 10, fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
          cursor: busy ? 'default' : 'pointer', opacity: busy && !mine ? 0.5 : 1, color: 'var(--text)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
        }}>
        <Volume2 size={14} />
        {mine?.state === 'loading' ? 'Getting ready…' : mine?.state === 'playing' ? 'Speaking…' : deviceCanUseSpatiusInRoom() ? `Watch ${iv.displayName} speak` : `Hear ${iv.displayName} speak`}
      </button>
      {mine?.state === 'error' && <div style={{ fontSize: 10.5, color: 'var(--text-3)', textAlign: 'center' }}>Couldn't play the preview just now.</div>}
    </div>
  );
}

export function InterviewerPicker() {
  const [roster, setRoster] = useState<PublicInterviewer[]>([]);
  const [choice, setChoice] = useState<InterviewerChoice>(() => readInterviewerChoice());
  // "Watch me speak": one interviewer at a time greets the candidate, so they can hear the voice and accent before choosing. On a computer the preview is a small page of its
  // own (/hello?auto=1) framed over the portrait: the face is drawn there, and when the preview ends the frame is removed and the browser frees everything the face used (a
  // face built again and again in this page itself stopped working after three or four). On a phone only the voice plays.
  const [preview, setPreview] = useState<Preview | null>(null);
  const runRef = useRef(0);
  const nonceRef = useRef(0);

  useEffect(() => { void fetchInterviewers().then(setRoster); }, []);

  // Progress from the framed preview page.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; ok?: boolean } | null;
      if (!d || typeof d.type !== 'string') return;
      if (d.type === 'tic-hello-playing') setPreview(p => (p ? { ...p, state: 'playing' } : p));
      else if (d.type === 'tic-hello-done') {
        runRef.current++;
        setPreview(p => (p && d.ok === false ? { ...p, frame: false, state: 'error' } : null));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const rows: { seat: 'hr' | 'technical'; title: string; items: PublicInterviewer[] }[] = [
    { seat: 'hr', title: 'Your HR interviewer', items: roster.filter(i => i.role === 'hr') },
    { seat: 'technical', title: 'Your technical interviewer', items: roster.filter(i => i.role === 'technical') },
  ];
  // Nothing to choose from (or the list couldn't load): show nothing, and the interview uses the default interviewers.
  if (!rows.some(r => r.items.length > 1)) return null;

  const selectedId = (seat: 'hr' | 'technical', items: PublicInterviewer[]) =>
    items.find(i => i.id === choice[seat])?.id ?? items.find(i => i.defaultFor === seat)?.id ?? items[0]?.id;

  // The recorded greeting clip plays at once (no live face to build); only an interviewer without a clip, or a clip that fails to play, uses the live preview below.
  function sayHi(iv: PublicInterviewer) {
    if (iv.greetingUrl) { runRef.current++; setPreview({ id: iv.id, state: 'playing', frame: false, clip: true, nonce: ++nonceRef.current }); return; }
    void sayHiLive(iv);
  }
  function clipFailed(iv: PublicInterviewer) { setPreview(null); void sayHiLive(iv); }

  async function sayHiLive(iv: PublicInterviewer) {
    unlockTTSAudio(); // inside the tap, before anything is awaited: the framed page shares this tap, and a phone's voice needs it
    const run = ++runRef.current;
    const stale = () => runRef.current !== run;
    const role = iv.role === 'technical' ? 'technical' : 'hr';
    const text = `Hi there, I'm ${iv.displayName}, welcome to TheInterviewChair.com.`;
    const frame = deviceCanUseSpatiusInRoom();
    setPreview({ id: iv.id, state: 'loading', frame, nonce: ++nonceRef.current });
    // Hard stop: whatever goes wrong, the button comes back.
    const hardStop = window.setTimeout(() => {
      if (stale()) return;
      runRef.current++;
      setPreview({ id: iv.id, state: 'error', frame: false, nonce: nonceRef.current });
    }, 90000);
    if (frame) return; // the framed page does the rest and reports back (the hard stop above covers a page that never does)
    try {
      const pcm = await Promise.race([fetchAvatarAudioPcm(text, role, iv.id), new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('voice timed out')), 20000))]);
      if (stale()) return;
      setPreview({ id: iv.id, state: 'playing', frame: false, nonce: nonceRef.current });
      await playPcm(pcm);
      if (stale()) return;
      setPreview(null);
    } catch {
      if (stale()) return;
      setPreview({ id: iv.id, state: 'error', frame: false, nonce: nonceRef.current });
    } finally {
      window.clearTimeout(hardStop);
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
              preview={preview} busy={preview?.state === 'loading' || preview?.state === 'playing'} onSayHi={() => sayHi(iv)} onClipEnded={() => setPreview(null)} onClipFailed={() => clipFailed(iv)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
