import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { fetchInterviewers, type PublicInterviewer } from '../api/interviewersApi';
import { fetchAvatarAudioPcm } from '../api/liveAvatarApi';
import { unlockTTSAudio } from '../api/ttsApi';
import { useSpatiusAvatarSession, HELLO_TOKEN_PATH } from '../hooks/useSpatiusAvatarSession';
import { deviceCanUseSpatiusInRoom } from '../hooks/useSpatiusSeat';
import { SpatiusSeatStage } from '../components/SpatiusSeatStage';
import { playPcm } from '../lib/playPcm';
import { logEvent } from '../api/flowLogger';

// "Say hi" for the marketing homepage (2026-10-08). The homepage's interviewer picker frames this page (/hello?i=<interviewer id>) so a visitor on a computer can see and
// hear the interviewer greet them before choosing. The page is just the portrait with a button; pressing it brings the live Spatius face up, the interviewer says
// "Hi there, I'm <name>, welcome to TheInterviewChair.com." in their own voice, and the face goes back to the portrait (the billed connection closes). If the face can't
// start, the voice plays on its own. The token route is anonymous and capped (see Features/Interviews/AvatarSession "hello/spatius-token").

type State = 'idle' | 'loading' | 'playing' | 'error';

export default function HelloPage() {
  const id = new URLSearchParams(window.location.search).get('i') ?? '';
  const [iv, setIv] = useState<PublicInterviewer | null>(null);
  const [state, setState] = useState<State>('idle');
  const [face, setFace] = useState(false);
  const [portraitStep, setPortraitStep] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const sp = useSpatiusAvatarSession(stageRef);
  const runRef = useRef(0);

  useEffect(() => { void fetchInterviewers().then(list => setIv(list.find(i => i.id === id) ?? null)); }, [id]);

  async function sayHi() {
    if (!iv) return;
    unlockTTSAudio(); // inside the tap, before anything is awaited, so every browser allows the sound
    logEvent('hello_say_hi', { page: '/hello', metadata: { interviewer: iv.id } }); // a visitor really pressed the button (shows in Admin > Activity Log)
    const run = ++runRef.current;
    const stale = () => runRef.current !== run;
    const role = iv.role === 'technical' ? 'technical' : 'hr';
    const text = `Hi there, I'm ${iv.displayName}, welcome to TheInterviewChair.com.`;
    await sp.disconnect(true);
    if (stale()) return;
    const wantFace = deviceCanUseSpatiusInRoom();
    setFace(wantFace); setState('loading');
    try {
      let heard = false;
      if (wantFace) {
        try {
          await Promise.race([
            sp.connect(iv.avatarId, '', undefined, HELLO_TOKEN_PATH),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('connect timed out')), 15000)),
          ]);
          if (stale()) return;
          await new Promise<void>((resolve, reject) => {
            let started = false;
            const watchdog = window.setTimeout(() => { if (!started) { sp.interrupt(); reject(new Error('speech did not start')); } }, 12000);
            sp.speak(text, role, () => { started = true; window.clearTimeout(watchdog); if (!stale()) setState('playing'); }, iv.id)
              .then(() => { window.clearTimeout(watchdog); resolve(); }, e => { window.clearTimeout(watchdog); reject(e); });
          });
          heard = true;
          logEvent('hello_say_hi_result', { page: '/hello', metadata: { interviewer: iv.id, mode: 'face' } });
        } catch {
          if (stale()) return;
          await sp.disconnect(true); // no face: the voice on its own
          setFace(false); setState('loading');
        }
      }
      if (!heard) {
        const pcm = await fetchAvatarAudioPcm(text, role, iv.id);
        if (stale()) return;
        setState('playing');
        await playPcm(pcm);
        logEvent('hello_say_hi_result', { page: '/hello', metadata: { interviewer: iv.id, mode: 'voice only' } });
      }
      if (stale()) return;
      await new Promise(r => setTimeout(r, 900));
      if (stale()) return;
      await sp.disconnect(true);
      setFace(false); setState('idle');
    } catch {
      if (stale()) return;
      await sp.disconnect(true);
      logEvent('hello_say_hi_result', { page: '/hello', metadata: { interviewer: iv.id, mode: 'failed' } });
      setFace(false); setState('error');
    }
  }

  const chain = iv ? [iv.portraitUrl, `/images/interviewers/${iv.id}.jpg`, iv.backgroundUrl].filter((u): u is string => !!u) : [];
  const src = chain[portraitStep] ?? null;
  const busy = state === 'loading' || state === 'playing';

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#04060c', fontFamily: '-apple-system,"Segoe UI",system-ui,sans-serif' }}>
      {src && <img src={src} alt="" onError={() => setPortraitStep(n => n + 1)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />}
      {iv && face && <SpatiusSeatStage seat={iv.role === 'technical' ? 'technical' : 'hr'} avatarId={iv.avatarId} backgroundUrl={iv.backgroundUrl} stageRef={stageRef} visible={sp.rendered} live={sp.status === 'connected'} rendered={sp.rendered} rounded={false} />}
      {iv && (
        <button type="button" onClick={() => void sayHi()} disabled={busy}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 3, display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
            cursor: busy ? 'default' : 'pointer', color: '#fff', background: 'rgba(4,6,12,0.72)', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)',
          }}>
          <Volume2 size={15} />
          {state === 'loading' ? 'Getting ready…' : state === 'playing' ? 'Speaking…' : `Say hi to ${iv.displayName}`}
        </button>
      )}
      {state === 'error' && <div style={{ position: 'absolute', top: 52, right: 14, zIndex: 3, fontSize: 11.5, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 3px #000' }}>Couldn't play the preview just now.</div>}
    </div>
  );
}
