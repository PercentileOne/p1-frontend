import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSpatiusAvatarSession, INTERVIEW_TOKEN_PATH, type SpatiusStatus } from './useSpatiusAvatarSession';
import { getInterviewTicket } from '../api/entitlementsApi';
import type { AvatarConfig } from '../api/liveAvatarApi';

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
    if (new URLSearchParams(window.location.search).get('force') === 'spatius') return true;
    const touchOnly = !!window.matchMedia && window.matchMedia('(pointer: coarse) and (hover: none)').matches;
    const uaMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return !(touchOnly || uaMobile || iPadOs);
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
) {
  const inner = useSpatiusAvatarSession(stageRef);
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
    try {
      await Promise.race([
        innerConnect(id, getInterviewTicket() ?? '', manualTransform() ?? SEAT_TRANSFORM[role], INTERVIEW_TOKEN_PATH),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('spatius connect timed out')), CONNECT_LIMIT_MS)),
      ]);
    } catch (e) {
      void disconnect(true); // a timed-out attempt must not finish later as a ghost, billed session
      onFailed(role);
      throw e;
    }
  }, [cfgRef, role, tileVisibleRef, seatIdsRef, innerConnect, disconnect, onFailed]);

  // Safety net: if the face has not actually started speaking within 12 seconds (audio not arriving, the renderer stalled), give up so the room speaks the line in
  // the ordinary voice instead of the interview sitting silent (the room treats a failure before speech starts as "use plain voice").
  const speak = useCallback((text: string, speakRole: SeatRole, onSpeakStarted?: () => void) => new Promise<void>((resolve, reject) => {
    let started = false;
    const watchdog = window.setTimeout(() => { if (!started) { interrupt(); reject(new Error('spatius speech did not start')); } }, 12000);
    innerSpeak(text, speakRole, () => { started = true; window.clearTimeout(watchdog); onSpeakStarted?.(); })
      .then(() => { window.clearTimeout(watchdog); resolve(); })
      .catch(e => { window.clearTimeout(watchdog); reject(e); });
  }), [innerSpeak, interrupt]);
  const noop = useCallback(() => { /* Spatius has no listening pose */ }, []);
  const setVideoEl = useCallback((_el: HTMLVideoElement | null) => { /* no <video>: the face is drawn into the seat's stage <div> */ }, []);

  return useMemo(() => ({
    status: inner.status as SpatiusStatus,
    avatarPoseState: null as string | null,
    poster: inner.poster,
    rendered: inner.rendered,
    connect, disconnect, speak,
    startListening: noop, stopListening: noop,
    interrupt, setVideoEl,
  }), [inner.status, inner.poster, inner.rendered, connect, disconnect, speak, noop, interrupt, setVideoEl]);
}
