import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveAvatarSession, SessionEvent, AgentEventsEnum } from '@heygen/liveavatar-web-sdk';
import { fetchAvatarSessionToken, fetchAvatarAudioBase64 } from '../api/liveAvatarApi';

export type LiveAvatarStatus = 'idle' | 'connecting' | 'connected' | 'failed' | 'closed';

// Wraps the official LiveAvatar Web SDK for one interview's avatar session. voiceChat is
// deliberately never enabled — that SDK feature captures the browser's own microphone for a
// built-in voice round-trip, which is not what we want: we generate Sarah/James/Mike's audio
// ourselves (ElevenLabs, via fetchAvatarAudioBase64) and push it in with repeatAudio(), same
// division of responsibility as the "we handle the questions, they do the talking" architecture
// this was built around.
export function useLiveAvatarSession() {
  const [status, setStatus] = useState<LiveAvatarStatus>('idle');
  const sessionRef = useRef<LiveAvatarSession | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const streamReadyRef = useRef(false);
  // The actual source of truth for "is it safe to call speak() right now" — status (React
  // state) lags behind this by one render, which is exactly the bug this ref exists to avoid:
  // connect() awaiting session.start() then immediately calling speak() in the same async
  // function, before React has re-rendered, means speak()'s own closure could still see the
  // pre-connection status and throw instantly — question text displays (a separate effect),
  // but the avatar never actually spoke. Same "always-fresh reference" idiom already used
  // elsewhere in this codebase (askQuestionRef, beginInterviewIntroRef) for the same reason.
  const connectedRef = useRef(false);

  const attachIfReady = useCallback(() => {
    if (streamReadyRef.current && videoElRef.current && sessionRef.current) {
      sessionRef.current.attach(videoElRef.current);
    }
  }, []);

  const connect = useCallback(async () => {
    if (sessionRef.current) return; // already connecting/connected
    setStatus('connecting');
    try {
      const { sessionToken } = await fetchAvatarSessionToken();
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
      const streamReadyPromise = new Promise<void>((resolve) => {
        session.on(SessionEvent.SESSION_STREAM_READY, () => {
          streamReadyRef.current = true;
          attachIfReady();
          resolve();
        });
      });
      session.on(SessionEvent.SESSION_DISCONNECTED, () => {
        setStatus('closed');
        sessionRef.current = null;
        connectedRef.current = false;
        streamReadyRef.current = false;
      });

      await session.start();
      await Promise.race([
        streamReadyPromise,
        new Promise<void>(resolve => setTimeout(resolve, 5000)),
      ]);
      connectedRef.current = true;
      setStatus('connected');
    } catch (err) {
      console.error('[LiveAvatar] Session failed to start:', err);
      sessionRef.current = null;
      connectedRef.current = false;
      setStatus('failed');
    }
  }, [attachIfReady]);

  const disconnect = useCallback(async () => {
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

    const audioBase64 = await fetchAvatarAudioBase64(text, role);
    return new Promise<void>((resolve) => {
      const onEnded = () => {
        session.off(AgentEventsEnum.AVATAR_SPEAK_ENDED, onEnded);
        resolve();
      };
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, onEnded);
      session.repeatAudio(audioBase64);
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
  useEffect(() => () => { sessionRef.current?.stop(); }, []);

  return { status, connect, disconnect, speak, startListening, stopListening, interrupt, setVideoEl };
}
