import { useCallback, useMemo } from 'react';
import { useSpatiusAvatarSession, INTERVIEW_TOKEN_PATH, type SpatiusStatus } from './useSpatiusAvatarSession';
import { getInterviewTicket } from '../api/entitlementsApi';
import type { AvatarConfig } from '../api/liveAvatarApi';

// One interviewer seat of a FULL interview drawn by Spatius, wearing the same shape as useLiveAvatarSession (HeyGen), so InterviewRoomPage's
// seat wrappers, cost-control effect and recording code don't care which provider a seat has — the room just picks one of the two objects.
// Spatius draws the face on this device from the audio we send it, so there is no video stream, no listening pose and nothing to attach a <video> to.
// (Planning notes: docs/specs/spatius-migration-plan.md.)

export type SeatRole = 'hr' | 'technical' | 'michelle';

type Transform = { x: number; y: number; scale: number };

// Framing per seat, applied to the SDK's own avatarTransform (1 = default, smaller = further back). hr/technical are the values tuned by eye on the demo's 16:9 stage;
// Michelle has no tuned value yet (she starts on Amina's). While tuning, ?scale=1.3&ax=0&ay=-0.1 on the room's address overrides all three for that visit.
const DEFAULT_TRANSFORMS: Record<SeatRole, Transform> = {
  hr: { x: 0.01, y: -0.1, scale: 1.32 },
  technical: { x: 0.02, y: -0.32, scale: 1.45 },
  michelle: { x: 0.01, y: -0.1, scale: 1.32 },
};
// The defaults were tuned in a wide 16:9 box. The SDK fits the avatar to the box's HEIGHT, so in a squarer tile (the interview room's Amina and Wayne tiles are about
// 1.2 : 1) the same scale shows a far bigger face — seen live 2026-10-06, only foreheads in frame. So the default scale is shrunk by how much squarer the tile is than 16:9.
// An explicit ?scale= override is used exactly as given.
function transformFor(role: SeatRole, stage: HTMLElement | null): Transform {
  try {
    const q = new URLSearchParams(window.location.search);
    const scale = parseFloat(q.get('scale') ?? '');
    if (!Number.isFinite(scale) || scale < 0.2 || scale > 3) {
      const d = DEFAULT_TRANSFORMS[role];
      const w = stage?.clientWidth ?? 0, h = stage?.clientHeight ?? 0;
      const factor = w > 0 && h > 0 ? Math.min(1, (w / h) / (16 / 9)) : 1;
      return { ...d, scale: d.scale * factor };
    }
    const n = (k: string) => { const v = parseFloat(q.get(k) ?? ''); return Number.isFinite(v) ? Math.max(-2, Math.min(2, v)) : 0; };
    return { x: n('ax'), y: n('ay'), scale };
  } catch { return DEFAULT_TRANSFORMS[role]; }
}

// Framing is measured and fitted to each tile automatically; ?scale= (with &ax= &ay=) on the room's address switches that off and uses the numbers given.
const hasManualFraming = () => { try { return Number.isFinite(parseFloat(new URLSearchParams(window.location.search).get('scale') ?? '')); } catch { return false; } };

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
) {
  const inner = useSpatiusAvatarSession(stageRef);
  const { connect: innerConnect, speak: innerSpeak, interrupt, disconnect } = inner;

  const connect = useCallback(async (): Promise<void> => {
    // The room fetches its avatar settings on mount; a very early connect waits briefly for them rather than failing.
    for (let i = 0; i < 30 && !cfgRef.current; i++) await new Promise(r => setTimeout(r, 100));
    const id = cfgRef.current?.spatius?.[role];
    if (!id) throw new Error(`no Spatius avatar for ${role}`);
    try {
      await Promise.race([
        innerConnect(id, getInterviewTicket() ?? '', transformFor(role, stageRef.current), INTERVIEW_TOKEN_PATH, !hasManualFraming()),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('spatius connect timed out')), CONNECT_LIMIT_MS)),
      ]);
    } catch (e) {
      void disconnect(); // a timed-out attempt must not finish later as a ghost, billed session
      onFailed(role);
      throw e;
    }
  }, [cfgRef, role, stageRef, innerConnect, disconnect, onFailed]);

  const speak = useCallback((text: string, speakRole: SeatRole, onSpeakStarted?: () => void) => innerSpeak(text, speakRole, onSpeakStarted), [innerSpeak]);
  const noop = useCallback(() => { /* Spatius has no listening pose */ }, []);
  const setVideoEl = useCallback((_el: HTMLVideoElement | null) => { /* no <video>: the face is drawn into the seat's stage <div> */ }, []);

  return useMemo(() => ({
    status: inner.status as SpatiusStatus,
    avatarPoseState: null as string | null,
    poster: inner.poster,
    connect, disconnect, speak,
    startListening: noop, stopListening: noop,
    interrupt, setVideoEl,
  }), [inner.status, inner.poster, connect, disconnect, speak, noop, interrupt, setVideoEl]);
}
