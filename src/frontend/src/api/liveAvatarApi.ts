// Backend calls for the interviewers' live faces. HeyGen LiveAvatar was retired on 2026-10-11 (subscription cancelled); faces are drawn by Spatius, and every credential
// lives server-side (Features/Interviews/AvatarSession, AvatarAudio), same pattern as ttsApi.ts's relationship to ElevenLabs.

import { sanitiseForTTS, getTTSLanguage } from './ttsApi';
import { useAuthStore } from '../auth/authStore';
import { seatInterviewerId } from '../lib/seatInterviewers';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.theinterviewchair.com';

// The LiveAvatar kill switch — read once per room mount, before either seat attempts to
// connect. A failed fetch (network hiccup, backend blip) fails OPEN (enabled: true) rather
// than silently killing a working feature over a transient error; the actual off-switch is
// the Cosmos-backed admin setting, not this call's success/failure.
//
// It also says whether faces are drawn for THIS interview (the server rolls the dice once, so a whole interview stays one way). Any failure means no faces: the
// interviewers' photos and plain voices. A signed-in admin can add ?force=spatius to the room's address to test faces whatever the percentage is.
export interface AvatarConfig {
  enabled: boolean;
  provider: 'none' | 'spatius';
  spatius: { hr: string; technical: string; michelle: string } | null;
  // Uploaded background pictures for the three seats (from Admin > Interviewers), as full URLs; null/absent = use the picture files shipped with the page.
  backgrounds: { hr: string | null; technical: string | null; michelle: string | null } | null;
}
/**
 * ?force=spatius on any page address (for staff testing) is remembered for the rest of the browser tab's visit, because the app moves between screens that do
 * not carry the address's query along (setup screen to interview room). Without it a phone could never be switched to the new faces for a test.
 */
export function getForceProvider(): 'spatius' | null {
  try {
    const q = new URLSearchParams(window.location.search).get('force');
    if (q === 'spatius') { sessionStorage.setItem('tic.force', q); return q; }
    return sessionStorage.getItem('tic.force') === 'spatius' ? 'spatius' : null;
  } catch { return null; }
}

export async function fetchAvatarConfig(): Promise<AvatarConfig> {
  // A failed fetch means no faces for this interview (photos and plain voices), never a guess at a provider.
  const noFaces: AvatarConfig = { enabled: false, provider: 'none', spatius: null, backgrounds: null };
  try {
    const force = getForceProvider();
    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_BASE}/interviews/avatar-config${force === 'spatius' ? '?force=spatius' : ''}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    if (!res.ok) return noFaces;
    const cfg = await res.json() as Partial<AvatarConfig>;
    const sp = cfg.spatius;
    const full = (u: string | null | undefined) => (u && u.startsWith('/') ? `${API_BASE}${u}` : null);
    const spatiusOk = cfg.provider === 'spatius' && !!sp?.hr && !!sp?.technical && !!sp?.michelle;
    return {
      enabled: cfg.enabled !== false,
      provider: spatiusOk ? 'spatius' : 'none',
      spatius: spatiusOk ? sp! : null,
      backgrounds: spatiusOk && cfg.backgrounds ? { hr: full(cfg.backgrounds.hr), technical: full(cfg.backgrounds.technical), michelle: full(cfg.backgrounds.michelle) } : null,
    };
  } catch {
    return noFaces;
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
export function boostPcm16(bytes: Uint8Array, gain: number, limitToPeak = false): Uint8Array {
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

/**
 * The loudness of a Spatius face's voice (2026-10-12): the raw clip plays quietly, and the Voice Volume slider had no effect on faces at all (the slider only moved the
 * plain-voice path), so Francis could not turn a quiet interviewer up even at maximum. Gives the faces the same lift the old HeyGen path had (VOLUME_BOOST, and the bigger
 * MICHELLE_BOOST), scaled by the slider (0 = silent), and never past the point of clipping.
 */
export function loudenForFace(pcm: Uint8Array, role: 'hr' | 'technical' | 'michelle', volume: number): Uint8Array {
  const base = role === 'michelle' ? MICHELLE_BOOST : VOLUME_BOOST;
  return boostPcm16(pcm, base * Math.max(0, Math.min(1, volume)), true);
}

// Raw (un-boosted) PCM16 mono 24 kHz clip — same backend route as above, returned as bytes instead of base64.
// Added 2026-09-29 for the Spatius evaluation page (/dev/spatius-test); deliberately a separate function so the
// production HeyGen path above stays exactly as proven.
// interviewerId: speak in that interviewer's own voice and pace instead of whoever is in the seat (the picker's "Say hi" preview); the text is then spoken as written.
export async function fetchAvatarAudioPcm(text: string, role: 'hr' | 'technical' | 'michelle', interviewerId?: string): Promise<Uint8Array> {
  const genRes = await fetch(`${API_BASE}/interviews/avatar-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sanitiseForTTS(text, !interviewerId), role, language: getTTSLanguage(), interviewerId: interviewerId ?? seatInterviewerId(role) }),
  });
  if (!genRes.ok) throw new Error(`avatar-audio proxy error: ${genRes.status}`);
  const { audioUrl } = await genRes.json() as { audioUrl: string };
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`avatar-audio clip fetch error: ${audioRes.status}`);
  return new Uint8Array(await audioRes.arrayBuffer());
}
