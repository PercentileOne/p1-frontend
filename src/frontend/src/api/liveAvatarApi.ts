// Backend calls for the LiveAvatar integration — the API key lives server-side only
// (Features/Interviews/AvatarSession, AvatarAudio), same pattern as ttsApi.ts's relationship
// to ElevenLabs. This file never touches a LiveAvatar credential directly.

import { sanitiseForTTS } from './ttsApi';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface AvatarSessionInfo {
  sessionId: string;
  sessionToken: string;
  isSandbox: boolean;
}

export async function fetchAvatarSessionToken(role: 'hr' | 'technical'): Promise<AvatarSessionInfo> {
  const res = await fetch(`${API_BASE}/interviews/avatar-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(`avatar-session failed: HTTP ${res.status}`);
  const data = await res.json() as { sessionId: string; sessionToken: string; isSandbox: boolean };
  return { sessionId: data.sessionId, sessionToken: data.sessionToken, isSandbox: data.isSandbox };
}

// The LiveAvatar kill switch — read once per room mount, before either seat attempts to
// connect. A failed fetch (network hiccup, backend blip) fails OPEN (enabled: true) rather
// than silently killing a working feature over a transient error; the actual off-switch is
// the Cosmos-backed admin setting, not this call's success/failure.
export async function fetchAvatarConfig(): Promise<{ enabled: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/interviews/avatar-config`);
    if (!res.ok) return { enabled: true };
    return await res.json() as { enabled: boolean };
  } catch {
    return { enabled: true };
  }
}

// LiveAvatar's raw WebRTC playback plays noticeably quieter than ElevenLabs' own generated
// clips at native level (reported live 2026-09-13). Applied here, to the raw PCM samples
// themselves, rather than as a destination-side Web Audio gain node — the native <video>
// element is now the ONLY thing that ever plays this audio (see useLiveAvatarSession.ts), and
// boosting the actual bytes we send means it plays back already-loud with zero Web Audio API
// involvement in the audible path at all. Same numeric boost the old destination-side gain node
// used to apply.
const VOLUME_BOOST = 1.6;

// PCM16 is the confirmed format end to end (ElevenLabs output_format=pcm_24000, see
// Features/Interviews/AvatarAudio/AvatarAudioHandler.cs's own comment) — safe to reinterpret the
// raw bytes as signed 16-bit samples directly. Clamped to avoid wraparound distortion on already-
// loud passages.
function boostPcm16(bytes: Uint8Array, gain: number): Uint8Array {
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  const boosted = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    boosted[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * gain)));
  }
  return new Uint8Array(boosted.buffer);
}

// Fetches the raw PCM clip (see Features/Interviews/AvatarAudio), boosts it, and base64-encodes
// it — exactly the shape LiveAvatarSession.repeatAudio() expects. Chunked conversion, not
// String.fromCharCode(...bigArray), since that blows the call stack on anything more than a
// few seconds of 24kHz 16-bit audio (~48,000 bytes/sec).
export async function fetchAvatarAudioBase64(text: string, role: 'hr' | 'technical' | 'mike'): Promise<string> {
  const genRes = await fetch(`${API_BASE}/interviews/avatar-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sanitiseForTTS(text), role }),
  });
  if (!genRes.ok) throw new Error(`avatar-audio proxy error: ${genRes.status}`);
  const { audioUrl } = await genRes.json() as { audioUrl: string };

  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`avatar-audio clip fetch error: ${audioRes.status}`);
  const bytes = boostPcm16(new Uint8Array(await audioRes.arrayBuffer()), VOLUME_BOOST);

  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
