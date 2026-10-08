import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSpatiusAvatarSession, INTERVIEW_TOKEN_PATH, clearSpatiusTokenCache, type SpatiusStatus } from './useSpatiusAvatarSession';
import { getInterviewTicket } from '../api/entitlementsApi';
import { getForceProvider, type AvatarConfig } from '../api/liveAvatarApi';
import { getSeatInterviewer } from '../lib/seatInterviewers';
import { logFlowEvent } from '../api/flowLogger';

// One interviewer seat of a FULL interview drawn by Spatius, wearing the same shape as useLiveAvatarSession (HeyGen), so InterviewRoomPage's
// seat wrappers, cost-control effect and recording code don't care which provider a seat has — the room just picks one of the two objects.
// Spatius draws the face on this device from the audio we send it, so there is no video stream, no listening pose and nothing to attach a <video> to.
// (Planning notes: docs/specs/spatius-migration-plan.md.)

export type SeatRole = 'hr' | 'technical' | 'michelle';

type Transform = { x: number; y: number; scale: number };

// Framing: none by default. The seat's picture area is a fixed 16:9 stage (see SpatiusSeatStage) and the avatar sits at the SDK's own default position and
// scale in it, exactly as in Spatius Studio's preview. ?scale= (with &ax= &ay=) on the room's address overrides that for tuning.
// Per-seat nudges from the default framing, set by eye (Francis, 2026-10-06): Wayne sits a little too far back in his room, so he is brought in about 20%
// to show the middle of the chest upwards, like Amina.
const SEAT_TRANSFORM: Partial<Record<SeatRole, Transform>> = { technical: { x: 0, y: 0, scale: 1.2 } };
// Per-interviewer framing where the seat's nudge doesn't suit them (Francis, 2026-10-07: Malcolm's hair was just out of frame at 1.2, so he is brought back a touch).
// (his registry id is spelt "malcom")
const INTERVIEWER_TRANSFORM: Record<string, Transform> = { malcom: { x: 0, y: 0, scale: 1.08 }, wayne: { x: 0, y: 0, scale: 1.08 } };

function manualTransform(): Transform | undefined {
  try {
    const q = new URLSearchParams(window.location.search);
    const scale = parseFloat(q.get('scale') ?? '');
    if (!Number.isFinite(scale) || scale < 0.2 || scale > 3) return undefined;
    const n = (k: string) => { const v = parseFloat(q.get(k) ?? ''); return Number.isFinite(v) ? Math.max(-2, Math.min(2, v)) : 0; };
    return { x: n('ax'), y: n('ay'), scale };
  } catch { return undefined; }
}

// A connection that neither succeeds nor fails must not hold the interview hostage (same limit as the demo).
const CONNECT_LIMIT_MS = 15000;

// Phones keep HeyGen for now (until recording of the interviewers' voices on a phone is carried over, and iOS's sound-start rule is tested on real devices).
// A signed-in admin can still test them by adding ?force=spatius to the room's address.
export function deviceCanUseSpatiusInRoom(): boolean {
  try {
    if (getForceProvider() === 'spatius') return true;
    const touchOnly = !!window.matchMedia && window.matchMedia('(pointer: coarse) and (hover: none)').matches;
    const uaMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return !(touchOnly || uaMobile || iPadOs);
  } catch { return false; }
}

/** True on phones and tablets: there the sound can only be started from inside a real tap, so the seat connects first and waits for one before its first line. */
export function isPhoneDevice(): boolean {
  try {
    const touchOnly = !!window.matchMedia && window.matchMedia('(pointer: coarse) and (hover: none)').matches;
    const uaMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return touchOnly || uaMobile || iPadOs;
  } catch { return false; }
}

export function useSpatiusSeat(
  role: SeatRole,
  stageRef: React.RefObject<HTMLDivElement | null>,
  cfgRef: React.RefObject<AvatarConfig | null>,
  onFailed: (role: SeatRole) => void,
  // While this is false the seat's tile is hidden or not yet its final shape, and connect() waits (see below). Omit for a seat that is on screen from the start.
  tileVisibleRef?: React.RefObject<boolean>,
  // The avatar the candidate's chosen interviewer uses for this seat; when absent, the server's default for the seat (from the avatar settings).
  seatIdsRef?: React.RefObject<Partial<Record<SeatRole, string>>>,
  // Phones: called before the seat's first line while the sound is still locked; the room shows a "Tap to meet" button and resolves this once the tap has unlocked the sound.
  requestTap?: (role: SeatRole) => Promise<void>,
) {
  const inner = useSpatiusAvatarSession(stageRef);
  const phone = isPhoneDevice();
  const lockedRef = useRef(false); // phone only: connected, but the sound system has not been started by a tap yet
  const unlockedRef = useRef(false); // phone only: a tap has already started this seat's sound system, so later controllers start their sound normally
  const aliveRef = useRef(true);
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);
  const { connect: innerConnect, speak: innerSpeak, interrupt, disconnect } = inner;

  const connect = useCallback(async (): Promise<void> => {
    // The room fetches its avatar settings on mount; a very early connect waits briefly for them rather than failing.
    for (let i = 0; i < 30 && !cfgRef.current; i++) await new Promise(r => setTimeout(r, 100));
    const id = seatIdsRef?.current?.[role] ?? cfgRef.current?.spatius?.[role];
    if (!id) throw new Error(`no Spatius avatar for ${role}`);
    // Spatius sizes its drawing surface when the face first connects and keeps that size. The interview room asks for the seats while the interviewers' tiles are
    // still hidden (a different, much taller shape), which made the faces enormous once the tiles appeared. So wait here until the tile is on screen, then a moment for
    // its layout to settle. A hidden-tile wait is not a failure and never marks the seat as failed.
    if (tileVisibleRef) {
      while (!tileVisibleRef.current) {
        if (!aliveRef.current) throw new Error('cancelled');
        await new Promise(r => setTimeout(r, 120));
      }
      await new Promise(r => setTimeout(r, 300));
    }
    // On a phone the first controller is connected with its sound still locked (a tap unlocks it); once a tap has happened, later ones start their sound normally.
    const deferred = phone && !unlockedRef.current;
    const attempt = () => Promise.race([
      innerConnect(id, getInterviewTicket() ?? '', manualTransform() ?? INTERVIEWER_TRANSFORM[getSeatInterviewer(role)?.id ?? ''] ?? SEAT_TRANSFORM[role], INTERVIEW_TOKEN_PATH, false, deferred),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('spatius connect timed out')), CONNECT_LIMIT_MS)),
    ]);
    try {
      try {
        await attempt();
      } catch (first) {
        // One more try with a fresh token before giving the seat up to HeyGen (2026-10-07: Michelle dropped to her old HeyGen face after a "Say hi" preview earlier in the visit).
        // The reason is recorded either way, so a failure can be read afterwards instead of guessed at.
        console.warn(`[Spatius] ${role} connect failed, retrying once:`, first);
        logFlowEvent('SPATIUS_SEAT_CONNECT_RETRY', { role, error: String((first as Error)?.message ?? first).slice(0, 200) });
        await disconnect(true);
        clearSpatiusTokenCache();
        await attempt();
      }
      if (deferred) lockedRef.current = true;
    } catch (e) {
      void disconnect(true); // a timed-out attempt must not finish later as a ghost, billed session
      logFlowEvent('SPATIUS_SEAT_FAILED', { role, error: String((e as Error)?.message ?? e).slice(0, 200) });
      onFailed(role);
      throw e;
    }
  }, [cfgRef, role, tileVisibleRef, seatIdsRef, innerConnect, disconnect, onFailed]);

  // Safety net: if the face has not actually started speaking within 12 seconds (audio not arriving, the renderer stalled), give up so the room speaks the line in
  // the ordinary voice instead of the interview sitting silent (the room treats a failure before speech starts as "use plain voice").
  // The 12 seconds are counted from the moment the audio is handed to the face, not from the request: a long, personal line (Michelle's briefing) can take more than 12 seconds
  // to produce, and counting that gave up too early and played the plain voice over the real one. Producing the audio has its own, longer limit (45 s).
  const speakNow = useCallback((text: string, speakRole: SeatRole, onSpeakStarted?: () => void) => new Promise<void>((resolve, reject) => {
    let started = false;
    let watchdog = 0;
    const giveUp = (why: string) => { if (!started) { interrupt(); reject(new Error(why)); } };
    const producing = window.setTimeout(() => giveUp('spatius speech audio took too long'), 45000);
    const done = () => { window.clearTimeout(producing); window.clearTimeout(watchdog); };
    innerSpeak(text, speakRole, () => { started = true; done(); onSpeakStarted?.(); }, undefined, () => {
      window.clearTimeout(producing);
      watchdog = window.setTimeout(() => giveUp('spatius speech did not start'), 12000);
    })
      .then(() => { done(); resolve(); })
      .catch(e => { done(); reject(e); });
  }), [innerSpeak, interrupt]);
  const speak = useCallback(async (text: string, speakRole: SeatRole, onSpeakStarted?: () => void): Promise<void> => {
    if (phone && lockedRef.current && requestTap) {
      await Promise.race([requestTap(speakRole), new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('no tap to start the sound')), 90000))]);
    }
    return speakNow(text, speakRole, onSpeakStarted);
  }, [phone, requestTap, speakNow]);
  // Called from inside the tap, first thing: starts this seat's sound system (nothing to do if it is not connected yet, or already unlocked).
  const unlockAudio = useCallback((): Promise<void> => {
    if (!lockedRef.current) return Promise.resolve();
    lockedRef.current = false; unlockedRef.current = true;
    return inner.unlockAudio();
  }, [inner]);
  const noop = useCallback(() => { /* Spatius has no listening pose */ }, []);
  const setVideoEl = useCallback((_el: HTMLVideoElement | null) => { /* no <video>: the face is drawn into the seat's stage <div> */ }, []);

  return useMemo(() => ({
    status: inner.status as SpatiusStatus,
    avatarPoseState: null as string | null,
    poster: inner.poster,
    rendered: inner.rendered,
    connect, disconnect, speak,
    startListening: noop, stopListening: noop,
    interrupt, setVideoEl, unlockAudio,
  }), [inner.status, inner.poster, inner.rendered, connect, disconnect, speak, noop, interrupt, setVideoEl, unlockAudio]);
}
