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

// Fetches the raw PCM clip (see Features/Interviews/AvatarAudio) and base64-encodes it —
// exactly the shape LiveAvatarSession.repeatAudio() expects. Chunked conversion, not
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
  const bytes = new Uint8Array(await audioRes.arrayBuffer());

  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
