import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveAvatarSession, SessionEvent, AgentEventsEnum } from '@heygen/liveavatar-web-sdk';
import { fetchAvatarSessionToken, fetchAvatarAudioBase64 } from '../api/liveAvatarApi';
import { getTTSAudioContext } from '../api/ttsApi';
import { tapLiveAvatarAudioForRecording } from '../api/liveAvatarRecordingBus';

export type LiveAvatarStatus = 'idle' | 'connecting' | 'connected' | 'failed' | 'closed';

// Temporary diagnostic instrumentation (Francis, 2026-09-10) — the first attempted fix for
// "Amina's lips move 3-6s before sound, then audio races to catch up" (muting the <video>
// element synchronously at attach time) did NOT resolve it live, so guessing again without
// real data risks the same result. These timestamps pin down exactly where the gap actually
// is: client-side tap wiring, client-side audio generation, or HeyGen's own server-side
// pipeline (visible as a gap between repeatAudio() being sent and AVATAR_SPEAK_STARTED coming
// back). Safe to remove once the real cause is confirmed from a live console capture.
const timingLog = (role: string, label: string) => {
  console.log(`[LiveAvatar TIMING][${role}] ${label} @ ${Math.round(performance.now())}ms`);
};

// Wraps the official LiveAvatar Web SDK for one interview seat's avatar session. voiceChat is
// deliberately never enabled — that SDK feature captures the browser's own microphone for a
// built-in voice round-trip, which is not what we want: we generate Amina/Wayne/Mike's audio
// ourselves (ElevenLabs, via fetchAvatarAudioBase64) and push it in with repeatAudio(), same
// division of responsibility as the "we handle the questions, they do the talking" architecture
// this was built around.
//
// One instance per seat — InterviewRoomPage creates two (role 'hr' for Amina, 'technical' for
// Wayne), each its own independent WebRTC session running concurrently. role is only used to
// pick the right avatar_id when minting a session token; speak()'s own role param (used for
// the audio-generation call) is passed separately by the caller and is expected to match.
export function useLiveAvatarSession(role: 'hr' | 'technical', onAnalyser?: (a: AnalyserNode | null) => void) {
  const [status, setStatus] = useState<LiveAvatarStatus>('idle');
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const streamReadyRef = useRef(false);
  const keepAliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // The actual source of truth for "is it safe to call speak() right now" — status (React
  // state) lags behind this by one render, which is exactly the bug this ref exists to avoid:
  // connect() awaiting session.start() then immediately calling speak() in the same async
  // function, before React has re-rendered, means speak()'s own closure could still see the
  // pre-connection status and throw instantly — question text displays (a separate effect),
  // but the avatar never actually spoke. Same "always-fresh reference" idiom already used
  // elsewhere in this codebase (askQuestionRef, beginInterviewIntroRef) for the same reason.
  const connectedRef = useRef(false);
  // Caches the in-flight connect() attempt so a second caller (e.g. this seat's own first
  // question, firing right after its intro line's connect+speak) awaits the SAME handshake
  // instead of getting a premature resolved promise back. The old guard here just checked
  // `if (sessionRef.current) return` — sessionRef.current is set synchronously the moment
  // `new LiveAvatarSession(...)` runs, well before the handshake (session.start() +
  // SESSION_STREAM_READY) actually finishes, so a second connect() call during that window
  // returned instantly, the caller's speak() then ran against a not-yet-connected session and
  // threw, and the caller's catch swallowed it as silence — exactly the "no talking" failure
  // mode this was built to prevent.
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  // Tracks which session has already had its audio tapped into the recording bus — the tap is
  // now per-session (see attachIfReady's own comment for why it moved off the <video> element),
  // and attachIfReady can legitimately run more than once (setVideoEl firing, then
  // SESSION_STREAM_READY firing) for the same session.
  const tappedSessionRef = useRef<LiveAvatarSession | null>(null);
  const untapAudioRef = useRef<(() => void) | null>(null);

  const attachIfReady = useCallback(() => {
    if (streamReadyRef.current && videoElRef.current && sessionRef.current) {
      sessionRef.current.attach(videoElRef.current);
      // Mute SYNCHRONOUSLY, in the same tick as attach() — this is the actual fix for the
      // "lips move for 3-6s, then audio races to catch up" bug reported live 2026-09-10 (first
      // utterance of a session only — Amina's intro, never Wayne's, since he always speaks
      // second and the gap below has long since closed by his turn). Root cause: this element
      // was previously left UNMUTED until the async tap below finished wiring (an awaited
      // getTTSAudioContext() call, possibly a real user-perceptible delay the very first time
      // it's ever invoked in a session). Video frames render the instant attach() runs above,
      // but during that async gap the element's OWN native WebRTC audio track — a brand new
      // session's first-ever audio decode, which browsers are well known to cold-start slower
      // than video — was free to play, and browsers' native <video>/<audio> A/V sync includes
      // its own catch-up mechanism (briefly speeding up audio playback to resync to the video
      // position) for exactly this situation. That native catch-up is what candidates actually
      // heard as audio "racing" to catch up — not anything in our own tap, which (being a plain
      // live MediaStreamSource pull, not a buffered element) has no such speed-up behaviour.
      // Muting here, before the browser has a chance to render a single frame of native audio,
      // closes that window entirely: the only audio the candidate ever hears is our tap below,
      // which starts a moment later in real time but never audibly "catches up".
      videoElRef.current.muted = true;
      timingLog(role, 'attach() + synchronous mute done');
      const session = sessionRef.current;
      const el = videoElRef.current;
      if (tappedSessionRef.current !== session) {
        untapAudioRef.current?.();
        tappedSessionRef.current = session;
        // createMediaElementSource() on the <video> element (the original approach) proved
        // unreliable for this SDK's WebRTC-sourced audio — confirmed live via 20 consecutive
        // 1-second samples of pure silence despite the element being correctly unmuted, the
        // AudioContext running, and no errors anywhere in the chain. createMediaStreamSource()
        // on the RAW MediaStreamTrack, bypassing the element's decode/render pipeline entirely,
        // is the standard, reliable way to capture WebRTC audio for Web Audio API. The SDK's
        // public surface has no accessor for that raw track — only .attach(element) — so this
        // reaches past the declared (TypeScript-only, not JS-enforced) `private` on
        // _remoteAudioTrack, verified directly against the installed package's compiled JS.
        // Re-verify this still exists if @heygen/liveavatar-web-sdk is ever upgraded.
        const rawAudioTrack = (session as unknown as {
          _remoteAudioTrack?: { mediaStreamTrack?: MediaStreamTrack };
        })._remoteAudioTrack?.mediaStreamTrack;
        if (rawAudioTrack) {
          // Fire-and-forget — getTTSAudioContext() is async only because it may need to
          // resume() a suspended context; the tap itself doesn't need to block attach().
          getTTSAudioContext().then(ctx => {
            if (tappedSessionRef.current === session) {
              untapAudioRef.current = tapLiveAvatarAudioForRecording(rawAudioTrack, el, ctx, onAnalyser);
              timingLog(role, 'audio tap connected (candidate can now hear this seat)');
            }
          });
        } else {
          console.warn('[LiveAvatar] No raw audio track available to tap — SDK internals may have changed; recording will miss this avatar\'s voice.');
        }
      }
    }
  }, [onAnalyser]);

  const connect = useCallback(() => {
    if (connectedRef.current) return Promise.resolve(); // already connected — no-op
    if (connectPromiseRef.current) return connectPromiseRef.current; // already connecting — wait for that attempt
    const attempt = (async () => {
      setStatus('connecting');
      try {
        const { sessionToken } = await fetchAvatarSessionToken(role);
        const session = new LiveAvatarSession(sessionToken, { voiceChat: false });
        sessionRef.current = session;

        // session.start() resolves once the WebRTC/WebSocket handshake completes — that's not
        // the same moment LiveAvatar's own rendering pipeline has actually finished warming up
        // and subscribed the real video/audio tracks. Calling speak() in that gap is exactly
        // what caused the very first question of a session to silently misfire live (text
        // displayed, Wayne never moved, only Repeat — running well after the gap had closed —
        // worked). SESSION_STREAM_READY is the SDK's own explicit "tracks are actually here"
        // signal; connect() now waits for it too, with a safety timeout in case it never fires
        // for some reason, so a stalled stream can't hang the whole interview indefinitely.
        timingLog(role, 'connect() starting (session token requested)');
        const streamReadyPromise = new Promise<void>((resolve) => {
          session.on(SessionEvent.SESSION_STREAM_READY, () => {
            timingLog(role, 'SESSION_STREAM_READY fired');
            streamReadyRef.current = true;
            attachIfReady();
            resolve();
          });
        });
        session.on(SessionEvent.SESSION_DISCONNECTED, (reason?: unknown) => {
          timingLog(role, `SESSION_DISCONNECTED fired (reason: ${JSON.stringify(reason)}) — this seat will show frozen/silent until re-connected`);
          setStatus('closed');
          sessionRef.current = null;
          connectedRef.current = false;
          streamReadyRef.current = false;
          if (keepAliveTimerRef.current) { clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
        });

        await session.start();
        await Promise.race([
          streamReadyPromise,
          new Promise<void>(resolve => setTimeout(resolve, 5000)),
        ]);
        connectedRef.current = true;
        setStatus('connected');

        // LiveAvatar sessions carry their own 5-minute inactivity timeout, separate from — and
        // shorter than — a real plan's overall session-duration cap. Nothing else in this hook
        // sends the session anything during a long candidate answer, so without this a session
        // could die from inactivity with plenty of duration budget still unused. 2 minutes keeps
        // a comfortable margin under the 5-minute limit.
        keepAliveTimerRef.current = setInterval(() => {
          sessionRef.current?.keepAlive().catch(err => console.warn('[LiveAvatar] keepAlive failed:', err));
        }, 120_000);
      } catch (err) {
        console.error('[LiveAvatar] Session failed to start:', err);
        sessionRef.current = null;
        connectedRef.current = false;
        setStatus('failed');
        throw err; // propagate — connectPromiseRef callers (including this seat's own next
                   // speak()) need to see the rejection, not a silently-resolved connect().
      } finally {
        connectPromiseRef.current = null;
      }
    })();
    connectPromiseRef.current = attempt;
    return attempt;
  }, [attachIfReady, role]);

  const disconnect = useCallback(async () => {
    if (keepAliveTimerRef.current) { clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
    untapAudioRef.current?.();
    untapAudioRef.current = null;
    tappedSessionRef.current = null;
    await sessionRef.current?.stop();
    sessionRef.current = null;
    connectedRef.current = false;
    streamReadyRef.current = false;
    setStatus('closed');
  }, []);

  // Speaks pre-generated audio through the avatar and resolves when it finishes — same
  // onEnd-callback contract ttsApi.ts's speak() already gives useInterviewerAudio.ts, so this
  // can slot into the same call sites without reshaping the state machine around it.
  const speak = useCallback(async (text: string, role: 'hr' | 'technical' | 'mike'): Promise<void> => {
    const session = sessionRef.current;
    if (!session || !connectedRef.current) throw new Error('Avatar session is not connected');

    timingLog(role, 'speak() called — requesting audio generation');
    const audioBase64 = await fetchAvatarAudioBase64(text, role);
    timingLog(role, 'audio generation done — about to send repeatAudio()');
    // Safety timeout: AVATAR_SPEAK_ENDED can simply never fire if the underlying session has
    // gone quietly dead — the SDK's own keepAlive() fire-and-forgets its network call (never
    // awaits sessionClient.keepAlive() internally), so a failed keep-alive is invisible to us,
    // and the session can die from candidate inactivity without SESSION_DISCONNECTED firing
    // client-side. Without this timeout, speak() hangs forever, which hangs askQuestion's whole
    // onDone chain: phase never advances to "answering", so Record/Pass never render and the
    // avatar never speaks again — exactly the "everything freezes on a long answer" bug this
    // fixes. A generous length-based floor (15s minimum) lets it fail loud instead of silent,
    // and forcibly tears down the stale session so the *next* speak() reconnects fresh instead
    // of hitting this same hang again.
    const timeoutMs = Math.max(15_000, text.split(/\s+/).length * 500);
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      // Never listened to before — this is HeyGen's own server-pushed confirmation that the
      // talk has actually begun (a real WebSocket event, "agent.speak_started"), distinct from
      // merely having SENT repeatAudio() below. A large gap between the "sending repeatAudio()"
      // log above and this one firing would confirm the delay is server-side (HeyGen's own
      // generation pipeline), not anything in our own tap-wiring or audio-generation code.
      const onStarted = () => timingLog(role, 'AVATAR_SPEAK_STARTED fired (HeyGen confirms talk began)');
      const onEnded = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, onStarted);
        session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, onEnded);
        resolve();
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        session.off(AgentEventsEnum.AVATAR_SPEAK_STARTED, onStarted);
        session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, onEnded);
        sessionRef.current = null;
        connectedRef.current = false;
        streamReadyRef.current = false;
        setStatus('closed');
        if (keepAliveTimerRef.current) { clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
        reject(new Error(`Avatar speak timed out after ${timeoutMs}ms — session went stale`));
      }, timeoutMs);
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, onStarted);
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, onEnded);
      session.repeatAudio(audioBase64);
      timingLog(role, 'repeatAudio() sent');
    });
  }, []);

  // Maps to the reactive listening behaviour LiveAvatar's own demo showed off — call
  // startListening while the candidate is answering, stopListening right before the next
  // speak() call.
  const startListening = useCallback(() => sessionRef.current?.startListening(), []);
  const stopListening = useCallback(() => sessionRef.current?.stopListening(), []);
  const interrupt = useCallback(() => sessionRef.current?.interrupt(), []);

  const setVideoEl = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    attachIfReady();
  }, [attachIfReady]);

  // Always tear the session down on unmount — a live avatar session left open is a billable
  // connection nobody's watching.
  useEffect(() => () => {
    if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
    untapAudioRef.current?.();
    sessionRef.current?.stop();
  }, []);

  return { status, connect, disconnect, speak, startListening, stopListening, interrupt, setVideoEl };
}
