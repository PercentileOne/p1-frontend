import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveAvatarLiveKitSession, LiveAvatarSessionEvent } from '../api/liveAvatarLiveKitSession';
import { fetchAvatarSessionToken, fetchAvatarAudioBase64 } from '../api/liveAvatarApi';
import { getTTSAudioContext } from '../api/ttsApi';
import { tapLiveAvatarAudioForRecording } from '../api/liveAvatarRecordingBus';

export type LiveAvatarStatus = 'idle' | 'connecting' | 'connected' | 'failed' | 'closed';

// Lightweight breadcrumbs, not the heavier investigation instrumentation this file used to carry
// (getStats polling, raw-socket buffer-event listening, ws-transport-state logging) — those
// answered specific questions during the lips-before-sound investigation that are now closed.
// Kept minimal and permanent: cheap insurance for spotting a future regression's rough shape
// (which call, how long after which event) without needing to re-instrument from scratch.
const timingLog = (role: string, label: string) => {
  console.log(`[LiveAvatar][${role}] ${label} @ ${Math.round(performance.now())}ms`);
};

// Re-added 2026-09-14, after three controlled harness tests (Mike's TTS, dual-avatar
// concurrency, and recording) each ruled out live without reproducing the glitch in isolation —
// the harness itself has never once glitched, at any warm-up down to 0s, in any configuration.
// That gap between "every isolated reproduction is clean" and "the real room still fails
// intermittently" can only be answered with real packet-level data from an ACTUAL failing real-
// room run, not another guessed variable. getStats() on the inbound audio receiver, polled every
// 250ms for ~4s after a session's first-ever speak() — steady arrival with flat jitterBufferDelay
// points at something client-side specific to the real room's complexity; irregular/bursty
// arrival points at HeyGen's own delivery, not anything in our code. Same reach into LiveKit's
// internal room.engine.pcManager.subscriber._pc as when this was first built (livekit-client
// exposes no public per-track RTCPeerConnection accessor) — verified against the SDK's own
// compiled source at the time, unchanged since. Reached via our own class's public `room` getter
// now (see liveAvatarLiveKitSession.ts) rather than a private field on a third-party SDK
// instance — same underlying livekit-client internal either way, just a cleaner path to it.
const pollAudioStats = (session: LiveAvatarLiveKitSession, role: string, rawAudioTrack: MediaStreamTrack) => {
  const pc = (session.room as unknown as {
    engine?: { pcManager?: { subscriber?: { _pc?: RTCPeerConnection } } };
  }).engine?.pcManager?.subscriber?._pc;
  if (!pc) {
    console.warn('[LiveAvatar] Could not reach internal RTCPeerConnection for getStats() — SDK internals may have changed.');
    return;
  }
  let samples = 0;
  const timer = setInterval(() => {
    samples++;
    if (samples > 16) { clearInterval(timer); return; } // ~4s of coverage at 250ms
    pc.getStats(rawAudioTrack).then(report => {
      report.forEach(stat => {
        if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
          console.log(
            `[LiveAvatar STATS][${role}] @ ${Math.round(performance.now())}ms — ` +
            `packetsReceived=${stat.packetsReceived}, jitterBufferDelay=${stat.jitterBufferDelay?.toFixed?.(3)}, ` +
            `jitterBufferEmittedCount=${stat.jitterBufferEmittedCount}, removedSamplesForAcceleration=${stat.removedSamplesForAcceleration}, ` +
            `concealedSamples=${stat.concealedSamples}, lastPacketReceivedTimestamp=${stat.lastPacketReceivedTimestamp}`
          );
        }
      });
    }).catch(err => {
      console.warn('[LiveAvatar] getStats() failed:', err);
      clearInterval(timer);
    });
  }, 250);
};

// 2026-09-14 — added after four separate controlled harness tests (Mike's spoken intro,
// dual-avatar concurrency, recording, and a 180s idle warm-up) each failed to reproduce the
// glitch in isolation, while the real Interview/Talk rooms keep failing intermittently with the
// same STATS signature (climbing jitter buffer delay). The one thing never actually controlled
// for: the isolated harness page has almost nothing else running on the main thread, while a real
// room is much heavier (interview UI, phase transitions, Framer Motion, other effects/polling).
// 'longtask' entries (any task blocking the main thread >50ms — the standard way to measure this)
// give a real, comparable number instead of another guess. Logged once per hook instance, covering
// connect()-to-first-speak() — if a real room run shows meaningfully more/longer long tasks than
// the harness ever does, that's evidence main-thread contention (not the avatar plumbing itself)
// is what's starving jitter-buffer drainage specifically during the intro.
const startLongTaskObserving = (entriesOut: PerformanceEntry[]): PerformanceObserver | null => {
  if (typeof PerformanceObserver === 'undefined' || !PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
    console.warn('[LiveAvatar] longtask entries not supported in this browser — skipping main-thread contention diagnostic.');
    return null;
  }
  try {
    const obs = new PerformanceObserver((list) => { entriesOut.push(...list.getEntries()); });
    obs.observe({ type: 'longtask', buffered: true });
    return obs;
  } catch (err) {
    console.warn('[LiveAvatar] Failed to start longtask observer:', err);
    return null;
  }
};

const logLongTaskSummary = (role: string, entries: PerformanceEntry[]) => {
  const totalMs = entries.reduce((sum, e) => sum + e.duration, 0);
  const longest = entries.reduce((max, e) => Math.max(max, e.duration), 0);
  console.log(
    `[LiveAvatar LONGTASK][${role}] connect()-to-first-speak() window — ${entries.length} long task(s), ` +
    `${totalMs.toFixed(0)}ms total, longest ${longest.toFixed(0)}ms`
  );
};

// Wraps the official LiveAvatar Web SDK for one interview seat's avatar session. voiceChat is
// deliberately never enabled — that SDK feature captures the browser's own microphone for a
// built-in voice round-trip, which is not what we want: we generate Amina/Wayne/Mike's audio
// ourselves (ElevenLabs, via fetchAvatarAudioBase64) and push it in with repeatAudio(), same
// division of responsibility as the "we handle the questions, they do the talking" architecture
// this was built around.
//
// 2026-09-14 — the audible path is now just the SDK's own native <video> playback, full stop.
// The lips-before-sound investigation traced the glitch to our own tap being a SECOND,
// independent audio pipeline (raw track -> our own Web Audio graph -> speakers) racing the native
// one — confirmed by HeyGen support and by a clean, repeated control test (element unmuted, no
// tap at all). A follow-up attempt routed the tap through LiveKit's own official `webAudioMix`
// mechanism instead of a hand-rolled one, which still turned out to be Web Audio processing in
// the audible path — same class of problem, still regressed live. The tap now ONLY feeds the
// recording bus + waveform analyser (see liveAvatarRecordingBus.ts) — never speakers — and the
// volume boost that used to live on a destination-side gain node is applied to the raw PCM
// samples themselves before they're ever sent to HeyGen (see liveAvatarApi.ts), so the native
// element already plays back boosted audio with zero Web Audio involvement in what a candidate
// actually hears.
//
// One instance per seat — InterviewRoomPage creates two (role 'hr' for Amina, 'technical' for
// Wayne), each its own independent WebRTC session running concurrently. role is only used to
// pick the right avatar_id when minting a session token; speak()'s own role param (used for
// the audio-generation call) is passed separately by the caller and is expected to match.
export function useLiveAvatarSession(role: 'hr' | 'technical' | 'michelle', onAnalyser?: (a: AnalyserNode | null) => void) {
  const [status, setStatus] = useState<LiveAvatarStatus>('idle');
  // Server-reported avatar pose ("idle" | "listening" | whatever HeyGen's agent state machine
  // sends) — see the AGENT_STATE_UPDATED listener in connect() below for how this gets populated.
  const [avatarPoseState, setAvatarPoseState] = useState<string | null>(null);
  const sessionRef = useRef<LiveAvatarLiveKitSession | null>(null);
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
  // `new LiveAvatarLiveKitSession(...)` runs, well before the handshake (session.start() +
  // SESSION_STREAM_READY) actually finishes, so a second connect() call during that window
  // returned instantly, the caller's speak() then ran against a not-yet-connected session and
  // threw, and the caller's catch swallowed it as silence — exactly the "no talking" failure
  // mode this was built to prevent.
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  // Tracks which session has already had its audio tapped into the recording bus — kept
  // separate from video-attach bookkeeping (see wireTapIfReady's own comment for why), but
  // still per-session since wireTapIfReady can legitimately be asked to run more than once for
  // the same session.
  const tappedSessionRef = useRef<LiveAvatarLiveKitSession | null>(null);
  const untapAudioRef = useRef<(() => void) | null>(null);
  // 2026-09-14 — found via a harness bug, not a production one (production always passes
  // setVideoEl directly as the ref prop, which is stable — see InterviewRoomPage.tsx's
  // `ref={liveAvatarHr.setVideoEl}`). A DIAGNOSTIC harness variant wrapped it in an inline arrow
  // function, which gets a new identity every render, so React re-invoked setVideoEl -> attach()
  // on every re-render (e.g. every addLog() call), including mid-speech — attach() has no
  // "already attached" guard, so it kept calling session.attach() on an already-playing session
  // over and over, which is very plausibly what actually produced that harness's glitch, not
  // (or not only) the connect-to-attach gap being tested. Guarding attach() to be idempotent per
  // session closes this off categorically, in production and in any future harness variant,
  // regardless of ref-callback stability.
  const attachedSessionRef = useRef<LiveAvatarLiveKitSession | null>(null);
  // Gates pollAudioStats to a session's first-ever speak() only — one capture per session is
  // what's actually needed (was HeyGen's own original ask: "one glitched utterance"), not one
  // per question.
  const hasPolledStatsRef = useRef(false);
  // See startLongTaskObserving's own comment above — same "first-ever speak() only" gate as
  // hasPolledStatsRef, for the same reason (the intro is the one window this investigation
  // actually cares about).
  const longTaskEntriesRef = useRef<PerformanceEntry[]>([]);
  const longTaskObserverRef = useRef<PerformanceObserver | null>(null);
  const hasLoggedLongTasksRef = useRef(false);

  // Wired on SESSION_STREAM_READY, independent of the <video> element existing (it only mounts
  // once the avatar tiles become visually relevant) — lets the recording tap sit warmed up for
  // however long the avatar is idle before its first speak(), rather than starting cold right
  // before it. Purely a recording-bus feed now — see liveAvatarRecordingBus.ts's own comment on
  // why it never touches speaker output.
  const wireTapIfReady = useCallback(() => {
    if (!streamReadyRef.current || !sessionRef.current) return;
    const session = sessionRef.current;
    if (tappedSessionRef.current === session) return; // already wired for this session
    tappedSessionRef.current = session;
    const rawAudioTrack = session.audioTrack;
    if (!rawAudioTrack) {
      console.warn('[LiveAvatar] No raw audio track available to tap — SDK internals may have changed; recording will miss this avatar\'s voice.');
      return;
    }
    untapAudioRef.current?.();
    getTTSAudioContext().then(ctx => {
      if (tappedSessionRef.current !== session) return; // superseded by a newer session already
      untapAudioRef.current = tapLiveAvatarAudioForRecording(rawAudioTrack, ctx, onAnalyser);
      timingLog(role, 'recording tap connected');
    });
  }, [onAnalyser, role]);

  const attachIfReady = useCallback(() => {
    if (streamReadyRef.current && videoElRef.current && sessionRef.current) {
      if (attachedSessionRef.current === sessionRef.current) return; // already attached — see attachedSessionRef's comment
      attachedSessionRef.current = sessionRef.current;
      sessionRef.current.attach(videoElRef.current);
      timingLog(role, 'attach() done — native element is the only audio sink');
      wireTapIfReady();
    }
  }, [wireTapIfReady, role]);

  const connect = useCallback(() => {
    if (connectedRef.current) return Promise.resolve(); // already connected — no-op
    if (connectPromiseRef.current) return connectPromiseRef.current; // already connecting — wait for that attempt
    const attempt = (async () => {
      setStatus('connecting');
      try {
        const { sessionToken } = await fetchAvatarSessionToken(role);
        const session = new LiveAvatarLiveKitSession(sessionToken);
        sessionRef.current = session;

        // session.start() resolves once the WebRTC/WebSocket handshake completes — that's not
        // the same moment LiveAvatar's own rendering pipeline has actually finished warming up
        // and subscribed the real video/audio tracks. Calling speak() in that gap is exactly
        // what caused the very first question of a session to silently misfire live (text
        // displayed, avatar never moved). SESSION_STREAM_READY is the SDK's own explicit "tracks
        // are actually here" signal; connect() waits for it too, with a safety timeout in case it
        // never fires for some reason, so a stalled stream can't hang the whole interview.
        timingLog(role, 'connect() starting');
        if (!longTaskObserverRef.current && !hasLoggedLongTasksRef.current) {
          longTaskObserverRef.current = startLongTaskObserving(longTaskEntriesRef.current);
        }
        const streamReadyPromise = new Promise<void>((resolve) => {
          session.on(LiveAvatarSessionEvent.SESSION_STREAM_READY, () => {
            timingLog(role, 'SESSION_STREAM_READY fired');
            streamReadyRef.current = true;
            wireTapIfReady();
            attachIfReady();
            resolve();
          });
        });
        session.on(LiveAvatarSessionEvent.SESSION_DISCONNECTED, (reason?: unknown) => {
          timingLog(role, `SESSION_DISCONNECTED fired (reason: ${JSON.stringify(reason)})`);
          setStatus('closed');
          sessionRef.current = null;
          connectedRef.current = false;
          streamReadyRef.current = false;
          attachedSessionRef.current = null;
          if (keepAliveTimerRef.current) { clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
        });
        // HeyGen Advanced Support, 2026-09-16: this is the event a prior raw-socket-reach-in
        // diagnostic (commit 49526c7) was built to surface — now first-class, since
        // liveAvatarLiveKitSession.ts's own WS handler recognizes agent.state_updated natively
        // instead of us reaching into a private SDK field for it. See that file's
        // handleWebSocketMessage for why the old SDK never surfaced this at all.
        session.on(LiveAvatarSessionEvent.AGENT_STATE_UPDATED, ({ previousState, newState }: { previousState: string | null; newState: string | null }) => {
          timingLog(role, `agent.state_updated: ${previousState} -> ${newState}`);
          setAvatarPoseState(newState ?? null);
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
  }, [attachIfReady, wireTapIfReady, role]);

  const disconnect = useCallback(async () => {
    if (keepAliveTimerRef.current) { clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
    untapAudioRef.current?.();
    untapAudioRef.current = null;
    tappedSessionRef.current = null;
    attachedSessionRef.current = null;
    await sessionRef.current?.stop();
    sessionRef.current = null;
    connectedRef.current = false;
    streamReadyRef.current = false;
    setStatus('closed');
  }, []);

  // Speaks pre-generated audio through the avatar and resolves when it finishes — same
  // onEnd-callback contract ttsApi.ts's speak() already gives useInterviewerAudio.ts, so this
  // can slot into the same call sites without reshaping the state machine around it.
  // onSpeakStarted fires on AVATAR_SPEAK_STARTED — HeyGen's own confirmation the avatar has
  // actually begun talking, distinct from (and meaningfully later than) the moment this speak()
  // call was made. Lets a caller delay UI (e.g. the on-screen question text) until speech has
  // genuinely started instead of the moment it was requested — see InterviewRoomPage's use of it.
  const speak = useCallback(async (text: string, role: 'hr' | 'technical' | 'michelle', onSpeakStarted?: () => void): Promise<void> => {
    const session = sessionRef.current;
    if (!session || !connectedRef.current) throw new Error('Avatar session is not connected');

    timingLog(role, 'speak() called');
    const audioBase64 = await fetchAvatarAudioBase64(text, role);
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
      const onStarted = () => {
        timingLog(role, 'AVATAR_SPEAK_STARTED fired');
        onSpeakStarted?.();
      };
      const onEnded = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        session.off(LiveAvatarSessionEvent.AVATAR_SPEAK_STARTED, onStarted);
        session.off(LiveAvatarSessionEvent.AVATAR_SPEAK_ENDED, onEnded);
        resolve();
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        session.off(LiveAvatarSessionEvent.AVATAR_SPEAK_STARTED, onStarted);
        session.off(LiveAvatarSessionEvent.AVATAR_SPEAK_ENDED, onEnded);
        sessionRef.current = null;
        connectedRef.current = false;
        streamReadyRef.current = false;
        setStatus('closed');
        if (keepAliveTimerRef.current) { clearInterval(keepAliveTimerRef.current); keepAliveTimerRef.current = null; }
        reject(new Error(`Avatar speak timed out after ${timeoutMs}ms — session went stale`));
      }, timeoutMs);
      session.on(LiveAvatarSessionEvent.AVATAR_SPEAK_STARTED, onStarted);
      session.on(LiveAvatarSessionEvent.AVATAR_SPEAK_ENDED, onEnded);
      if (!hasPolledStatsRef.current) {
        hasPolledStatsRef.current = true;
        const rawAudioTrack = session.audioTrack;
        if (rawAudioTrack) pollAudioStats(session, role, rawAudioTrack);
      }
      if (!hasLoggedLongTasksRef.current) {
        hasLoggedLongTasksRef.current = true;
        longTaskObserverRef.current?.disconnect();
        logLongTaskSummary(role, longTaskEntriesRef.current);
      }
      session.repeatAudio(audioBase64);
      timingLog(role, 'repeatAudio() sent');
    });
  }, []);

  // Maps to the reactive listening behaviour LiveAvatar's own demo showed off — call
  // startListening while the candidate is answering, stopListening right before the next
  // speak() call.
  //
  // All three wrapped in try/catch (found live 2026-09-12, Talk Room): the SDK's own
  // interrupt()/startListening()/stopListening() throw a real, uncaught "Session needs to be
  // connected to send command event" if the session object exists (connect() already ran) but
  // the underlying handshake hasn't actually finished yet — e.g. a cleanup/interrupt firing
  // moments after connect() was kicked off, well before it resolves. With nothing catching it,
  // that crashed the whole page to a blank screen. These are best-effort control commands —
  // there's nothing useful to do with "couldn't interrupt a session that was never connected"
  // beyond not crashing, so swallow it here once rather than at every call site.
  const startListening = useCallback(() => {
    try { sessionRef.current?.startListening(); } catch { /* not connected yet — nothing to start */ }
  }, []);
  const stopListening = useCallback(() => {
    try { sessionRef.current?.stopListening(); } catch { /* not connected yet — nothing to stop */ }
  }, []);
  const interrupt = useCallback(() => {
    try { sessionRef.current?.interrupt(); } catch { /* not connected yet — nothing to interrupt */ }
  }, []);

  const setVideoEl = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    attachIfReady();
  }, [attachIfReady]);

  // Always tear the session down on unmount — a live avatar session left open is a billable
  // connection nobody's watching.
  useEffect(() => () => {
    if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
    untapAudioRef.current?.();
    longTaskObserverRef.current?.disconnect();
    sessionRef.current?.stop();
  }, []);

  return { status, avatarPoseState, connect, disconnect, speak, startListening, stopListening, interrupt, setVideoEl };
}
