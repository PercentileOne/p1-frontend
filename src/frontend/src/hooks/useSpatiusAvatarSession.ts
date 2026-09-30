import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarController, AvatarView } from '@spatius/avatarkit';
import { fetchAvatarAudioPcm } from '../api/liveAvatarApi';

// Spatius (on-device, audio-driven avatar) for one interviewer seat — the counterpart of useLiveAvatarSession (HeyGen) with the same shape
// where it matters (connect / speak / disconnect / interrupt), so a page can pick either at runtime. Added 2026-09-29 for the admin-switchable
// avatar provider (Features/PlatformSettings "Avatar provider"), first used by the public /try demo. Deliberately a SEPARATE hook: the HeyGen
// one is proven in production and full of hard-won ordering fixes — nothing here touches it.
//
// The SDK (and its WebAssembly renderer) is loaded with a dynamic import() the first time connect() runs, so visitors who never get a
// Spatius avatar never download it. The API key never reaches the browser: a short-lived session token comes from our backend, guarded by
// the demo ticket (see backend Features/TryOut "spatius-token").

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export type SpatiusStatus = 'idle' | 'connecting' | 'connected' | 'failed' | 'closed';
type Sdk = typeof import('@spatius/avatarkit');

let sdkInitialised = false;

async function prepareSdk(ticket: string): Promise<Sdk> {
  const [sdk, res] = await Promise.all([
    import('@spatius/avatarkit'),
    fetch(`${API_BASE}/api/tryout/spatius-token`, { method: 'POST', headers: { 'X-Interview-Ticket': ticket } }),
  ]);
  const body = await res.json().catch(() => ({})) as { sessionToken?: string; appId?: string; error?: string };
  if (!res.ok || !body.sessionToken || !body.appId) throw new Error(body.error ?? `spatius token failed (${res.status})`);
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

  const connect = useCallback((avatarId: string, ticket: string): Promise<void> => {
    if (ctrlRef.current) return Promise.resolve();
    if (connectingRef.current) return connectingRef.current;
    const attempt = (async () => {
      const mine = ++attemptRef.current;
      const cancelled = () => attemptRef.current !== mine;
      setStatus('connecting');
      try {
        const sdk = await prepareSdk(ticket);
        if (cancelled()) throw new Error('cancelled');
        const stage = stageRef.current;
        if (!stage) throw new Error('avatar stage not mounted');
        const avatar = await sdk.AvatarManager.shared.load(avatarId);
        if (cancelled()) throw new Error('cancelled');
        const view = new sdk.AvatarView(avatar, stage);
        const ctrl = view.controller;
        ctrl.onError = e => console.warn('[Spatius]', e.code, e.message);
        ctrl.onConversationState = s => {
          if (s === sdk.ConversationState.playing) { sawPlayingRef.current = true; setSpeaking(true); }
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
  const speak = useCallback(async (text: string, role: 'hr' | 'technical' | 'michelle'): Promise<void> => {
    const ctrl = ctrlRef.current;
    if (!ctrl) throw new Error('spatius avatar not connected');
    const pcm = await fetchAvatarAudioPcm(text, role);
    const seconds = pcm.byteLength / (24000 * 2);
    sawPlayingRef.current = false;
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
