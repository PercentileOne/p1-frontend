// Premium TTS via ElevenLabs — falls back to Web Speech API if keys not configured.
// Set these in .env.local (never commit keys):
//   VITE_ELEVENLABS_API_KEY=your_key_here
//   VITE_ELEVENLABS_VOICE_HR=voice_id_for_sarah
//   VITE_ELEVENLABS_VOICE_TECH=voice_id_for_james
//   VITE_ELEVENLABS_VOICE_MIKE=voice_id_for_mike (agent debrief)

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

const ELEVENLABS_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;
const VOICE_HR       = import.meta.env.VITE_ELEVENLABS_VOICE_HR as string | undefined;
const VOICE_TECH     = import.meta.env.VITE_ELEVENLABS_VOICE_TECH as string | undefined;
const VOICE_MIKE     = import.meta.env.VITE_ELEVENLABS_VOICE_MIKE as string | undefined;

const ELEVENLABS_MODEL = 'eleven_turbo_v2'; // lowest latency, high quality

// Shared AudioContext — created once, reused across all TTS calls
let _audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') _audioCtx = new AudioContext();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

async function speakElevenLabs(
  text: string,
  voiceId: string,
  onEnd: () => void,
  volume = 1.0,
  onAnalyser?: (a: AnalyserNode) => void,
): Promise<() => void> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: sanitiseForTTS(text),
        model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );

  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`);

  const blob = await res.blob();
  if (blob.size < 100) throw new Error('ElevenLabs returned empty audio');
  const url  = URL.createObjectURL(blob);

  const audio = new Audio();
  // crossOrigin only needed when wiring an AudioContext analyser — setting it on
  // a blob URL without an analyser can cause playback to fail in some browsers
  if (onAnalyser) audio.crossOrigin = 'anonymous';
  audio.src = url;
  audio.volume = volume;

  // Wire real-time frequency analyser if caller wants it
  if (onAnalyser) {
    try {
      const ctx = getAudioContext();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;              // 32 bins — fast, plenty for 10 bars
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      onAnalyser(analyser);
    } catch {
      // Web Audio unavailable — WaveformBars will use simulation fallback
    }
  }

  let ended = false;
  const done = () => { if (!ended) { ended = true; URL.revokeObjectURL(url); onEnd(); } };

  audio.onended = done;
  audio.onerror = done;

  // Safety: force-advance after duration + 5s so interview never hangs
  audio.onloadedmetadata = () => {
    const safetyMs = (isFinite(audio.duration) ? audio.duration * 1000 : 60000) + 5000;
    setTimeout(done, safetyMs);
  };

  // Await play() — if browser blocks autoplay this throws, causing speak()'s
  // .catch() to trigger Web Speech fallback instead of silently doing nothing.
  await audio.play();

  return () => { ended = true; audio.pause(); URL.revokeObjectURL(url); };
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
  const voiceId = role === 'hr' ? VOICE_HR : role === 'mike' ? (VOICE_MIKE ?? VOICE_TECH) : VOICE_TECH;

  if (ELEVENLABS_KEY && voiceId) {
    let cancelled = false;
    let cancelAudio: (() => void) | null = null;

    speakElevenLabs(text, voiceId, () => {
      if (!cancelled) onEnd();
    }, role === 'technical' ? 0.5 : role === 'mike' ? 0.65 : 1.0, onAnalyser ? (a) => onAnalyser(a) : undefined)
      .then(cancel => { cancelAudio = cancel; })
      .catch(() => {
        // ElevenLabs failed — fall back to Web Speech
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

  // Web Speech path — no real analyser, pass null so caller uses simulation
  onAnalyser?.(null);
  return speakWebSpeech(text, role, onEnd);
}

export const elevenLabsConfigured = Boolean(ELEVENLABS_KEY && VOICE_HR && VOICE_TECH);
