import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarController, AvatarView } from '@spatius/avatarkit';
import { fetchAvatarAudioPcm } from '../api/liveAvatarApi';
import { useAuthStore } from '../auth/authStore';

// Spatius (on-device, audio-driven avatar) for one interviewer seat — the counterpart of useLiveAvatarSession (HeyGen) with the same shape
// where it matters (connect / speak / disconnect / interrupt), so a page can pick either at runtime. Added 2026-09-29 for the admin-switchable
// avatar provider (Features/PlatformSettings "Avatar provider"), first used by the public /try demo. Deliberately a SEPARATE hook: the HeyGen
// one is proven in production and full of hard-won ordering fixes — nothing here touches it.
//
// The SDK (and its WebAssembly renderer) is loaded with a dynamic import() the first time connect() runs, so visitors who never get a
// Spatius avatar never download it. The API key never reaches the browser: a short-lived session token comes from our backend, guarded by
// the demo ticket (see backend Features/TryOut "spatius-token"). Full interviews use the same hook through a thin per-seat adapter
// (useSpatiusSeat) and the interview-ticket route (backend Features/Interviews/AvatarSession "spatius-token").

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export type SpatiusStatus = 'idle' | 'connecting' | 'connected' | 'failed' | 'closed';
type Sdk = typeof import('@spatius/avatarkit');

let sdkInitialised = false;

export const DEMO_TOKEN_PATH = '/api/tryout/spatius-token';
export const INTERVIEW_TOKEN_PATH = '/interviews/spatius-token';

// A full interview connects a seat before every question, so a fresh token per connect would burn the daily per-address allowance for no reason.
// Tokens last 20 minutes server-side; one is reused for up to 12.
const TOKEN_REUSE_MS = 12 * 60 * 1000;
const tokenCache = new Map<string, { sessionToken: string; appId: string; at: number }>();

async function prepareSdk(ticket: string, tokenPath: string): Promise<Sdk> {
  const cached = tokenCache.get(tokenPath);
  const fresh = cached && Date.now() - cached.at < TOKEN_REUSE_MS ? cached : null;
  const authToken = useAuthStore.getState().token;
  const [sdk, body] = await Promise.all([
    import('@spatius/avatarkit'),
    fresh ? Promise.resolve(fresh) : (async () => {
      const res = await fetch(`${API_BASE}${tokenPath}`, { method: 'POST', headers: { 'X-Interview-Ticket': ticket, ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) } });
      const b = await res.json().catch(() => ({})) as { sessionToken?: string; appId?: string; error?: string };
      if (!res.ok || !b.sessionToken || !b.appId) throw new Error(b.error ?? `spatius token failed (${res.status})`);
      tokenCache.set(tokenPath, { sessionToken: b.sessionToken, appId: b.appId, at: Date.now() });
      return b as { sessionToken: string; appId: string };
    })(),
  ]);
  if (!sdkInitialised) {
    // ElevenLabs avatar audio is PCM16 mono 24 kHz, so the SDK is told that up front — no resampling.
    await sdk.AvatarSDK.initialize(body.appId, { drivingServiceMode: sdk.DrivingServiceMode.direct, audioFormat: { channelCount: 1, sampleRate: 24000 }, logLevel: sdk.LogLevel.error });
    sdkInitialised = true;
  }
  sdk.AvatarSDK.setSessionToken(body.sessionToken);
  return sdk;
}

type Transform = { x: number; y: number; scale: number };

// A still of each avatar's face (the SDK can export what it has drawn), captured once shortly after a seat first renders and kept for the rest of the visit. The
// interview room shows it while a seat is disconnected between questions, so a seat never falls back to the old HeyGen-era photo underneath.
const posterCache = new Map<string, string>();

// Auto-fit (2026-10-06): one hand-tuned zoom can't suit every tile shape, because the SDK fits the avatar to the tile's WIDTH in a narrow tile and to its HEIGHT in a
// wide one (measured from the live room's logs). So instead of guessing, ask the avatar where it is drawn (getBoundingRect) at a small scale, work out how its size and
// position respond to scale / x / y (all linear), and solve for: head and shoulders filling the tile from the top, bust always reaching the bottom edge (no visible
// cut-off), a head about 45% of the tile's height, centred. Returns null until the avatar has rendered a frame.
function computeFit(view: AvatarView, stage: HTMLElement, factor = 1): Transform | null {
  const W = stage.clientWidth, H = stage.clientHeight;
  if (!W || !H) return null;
  const s0 = 0.3;
  const measure = (x: number, y: number) => { view.avatarTransform = { x, y, scale: s0 }; return view.getBoundingRect(); };
  const r1 = measure(0, 0), r2 = measure(0, -0.2), r3 = measure(0.2, 0);
  if (!r1 || !r2 || !r3 || r1.width <= 0 || r1.height <= 0) return null;
  const hr = r1.height / r1.width; // bust height : width
  const cy1 = r1.y + r1.height / 2, cy2 = r2.y + r2.height / 2;
  const cx1 = r1.x + r1.width / 2, cx3 = r3.x + r3.width / 2;
  const ky = (cy2 - cy1) / (0.2 * H);   // vertical pixels moved per unit of -y, as a fraction of H
  const kx = (cx3 - cx1) / 0.2;         // horizontal pixels moved per unit of x
  const a = (cy1 - H / 2) / s0;         // the avatar's own vertical offset from centre, per unit scale
  const b = (cx1 - W / 2) / s0;         // and horizontal
  if (!Number.isFinite(ky) || !Number.isFinite(kx) || Math.abs(ky) < 0.05 || Math.abs(kx) < 1) return null;
  // 0.8 = zoomed out a further 20% (Francis, 2026-10-06: "needs to zoom out another 20% at least"). The bottom of the bust may then show, so the room fades the
  // tile's lower edge into the backdrop.
  // `factor` is the per-interviewer zoom (1 = as measured; smaller = further back), set by the room from what looks right for each face.
  const targetW = factor * 0.8 * Math.max(H / hr, Math.min(0.72 * W, 0.95 * H));
  const scale = s0 * targetW / r1.width;
  const x = -(b * scale) / kx;
  // Where the bust sits: its bottom edge on the tile's bottom edge (so no gap shows under the shoulders), which leaves headroom above when the bust is shorter than the
  // tile; if it is taller than the tile, the top of the head is at the top instead.
  const bustH = hr * targetW;
  const top = Math.max(0, H - bustH);
  const y = -(((top + bustH / 2) - H / 2 - a * scale) / (ky * H));
  const fit = { x, y, scale };
  try { console.info('[Spatius] fit ' + JSON.stringify({ stage: { W, H }, r1, r2, r3, hr, ky, kx, a, b, targetW, fit })); } catch { /* diagnostics only */ }
  return Number.isFinite(x + y + scale) && scale > 0.05 && scale < 4 ? fit : null;
}

// stageRef: created by the page and attached to the (always-mounted) element the avatar should be drawn into.
export function useSpatiusAvatarSession(stageRef: React.RefObject<HTMLDivElement | null>) {
  const [status, setStatus] = useState<SpatiusStatus>('idle');
  // True while the avatar is actually playing speech (drives the page's "getting ready" overlay).
  const [speaking, setSpeaking] = useState(false);
  const [poster, setPoster] = useState<string | null>(null);
  // True once the face has drawn its first frame (not merely connected); the room uses it to bring the background in together with the face.
  const [rendered, setRendered] = useState(false);
  const viewRef = useRef<AvatarView | null>(null);
  const ctrlRef = useRef<AvatarController | null>(null);
  // While speak() is waiting for the clip to finish playing: the resolver, and whether playback has actually started yet
  // (the controller also reports "idle" before it starts, which must not be mistaken for "finished").
  const waiterRef = useRef<(() => void) | null>(null);
  // Called once when the current line genuinely starts playing (the room uses it as its "speech has started" signal).
  const startedRef = useRef<(() => void) | null>(null);
  const sawPlayingRef = useRef(false);
  const connectingRef = useRef<Promise<void> | null>(null);
  // Bumped by disconnect(): a connect() that's still in flight when the page gives up on it (timeout) notices and tears itself down
  // instead of finishing later as a ghost, billed session.
  const attemptRef = useRef(0);

  const release = useCallback(() => {
    try { ctrlRef.current?.close(); } catch { /* already closed */ }
    try { viewRef.current?.dispose(); } catch { /* already disposed */ }
    ctrlRef.current = null; viewRef.current = null;
    setRendered(false);
    const w = waiterRef.current; waiterRef.current = null; w?.();
  }, []);

  const connect = useCallback((avatarId: string, ticket: string, transform?: { x: number; y: number; scale: number }, tokenPath: string = DEMO_TOKEN_PATH, autoFit: number | false = false): Promise<void> => {
    if (ctrlRef.current) return Promise.resolve();
    if (connectingRef.current) return connectingRef.current;
    const attempt = (async () => {
      const mine = ++attemptRef.current;
      const cancelled = () => attemptRef.current !== mine;
      setStatus('connecting');
      try {
        const sdk = await prepareSdk(ticket, tokenPath);
        if (cancelled()) throw new Error('cancelled');
        // The interview room mounts a seat's tile a moment after the seat is asked to connect (Michelle's only exists during the briefing), so wait briefly for it.
        for (let i = 0; i < 40 && !stageRef.current && !cancelled(); i++) await new Promise(r => setTimeout(r, 100));
        if (cancelled()) throw new Error('cancelled');
        const stage = stageRef.current;
        if (!stage) throw new Error('avatar stage not mounted');
        const avatar = await sdk.AvatarManager.shared.load(avatarId);
        if (cancelled()) throw new Error('cancelled');
        const view = new sdk.AvatarView(avatar, stage);
        // Framing: the SDK's own zoom/position control (scale 1 = its default, smaller = further back). Applied now and again on the first rendered frame,
        // because the view finishes initialising asynchronously and an early value can be ignored.
        if (transform) {
          try { view.avatarTransform = transform; } catch { /* not ready yet — onFirstRendering below applies it */ }
          view.onFirstRendering = () => { try { view.avatarTransform = transform; } catch { /* ignore */ } };
        }
        const known = posterCache.get(avatarId);
        if (known) setPoster(known);
        // A still of the face for the room to show between questions. Re-taken after the framing settles, and again whenever the stage changes shape, so it
        // always matches what the live face looked like (newest still wins).
        let stillTimer = 0;
        const scheduleStill = () => {
          window.clearTimeout(stillTimer);
          stillTimer = window.setTimeout(async () => {
            if (viewRef.current !== view) return;
            try { const blob = await view.exportBitmap(); if (blob && viewRef.current === view) { const url = URL.createObjectURL(blob); posterCache.set(avatarId, url); setPoster(url); } } catch { /* no still — the room shows the plain backdrop */ }
          }, 1800);
        };
        // Framing diagnostics (Francis, 2026-10-06: faces vanished in the interview room after a framing change). Logged to the browser console only.
        const t0 = performance.now();
        const diag = (when: string) => { try { console.info(`[Spatius] framing ${when} ${avatarId.slice(0, 8)} ` + JSON.stringify({ stage: { w: stage.clientWidth, h: stage.clientHeight }, transform: view.avatarTransform, rect: view.getBoundingRect(), ms: Math.round(performance.now() - t0) })); } catch (e) { console.info('[Spatius] framing', when, 'unavailable', e); } };
        const firstRender = view.onFirstRendering;
        view.onFirstRendering = () => {
          try { firstRender?.(); } catch { /* ignore */ }
          setRendered(true);
          diag('first frame'); window.setTimeout(() => diag('+2s'), 2000);
          scheduleStill();
        };
        const ctrl = view.controller;
        ctrl.onError = e => console.warn('[Spatius]', e.code, e.message);
        ctrl.onConversationState = s => {
          if (s === sdk.ConversationState.playing) { sawPlayingRef.current = true; setSpeaking(true); const st = startedRef.current; startedRef.current = null; st?.(); }
          else if (s === sdk.ConversationState.idle) { setSpeaking(false); if (sawPlayingRef.current) { const w = waiterRef.current; waiterRef.current = null; w?.(); } }
        };
        viewRef.current = view; ctrlRef.current = ctrl;
        // On iPhones the browser can leave the sound system's start-up pending forever unless it happens inside a tap — a promise that
        // never settles. Give it a few seconds, then fail so the page can fall back (to HeyGen, then voice) instead of hanging.
        await Promise.race([
          ctrl.initializeAudioContext(),
          new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('audio start timed out')), 5000)),
        ]);
        if (cancelled()) throw new Error('cancelled');
        await ctrl.start();
        if (cancelled()) throw new Error('cancelled');
        // The test page sets the framing AFTER the avatar is fully started and it works; set early it is ignored, and the SDK can also drop it (or reset
        // it on a window resize) while still REPORTING the value we set — so comparing against its getter is not a safe check (that was tried and
        // failed on a large window, 2026-09-30). Instead apply it unconditionally: first a tiny nudge away from the target so the SDK sees a real
        // change (a same-value set can be skipped), then the target. Repeat regularly, and immediately on any window resize.
        if (transform || autoFit) {
          // In auto-fit mode the framing is measured (computeFit) once the avatar has drawn a frame, and again after a window resize; until then the supplied
          // transform (if any) is used. The regular re-apply below always uses the latest measured value.
          let fitted: Transform | null = null;
          const refit = () => {
            if (!autoFit || viewRef.current !== view) return;
            try { fitted = computeFit(view, stage, autoFit || 1) ?? fitted; } catch { /* not ready — try again on the next tick */ }
          };
          const apply = () => {
            if (viewRef.current !== view) { cleanup(); return; }
            if (autoFit && !fitted) refit();
            const target = fitted ?? transform;
            if (!target) return;
            try {
              view.avatarTransform = { x: target.x, y: target.y, scale: target.scale + 0.01 };
              view.avatarTransform = target;
            } catch { /* ignore */ }
          };
          const timer = window.setInterval(apply, 700);
          let resizeTimer = 0;
          const onResize = () => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(() => { fitted = null; apply(); }, 150); };
          window.addEventListener('resize', onResize);
          // The seat connects while its tile is still hidden or a different shape (during the briefing), then the tile takes its real size: re-measure whenever
          // the stage's own size changes, not only when the window does, and take a fresh still once the new framing is in.
          let lastW = stage.clientWidth, lastH = stage.clientHeight;
          const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
            if (stage.clientWidth === lastW && stage.clientHeight === lastH) return;
            lastW = stage.clientWidth; lastH = stage.clientHeight;
            if (lastW > 0 && lastH > 0) { onResize(); scheduleStill(); }
          }) : null;
          ro?.observe(stage);
          const cleanup = () => { window.clearInterval(timer); window.clearTimeout(resizeTimer); window.removeEventListener('resize', onResize); ro?.disconnect(); };
          apply();
        }
        setStatus('connected');
      } catch (e) {
        // Only tear down what this attempt created — a newer attempt may own the refs by now.
        if (!cancelled()) release();
        else { try { viewRef.current?.dispose(); } catch { /* ignore */ } viewRef.current = null; ctrlRef.current = null; }
        setStatus('failed');
        throw e;
      } finally { connectingRef.current = null; }
    })();
    connectingRef.current = attempt;
    return attempt;
  }, [release, stageRef]);

  // Resolves when the avatar has finished saying the line (or a ceiling based on the clip's length, so a page can never hang).
  const speak = useCallback(async (text: string, role: 'hr' | 'technical' | 'michelle', onStarted?: () => void): Promise<void> => {
    const ctrl = ctrlRef.current;
    if (!ctrl) throw new Error('spatius avatar not connected');
    const pcm = await fetchAvatarAudioPcm(text, role);
    const seconds = pcm.byteLength / (24000 * 2);
    sawPlayingRef.current = false;
    startedRef.current = onStarted ?? null;
    await new Promise<void>(resolve => {
      const ceiling = window.setTimeout(resolve, seconds * 1000 + 4000);
      waiterRef.current = () => { window.clearTimeout(ceiling); resolve(); };
      ctrl.send(pcm.slice().buffer, true); // copy so the SDK owns its buffer; true = last chunk of this turn
    });
  }, []);

  const interrupt = useCallback(() => { try { ctrlRef.current?.interrupt(); } catch { /* nothing playing */ } }, []);

  const disconnect = useCallback(async () => {
    attemptRef.current++; // cancels any connect() still in flight
    release();
    setStatus(s => (s === 'idle' ? 'idle' : 'closed'));
  }, [release]);

  // Always release the (billed) session if the page goes away.
  useEffect(() => release, [release]);

  return { status, speaking, poster, rendered, connect, speak, interrupt, disconnect };
}
