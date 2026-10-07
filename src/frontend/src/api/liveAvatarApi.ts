// Backend calls for the LiveAvatar integration — the API key lives server-side only
// (Features/Interviews/AvatarSession, AvatarAudio), same pattern as ttsApi.ts's relationship
// to ElevenLabs. This file never touches a LiveAvatar credential directly.

import { sanitiseForTTS, getTTSLanguage } from './ttsApi';
import { getInterviewTicket } from './entitlementsApi';
import { useAuthStore } from '../auth/authStore';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface AvatarSessionInfo {
  sessionId: string;
  sessionToken: string;
  isSandbox: boolean;
}

export async function fetchAvatarSessionToken(role: 'hr' | 'technical' | 'michelle'): Promise<AvatarSessionInfo> {
  const res = await fetch(`${API_BASE}/interviews/avatar-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(getInterviewTicket() ? { 'X-Interview-Ticket': getInterviewTicket()! } : {}) },
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
//
// It also says which service draws the three seats for THIS interview (the server rolls the dice once, so a whole interview stays on one
// provider). Any failure means HeyGen, the proven default. A signed-in admin can add ?force=spatius or ?force=heygen to the room's address to test either side.
export interface AvatarConfig {
  enabled: boolean;
  provider: 'heygen' | 'spatius';
  fallbackToHeygen: boolean;
  spatius: { hr: string; technical: string; michelle: string } | null;
  // Uploaded background pictures for the three seats (from Admin > Interviewers), as full URLs; null/absent = use the picture files shipped with the page.
  backgrounds: { hr: string | null; technical: string | null; michelle: string | null } | null;
}
export async function fetchAvatarConfig(): Promise<AvatarConfig> {
  const heygen: AvatarConfig = { enabled: true, provider: 'heygen', fallbackToHeygen: true, spatius: null, backgrounds: null };
  try {
    const force = new URLSearchParams(window.location.search).get('force');
    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_BASE}/interviews/avatar-config${force === 'spatius' || force === 'heygen' ? `?force=${force}` : ''}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    if (!res.ok) return heygen;
    const cfg = await res.json() as Partial<AvatarConfig>;
    const sp = cfg.spatius;
    const full = (u: string | null | undefined) => (u && u.startsWith('/') ? `${API_BASE}${u}` : null);
    const spatiusOk = cfg.provider === 'spatius' && !!sp?.hr && !!sp?.technical && !!sp?.michelle;
    return {
      enabled: cfg.enabled !== false,
      provider: spatiusOk ? 'spatius' : 'heygen',
      fallbackToHeygen: cfg.fallbackToHeygen !== false,
      spatius: spatiusOk ? sp! : null,
      backgrounds: spatiusOk && cfg.backgrounds ? { hr: full(cfg.backgrounds.hr), technical: full(cfg.backgrounds.technical), michelle: full(cfg.backgrounds.michelle) } : null,
    };
  } catch {
    return heygen;
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
// Michelle (the debrief and the opening introduction) was a little quiet beside Amina and Wayne (Francis, 2026-10-05). Her clips get a bigger boost, limited to the
// loudest peak in the clip so the extra volume can never clip into distortion. Amina and Wayne are untouched.
const MICHELLE_BOOST = 2.2;

// PCM16 is the confirmed format end to end (ElevenLabs output_format=pcm_24000, see
// Features/Interviews/AvatarAudio/AvatarAudioHandler.cs's own comment) — safe to reinterpret the
// raw bytes as signed 16-bit samples directly. Clamped to avoid wraparound distortion on already-
// loud passages.
function boostPcm16(bytes: Uint8Array, gain: number, limitToPeak = false): Uint8Array {
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  const boosted = new Int16Array(samples.length);
  let g = gain;
  if (limitToPeak) {
    let peak = 0;
    for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
    if (peak > 0) g = Math.min(gain, 32000 / peak);
  }
  for (let i = 0; i < samples.length; i++) {
    boosted[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * g)));
  }
  return new Uint8Array(boosted.buffer);
}

// Fetches the raw PCM clip (see Features/Interviews/AvatarAudio), boosts it, and base64-encodes
// it — exactly the shape LiveAvatarSession.repeatAudio() expects. Chunked conversion, not
// String.fromCharCode(...bigArray), since that blows the call stack on anything more than a
// few seconds of 24kHz 16-bit audio (~48,000 bytes/sec).
export async function fetchAvatarAudioBase64(text: string, role: 'hr' | 'technical' | 'michelle'): Promise<string> {
  const genRes = await fetch(`${API_BASE}/interviews/avatar-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sanitiseForTTS(text), role, language: getTTSLanguage() }),
  });
  if (!genRes.ok) throw new Error(`avatar-audio proxy error: ${genRes.status}`);
  const { audioUrl } = await genRes.json() as { audioUrl: string };

  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`avatar-audio clip fetch error: ${audioRes.status}`);
  const bytes = role === 'michelle'
    ? boostPcm16(new Uint8Array(await audioRes.arrayBuffer()), MICHELLE_BOOST, true)
    : boostPcm16(new Uint8Array(await audioRes.arrayBuffer()), VOLUME_BOOST);

  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// Raw (un-boosted) PCM16 mono 24 kHz clip — same backend route as above, returned as bytes instead of base64.
// Added 2026-09-29 for the Spatius evaluation page (/dev/spatius-test); deliberately a separate function so the
// production HeyGen path above stays exactly as proven.
export async function fetchAvatarAudioPcm(text: string, role: 'hr' | 'technical' | 'michelle'): Promise<Uint8Array> {
  const genRes = await fetch(`${API_BASE}/interviews/avatar-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sanitiseForTTS(text), role, language: getTTSLanguage() }),
  });
  if (!genRes.ok) throw new Error(`avatar-audio proxy error: ${genRes.status}`);
  const { audioUrl } = await genRes.json() as { audioUrl: string };
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`avatar-audio clip fetch error: ${audioRes.status}`);
  return new Uint8Array(await audioRes.arrayBuffer());
}
