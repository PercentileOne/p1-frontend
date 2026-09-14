import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveAvatarTransport } from './liveAvatarTransport';
import { fetchAvatarSessionToken, fetchAvatarAudioBase64 } from '../api/liveAvatarApi';
import { getTTSAudioContext } from '../api/ttsApi';
import { tapLiveAvatarAudioForRecording } from '../api/liveAvatarRecordingBus';

export type LiveAvatarStatus = 'idle' | 'connecting' | 'connected' | 'failed' | 'closed';

// 2026-09-14: switched from @heygen/liveavatar-web-sdk's LiveAvatarSession to our own
// LiveAvatarTransport (liveAvatarTransport.ts), which owns the LiveKit Room directly instead of
// letting the SDK construct one internally. This is the actual fix for the lips-before-sound
// glitch investigated over the preceding days: our old custom audio tap (a second, independent
// Web Audio pipeline reading the raw track via createMediaStreamSource, running alongside the
// SDK's own native <video> playback) was confirmed by HeyGen support to be the cause — two
// pipelines racing on a session's first utterance. The real fix, LiveKit's own `webAudioMix` Room
// option, can only be set at Room construction, which the SDK's own internal Room never exposes a
// way to influence. Owning the Room ourselves collapses this back down to one pipeline.
//
// Left in place from the investigation: the ?avatarAudioControlTest=1 URL flag below, now
// re-purposed (see its own comment) to bisect "is our plugin node chain the problem" instead of
// "is a second pipeline racing the first" — that specific failure mode is now architecturally
// impossible, since there's only ever one Room, one pipeline.
const AVATAR_AUDIO_CONTROL_TEST =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('avatarAudioControlTest') === '1';

// Wraps our own LiveKit-based transport for one interview seat's avatar session. voiceChat is
// deliberately never used — we generate Amina/Wayne/Mike's audio ourselves (ElevenLabs, via
// fetchAvatarAudioBase64) and push it in with repeatAudio(), same division of responsibility as
// the "we handle the questions, they do the talking" architecture this was built around.
//
// One instance per seat — InterviewRoomPage creates two (role 'hr' for Amina, 'technical' for
// Wayne), each its own independent WebRTC session running concurrently. role is only used to
// pick the right avatar_id when minting a session token; speak()'s own role param (used for
// the audio-generation call) is passed separately by the caller and is expected to match.
export function useLiveAvatarSession(role: 'hr' | 'technical', onAnalyser?: (a: AnalyserNode | null) => void) {
  const [status, setStatus] = useState<LiveAvatarStatus>('idle');
  const transportRef = useRef<LiveAvatarTransport | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const streamReadyRef = useRef(false);
  const keepAliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // The actual source of truth for "is it safe to call speak() right now" — status (React
  // state) lags behind this by one render, which is exactly the bug this ref exists to avoid:
  // connect() awaiting transport.start() then immediately calling speak() in the same async
  // function, before React has re-rendered, means speak()'s own closure could still see the
  // pre-connection status and throw instantly — question text displays (a separate effect),
  // but the avatar never actually spoke. Same "always-fresh reference" idiom already used
  // elsewhere in this codebase (askQuestionRef, beginInterviewIntroRef) for the same reason.
  const connectedRef = useRef(false);
  // Caches the in-flight connect() attempt so a second caller (e.g. this seat's own first
  // question, firing right after its intro line's connect+speak) awaits the SAME handshake
  // instead of getting a premature resolved promise back.
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  // Disposes the current audio-plugin node chain (master gain / recording bus / analyser
  // fan-out) — see attachIfReady. Kept per-session since attachIfReady can legitimately run more
  // than once for the same session (setVideoEl firing, then stream-ready firing).
  const disposeTapRef = useRef<(() => void) | null>(null);
  const tappedSessionRef = useRef<LiveAvatarTransport | null>(null);

  const attachIfReady = useCallback(() => {
    if (!streamReadyRef.current || !videoElRef.current || !transportRef.current) return;
    const transport = transportRef.current;
    transport.attach(videoElRef.current);

    if (tappedSessionRef.current === transport) return; // already wired for this session
    tappedSessionRef.current = transport;

    const audioTrack = transport.getAudioTrack();
    if (!audioTrack) {
      console.warn('[LiveAvatar] No audio track available to tap after attach — recording will miss this avatar\'s voice.');
      return;
    }
    if (AVATAR_AUDIO_CONTROL_TEST) {
      // Skips our own boost/recording-bus plugin node — the native webAudioMix pipeline (still
      // the only pipeline, always) plays through with no gain boost and doesn't feed the
      // recording bus. Useful for bisecting "is our plugin chain the problem" from a future
      // regression; no longer tests "is there a second pipeline" — that class of bug is gone.
      console.log(`[LiveAvatar][${role}] CONTROL TEST MODE — audio plugin chain skipped, native webAudioMix pipeline only`);
      return;
    }
    getTTSAudioContext().then(ctx => {
      if (tappedSessionRef.current !== transport) return; // superseded by a newer session already
      disposeTapRef.current?.();
      const { node, dispose } = tapLiveAvatarAudioForRecording(ctx, onAnalyser);
      audioTrack.setWebAudioPlugins([node]);
      disposeTapRef.current = dispose;
    });
  }, [onAnalyser, role]);

  const connect = useCallback(() => {
    if (connectedRef.current) return Promise.resolve(); // already connected — no-op
    if (connectPromiseRef.current) return connectPromiseRef.current; // already connecting — wait for that attempt
    const attempt = (async () => {
      setStatus('connecting');
      try {
        const [{ sessionToken }, audioCtx] = await Promise.all([
          fetchAvatarSessionToken(role),
          getTTSAudioContext(),
        ]);
        const transport = new LiveAvatarTransport(sessionToken, audioCtx);
        transportRef.current = transport;

        transport.on('streamReady', () => {
          streamReadyRef.current = true;
          attachIfReady();
        });
        transport.on('disconnected', () => {
          setStatus('closed');
          transportRef.current = null;
          connectedRef.current = false;
          streamReadyRef.current = false;
          if (keepAliveTimerRef.current) { clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
        });

        await transport.start();
        connectedRef.current = true;
        setStatus('connected');

        // LiveAvatar sessions carry their own 5-minute inactivity timeout, separate from — and
        // shorter than — a real plan's overall session-duration cap. Nothing else in this hook
        // sends the session anything during a long candidate answer, so without this a session
        // could die from inactivity with plenty of duration budget still unused. 2 minutes keeps
        // a comfortable margin under the 5-minute limit.
        keepAliveTimerRef.current = setInterval(() => {
          transportRef.current?.keepAlive().catch(err => console.warn('[LiveAvatar] keepAlive failed:', err));
        }, 120_000);
      } catch (err) {
        console.error('[LiveAvatar] Session failed to start:', err);
        transportRef.current = null;
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
    disposeTapRef.current?.();
    disposeTapRef.current = null;
    tappedSessionRef.current = null;
    await transportRef.current?.stop();
    transportRef.current = null;
    connectedRef.current = false;
    streamReadyRef.current = false;
    setStatus('closed');
  }, []);

  // Speaks pre-generated audio through the avatar and resolves when it finishes — same
  // onEnd-callback contract ttsApi.ts's speak() already gives useInterviewerAudio.ts, so this
  // can slot into the same call sites without reshaping the state machine around it.
  // onSpeakStarted fires once HeyGen confirms the avatar has actually begun talking, distinct
  // from (and meaningfully later than) the moment this speak() call was made. Lets a caller
  // delay UI (e.g. the on-screen question text) until speech has genuinely started instead of
  // the moment it was requested — see InterviewRoomPage's use of it.
  const speak = useCallback(async (text: string, role: 'hr' | 'technical' | 'mike', onSpeakStarted?: () => void): Promise<void> => {
    const transport = transportRef.current;
    if (!transport || !connectedRef.current) throw new Error('Avatar session is not connected');

    const audioBase64 = await fetchAvatarAudioBase64(text, role);
    // Safety timeout: speak_ended can simply never fire if the underlying session has gone
    // quietly dead — a failed keep-alive is invisible to us, and the session can die from
    // candidate inactivity without a disconnect event firing client-side. Without this timeout,
    // speak() hangs forever, which hangs askQuestion's whole onDone chain: phase never advances
    // to "answering", so Record/Pass never render and the avatar never speaks again — exactly
    // the "everything freezes on a long answer" bug this fixes. A generous length-based floor
    // (15s minimum) lets it fail loud instead of silent, and forcibly tears down the stale
    // session so the *next* speak() reconnects fresh instead of hitting this same hang again.
    const timeoutMs = Math.max(15_000, text.split(/\s+/).length * 500);
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const onStarted = () => onSpeakStarted?.();
      const onEnded = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        transport.off('speakStarted', onStarted);
        transport.off('speakEnded', onEnded);
        resolve();
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        transport.off('speakStarted', onStarted);
        transport.off('speakEnded', onEnded);
        transportRef.current = null;
        connectedRef.current = false;
        streamReadyRef.current = false;
        setStatus('closed');
        if (keepAliveTimerRef.current) { clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
        reject(new Error(`Avatar speak timed out after ${timeoutMs}ms — session went stale`));
      }, timeoutMs);
      transport.on('speakStarted', onStarted);
      transport.on('speakEnded', onEnded);
      transport.repeatAudio(audioBase64);
    });
  }, []);

  // Maps to the reactive listening behaviour LiveAvatar's own demo showed off — call
  // startListening while the candidate is answering, stopListening right before the next
  // speak() call. Best-effort: our transport already no-ops (console.warn only) rather than
  // throw when there's no active connection to send on, so nothing here needs try/catch the
  // way the SDK's own throwing interrupt()/startListening()/stopListening() used to.
  const startListening = useCallback(() => { transportRef.current?.startListening(); }, []);
  const stopListening = useCallback(() => { transportRef.current?.stopListening(); }, []);
  const interrupt = useCallback(() => { transportRef.current?.interrupt(); }, []);

  const setVideoEl = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    attachIfReady();
  }, [attachIfReady]);

  // Always tear the session down on unmount — a live avatar session left open is a billable
  // connection nobody's watching.
  useEffect(() => () => {
    if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
    disposeTapRef.current?.();
    transportRef.current?.stop();
  }, []);

  return { status, connect, disconnect, speak, startListening, stopListening, interrupt, setVideoEl };
}
