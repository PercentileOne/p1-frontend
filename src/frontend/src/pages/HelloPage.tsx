import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { fetchInterviewers, type PublicInterviewer } from '../api/interviewersApi';
import { fetchAvatarAudioPcm } from '../api/liveAvatarApi';
import { unlockTTSAudio } from '../api/ttsApi';
import { useSpatiusAvatarSession, preloadSpatiusAvatar, HELLO_TOKEN_PATH } from '../hooks/useSpatiusAvatarSession';
import { deviceCanUseSpatiusInRoom } from '../hooks/useSpatiusSeat';
import { SpatiusSeatStage } from '../components/SpatiusSeatStage';
import { playPcm } from '../lib/playPcm';
import { logEvent } from '../api/flowLogger';

// "Watch me speak" for the marketing homepage (2026-10-08). The homepage's interviewer picker frames this page (/hello?i=<interviewer id>) so a visitor on a computer can see and
// hear the interviewer greet them before choosing. The page is just the portrait with a button; pressing it brings the live Spatius face up, the interviewer says
// "Hi there, I'm <name>, welcome to TheInterviewChair.com." in their own voice. If the face can't start, the voice plays on its own. The token route is anonymous and capped
// (see Features/Interviews/AvatarSession "hello/spatius-token").
//
// Reliability (Francis, 2026-10-08: now and then the voice played with a still mouth, and once the button stuck on "Getting ready" for good):
//  - the face is built once and kept for the visit: after a greeting only its billed connection is closed (a soft close), and the next press just reopens it, the way the
//    interview room does between questions, instead of building a new graphics surface every time;
//  - every wait has a limit, and the whole greeting has a hard stop (45 s) that always puts the button back, so it can never stay stuck.

type State = 'idle' | 'loading' | 'playing' | 'error';

const withLimit = <T,>(p: Promise<T>, ms: number, what: string) =>
  Promise.race([p, new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error(`${what} timed out`)), ms))]);

export default function HelloPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('i') ?? '';
  // ?auto=1 (the interviewer picker on the candidate site): start the greeting as soon as the page is ready, without a button, and report progress to the page that framed
  // this one. Each preview is its own page, so everything the face used (graphics memory included) is freed completely when the picker removes the frame.
  const auto = params.get('auto') === '1';
  const tell = (type: string, ok = true) => { if (auto && window.parent !== window) { try { window.parent.postMessage({ type, ok }, window.location.origin); } catch { /* not framed */ } } };
  const [iv, setIv] = useState<PublicInterviewer | null>(null);
  const [state, setState] = useState<State>('idle');
  const [face, setFace] = useState(false);
  const [portraitStep, setPortraitStep] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const sp = useSpatiusAvatarSession(stageRef);
  const runRef = useRef(0);
  const needFreshRef = useRef(false); // the last greeting went wrong: build the face again from scratch
  const autoStartedRef = useRef(false);

  useEffect(() => { void fetchInterviewers().then(list => setIv(list.find(i => i.id === id) ?? null)); }, [id]);

  const canFace = deviceCanUseSpatiusInRoom();

  useEffect(() => {
    if (auto && iv && !autoStartedRef.current) { autoStartedRef.current = true; void sayHi(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, iv]);

  async function sayHi() {
    if (!iv) return;
    unlockTTSAudio(); // inside the tap, before anything is awaited, so every browser allows the sound
    logEvent('hello_say_hi', { page: '/hello', metadata: { interviewer: iv.id } }); // a visitor really pressed the button (shows in Admin > Activity Log)
    const run = ++runRef.current;
    const stale = () => runRef.current !== run;
    const role = iv.role === 'technical' ? 'technical' : 'hr';
    const text = `Hi there, I'm ${iv.displayName}, welcome to TheInterviewChair.com.`;
    setState('loading');
    // Hard stop: whatever goes wrong, the button comes back.
    const hardStop = window.setTimeout(() => {
      if (stale()) return;
      runRef.current++;
      needFreshRef.current = true;
      void sp.disconnect(true);
      setFace(false); setState('error'); tell('tic-hello-done', false);
      logEvent('hello_say_hi_result', { page: '/hello', metadata: { interviewer: iv.id, mode: 'stuck, stopped' } });
    }, 75000);
    try {
      if (needFreshRef.current) { await sp.disconnect(true); needFreshRef.current = false; }
      let heard = false;
      if (canFace) {
        setFace(true);
        try {
          await withLimit(sp.connect(iv.avatarId, '', undefined, HELLO_TOKEN_PATH), 45000, 'face connect'); // a first-time download of the face's model can take a while
          if (stale()) return;
          await new Promise<void>((resolve, reject) => {
            let started = false;
            let watchdog = window.setTimeout(() => { if (!started) { sp.interrupt(); reject(new Error('speech audio took too long')); } }, 30000);
            sp.speak(text, role, () => { started = true; window.clearTimeout(watchdog); if (!stale()) { setState('playing'); tell('tic-hello-playing'); } }, iv.id, () => {
              window.clearTimeout(watchdog);
              watchdog = window.setTimeout(() => { if (!started) { sp.interrupt(); reject(new Error('speech did not start')); } }, 12000);
            }).then(() => { window.clearTimeout(watchdog); resolve(); }, e => { window.clearTimeout(watchdog); reject(e); });
          });
          heard = true;
          logEvent('hello_say_hi_result', { page: '/hello', metadata: { interviewer: iv.id, mode: 'face' } });
        } catch (e) {
          if (stale()) return;
          console.warn('[Hello] the face did not work, using the voice only:', e);
          await sp.disconnect(true); // no face: the voice on its own
          setFace(false);
        }
      }
      if (!heard) {
        const pcm = await withLimit(fetchAvatarAudioPcm(text, role, iv.id), 20000, 'voice');
        if (stale()) return;
        setState('playing'); tell('tic-hello-playing');
        await playPcm(pcm);
        logEvent('hello_say_hi_result', { page: '/hello', metadata: { interviewer: iv.id, mode: 'voice only' } });
      }
      if (stale()) return;
      await new Promise(r => setTimeout(r, 700));
      if (stale()) return;
      await sp.disconnect(); // soft close: the billed connection ends, the face stays drawn and is reused by the next press
      setState('idle'); tell('tic-hello-done');
    } catch (e) {
      if (stale()) return;
      console.warn('[Hello] greeting failed:', e);
      needFreshRef.current = true;
      await sp.disconnect(true);
      logEvent('hello_say_hi_result', { page: '/hello', metadata: { interviewer: iv.id, mode: 'failed' } });
      setFace(false); setState('error'); tell('tic-hello-done', false);
    } finally {
      window.clearTimeout(hardStop);
    }
  }

  const chain = iv ? [iv.portraitUrl, `/images/interviewers/${iv.id}.jpg`, iv.backgroundUrl].filter((u): u is string => !!u) : [];
  const src = chain[portraitStep] ?? null;
  const busy = state === 'loading' || state === 'playing';

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#04060c', fontFamily: '-apple-system,"Segoe UI",system-ui,sans-serif' }}>
      {src && <img src={src} alt="" onError={() => setPortraitStep(n => n + 1)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />}
      {iv && face && <SpatiusSeatStage seat={iv.role === 'technical' ? 'technical' : 'hr'} avatarId={iv.avatarId} backgroundUrl={iv.backgroundUrl} stageRef={stageRef} visible={sp.rendered} live={sp.status === 'connected'} rendered={sp.rendered} rounded={false} />}
      {iv && !auto && (
        <button type="button" onClick={() => void sayHi()} disabled={busy} onPointerEnter={() => { if (canFace) void preloadSpatiusAvatar(iv.avatarId, '', HELLO_TOKEN_PATH); }} onFocus={() => { if (canFace) void preloadSpatiusAvatar(iv.avatarId, '', HELLO_TOKEN_PATH); }}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 3, display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 800,
            cursor: busy ? 'default' : 'pointer', color: '#fff', background: 'rgba(4,6,12,0.72)', border: '1px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)',
          }}>
          <Volume2 size={15} />
          {state === 'loading' ? 'Getting ready…' : state === 'playing' ? 'Speaking…' : canFace ? `Watch ${iv.displayName} speak` : `Hear ${iv.displayName} speak`}
        </button>
      )}
      {state === 'error' && !auto && <div style={{ position: 'absolute', top: 52, right: 14, zIndex: 3, fontSize: 11.5, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 3px #000' }}>Couldn't play that just now. Please try again.</div>}
    </div>
  );
}
