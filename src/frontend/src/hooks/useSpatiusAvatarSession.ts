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

// stageRef: created by the page and attached to the (always-mounted) element the avatar should be drawn into.
export function useSpatiusAvatarSession(stageRef: React.RefObject<HTMLDivElement | null>) {
  const [status, setStatus] = useState<SpatiusStatus>('idle');
  // True while the avatar is actually playing speech (drives the page's "getting ready" overlay).
  const [speaking, setSpeaking] = useState(false);
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
    const w = waiterRef.current; waiterRef.current = null; w?.();
  }, []);

  const connect = useCallback((avatarId: string, ticket: string, transform?: { x: number; y: number; scale: number }, tokenPath: string = DEMO_TOKEN_PATH): Promise<void> => {
    if (ctrlRef.current) return Promise.resolve();
    if (connectingRef.current) return connectingRef.current;
    const attempt = (async () => {
      const mine = ++attemptRef.current;
      const cancelled = () => attemptRef.current !== mine;
      setStatus('connecting');
      try {
        const sdk = await prepareSdk(ticket, tokenPath);
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
        if (transform) {
          const apply = () => {
            if (viewRef.current !== view) { cleanup(); return; }
            try {
              view.avatarTransform = { x: transform.x, y: transform.y, scale: transform.scale + 0.01 };
              view.avatarTransform = transform;
            } catch { /* ignore */ }
          };
          const timer = window.setInterval(apply, 700);
          const onResize = () => apply();
          window.addEventListener('resize', onResize);
          const cleanup = () => { window.clearInterval(timer); window.removeEventListener('resize', onResize); };
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

  return { status, speaking, connect, speak, interrupt, disconnect };
}
