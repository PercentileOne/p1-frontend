// Premium TTS via ElevenLabs, proxied through the .NET backend — falls back to Web Speech API
// if the call fails. Used to call ElevenLabs directly from the browser with
// VITE_ELEVENLABS_API_KEY baked into the public bundle (same class of exposure as the OpenAI
// incident documented in CLAUDE.md, just never fixed for this call site until now). The backend
// now owns the API key AND the voice-id-per-role mapping — see Explain.Api's
// Features/Interviews/SpeakVoice — so this file no longer needs any ElevenLabs credentials or
// voice IDs at all, only which role is speaking.

// Phonetic substitutions so TTS pronounces tech terms correctly
const PHONETIC: [RegExp, string][] = [
  // Must run before generic rules that overlap
  [/\bASP\.NET\b/gi, 'A S P dot NET'],
  [/\b\.NET\b/g, 'dot NET'],
  [/\bNode\.js\b/gi, 'Node JS'],
  [/\bVue\.js\b/gi, 'Vue JS'],
  [/\bNext\.js\b/gi, 'Next JS'],
  [/\bNuxt\.js\b/gi, 'Nuxt JS'],
  [/\bExpress\.js\b/gi, 'Express JS'],
  [/\bReact\.js\b/gi, 'React JS'],
  [/\bC#\b/g, 'C Sharp'],
  [/\bC\+\+\b/g, 'C Plus Plus'],
  [/\bjQuery\b/gi, 'Jay Query'],
  [/\bSQL\b/g, 'sequel'],
  [/\bNoSQL\b/gi, 'No sequel'],
  [/\bCSS\b/g, 'C S S'],
  [/\bHTML\b/g, 'H T M L'],
  [/\bHTTPS?\b/g, 'H T T P S'],
  [/\bAPI\b/g, 'A P I'],
  [/\bAPIs\b/g, 'A P I s'],
  [/\bUI\b/g, 'U I'],
  [/\bUX\b/g, 'U X'],
  [/\bCI\/CD\b/gi, 'C I C D'],
  [/\bCI\b/g, 'C I'],
  [/\bCD\b/g, 'C D'],
  [/\bAWS\b/g, 'A W S'],
  [/\bGCP\b/g, 'G C P'],
  [/\bk8s\b/gi, 'Kubernetes'],
  [/\bkubectl\b/gi, 'kube control'],
  [/\bnpm\b/g, 'N P M'],
  [/\bSDK\b/g, 'S D K'],
  [/\bSDKs\b/g, 'S D K s'],
  [/\bSaaS\b/gi, 'sass'],
  [/\bPaaS\b/gi, 'pass'],
  [/\bIaaS\b/gi, 'I as a service'],
  [/\bORM\b/g, 'O R M'],
  [/\bREST\b/g, 'rest'],
  [/\bgRPC\b/gi, 'G R P C'],
  [/\bWebRTC\b/gi, 'Web R T C'],
  [/\bVSCode\b/gi, 'V S Code'],
  [/\bGitHub\b/gi, 'Git Hub'],
  [/\bGitLab\b/gi, 'Git Lab'],
  [/\bDevOps\b/gi, 'Dev Ops'],
  [/\bFinTech\b/gi, 'Fin Tech'],
  [/\bLLM\b/g, 'L L M'],
  [/\bLLMs\b/g, 'L L Ms'],
  [/\bRAG\b/g, 'R A G'],
  [/\bMLOps\b/gi, 'M L Ops'],
  [/&amp;/g, ' and '],
  [/&/g, ' and '],
  [/\+/g, ' plus '],
  [/\be\.g\./gi, 'for example'],
  [/\bi\.e\./gi, 'that is'],
];

function sanitiseForTTS(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PHONETIC) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'http://localhost:5130';

// Shared AudioContext — created once, reused across all TTS calls
let _audioCtx: AudioContext | null = null;
async function getAudioContext(): Promise<AudioContext> {
  if (!_audioCtx || _audioCtx.state === 'closed') _audioCtx = new AudioContext();
  if (_audioCtx.state === 'suspended') await _audioCtx.resume();
  return _audioCtx;
}

async function speakElevenLabs(
  text: string,
  role: 'hr' | 'technical' | 'mike',
  onEnd: () => void,
  volume = 1.0,
  onAnalyser?: (a: AnalyserNode) => void,
): Promise<() => void> {
  // Resume the AudioContext FIRST — as the very first await, before any network
  // call — so the browser still considers it part of the click that got us here.
  // Doing this after fetch()/blob() means the resume() often lands too late for
  // the browser to honour it as "within" the user gesture, silently staying
  // suspended and forcing the robotic Web Speech fallback.
  const ctx = await getAudioContext();
  if (ctx.state !== 'running') throw new Error('AudioContext suspended — no user gesture');

  // Backend picks the actual ElevenLabs voice id from `role` and holds the API key server-side
  // — see Explain.Api's Features/Interviews/SpeakVoice. Response is a cached blob SAS URL, not
  // raw audio, so this is a two-step fetch (ask for the clip, then fetch the clip).
  const genRes = await fetch(`${API_BASE}/interviews/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sanitiseForTTS(text), role }),
  });
  if (!genRes.ok) throw new Error(`Interview speak proxy error: ${genRes.status}`);
  const { audioUrl } = await genRes.json() as { audioUrl: string };

  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error(`Audio clip fetch error: ${res.status}`);

  const blob = await res.blob();
  if (blob.size < 100) throw new Error('ElevenLabs returned empty audio');
  const url  = URL.createObjectURL(blob);

  const arrayBuffer = await blob.arrayBuffer();
  URL.revokeObjectURL(url);
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;

  const gainNode = ctx.createGain();
  gainNode.gain.value = volume;

  if (onAnalyser) {
    try {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyser.connect(gainNode);
      onAnalyser(analyser);
    } catch {
      source.connect(gainNode);
    }
  } else {
    source.connect(gainNode);
  }
  gainNode.connect(ctx.destination);

  let ended = false;
  const done = () => { if (!ended) { ended = true; onEnd(); } };

  source.onended = done;

  // Safety timeout: duration + 5s so interview never hangs
  const safetyMs = (audioBuffer.duration * 1000) + 5000;
  const safetyTimer = setTimeout(done, safetyMs);
  source.onended = () => { clearTimeout(safetyTimer); done(); };

  source.start();

  return () => { ended = true; try { source.stop(); } catch { /* already ended */ } };
}

function speakWebSpeech(
  text: string,
  role: 'hr' | 'technical' | 'mike',
  onEnd: () => void,
  onWordBoundary?: (charIndex: number) => void,
): () => void {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sanitiseForTTS(text));
  utterance.lang  = 'en-GB';
  utterance.rate  = 0.92;
  utterance.pitch = role === 'hr' ? 1.15 : role === 'mike' ? 1.0 : 0.9;

  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find(v =>
      role === 'hr'
        ? v.name.match(/Hazel|Libby|Susan|Female|Zira/i)
        : role === 'mike'
        ? v.name.match(/George|Ryan|Arthur|Male|David/i)
        : v.name.match(/George|Ryan|Arthur|Male|David/i),
    ) ?? voices.find(v => v.lang.startsWith('en')) ?? null;
  if (preferred) utterance.voice = preferred;

  // Word boundary events — fire on each spoken word so callers can sync animations
  if (onWordBoundary) {
    utterance.onboundary = (e) => {
      if (e.name === 'word') onWordBoundary(e.charIndex);
    };
  }

  utterance.onend   = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
  return () => window.speechSynthesis.cancel();
}

/**
 * Speak text using ElevenLabs if configured, otherwise Web Speech API.
 * Returns a cancel function.
 * onAnalyser: called with a live AnalyserNode (ElevenLabs) or null (Web Speech).
 * onWordBoundary: called on each spoken word boundary (Web Speech only).
 */
export function speak(
  text: string,
  role: 'hr' | 'technical' | 'mike',
  onEnd: () => void,
  onAnalyser?: (a: AnalyserNode | null) => void,
): () => void {
  let cancelled = false;
  let cancelAudio: (() => void) | null = null;

  speakElevenLabs(text, role, () => {
    if (!cancelled) onEnd();
  }, role === 'technical' ? 0.5 : role === 'mike' ? 0.65 : 1.0, onAnalyser ? (a) => onAnalyser(a) : undefined)
    .then(cancel => { cancelAudio = cancel; })
    .catch((err) => {
      // Backend proxy or ElevenLabs itself failed — fall back to Web Speech. Logged so the
      // real cause is visible in the console instead of just "sounds robotic".
      console.warn(`[TTS] Neural voice failed for role "${role}", falling back to Web Speech:`, err);
      if (!cancelled) {
        onAnalyser?.(null);
        speakWebSpeech(text, role, onEnd);
      }
    });

  return () => {
    cancelled = true;
    cancelAudio?.();
  };
}

// Always true now — voice generation is proxied through the backend, which owns whether
// ElevenLabs is actually configured. See ttsApi.ts's frontend counterpart for the fuller note.
export const elevenLabsConfigured = true;
