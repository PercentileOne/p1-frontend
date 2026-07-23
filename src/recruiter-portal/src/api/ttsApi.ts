// Premium TTS via ElevenLabs — falls back to Web Speech API if keys not configured.
// Set these in .env.local (never commit keys):
//   VITE_ELEVENLABS_API_KEY=your_key_here
//   VITE_ELEVENLABS_VOICE_HR=voice_id_for_sarah
//   VITE_ELEVENLABS_VOICE_TECH=voice_id_for_james

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

const ELEVENLABS_MODEL = 'eleven_turbo_v2'; // lowest latency, high quality

async function speakElevenLabs(
  text: string,
  voiceId: string,
  onEnd: () => void,
): Promise<() => void> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
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
  const url  = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => { URL.revokeObjectURL(url); onEnd(); };
  audio.onerror = () => { URL.revokeObjectURL(url); onEnd(); };
  audio.play();
  return () => { audio.pause(); URL.revokeObjectURL(url); };
}

function speakWebSpeech(
  text: string,
  role: 'hr' | 'technical',
  onEnd: () => void,
): () => void {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(sanitiseForTTS(text));
  utterance.lang  = 'en-GB';
  utterance.rate  = 0.92;
  utterance.pitch = role === 'hr' ? 1.15 : 0.9;

  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find(v =>
      role === 'hr'
        ? v.name.match(/Hazel|Libby|Susan|Female|Zira/i)
        : v.name.match(/George|Ryan|Arthur|Male|David/i),
    ) ?? voices.find(v => v.lang.startsWith('en')) ?? null;
  if (preferred) utterance.voice = preferred;

  utterance.onend   = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
  return () => window.speechSynthesis.cancel();
}

/**
 * Speak text using ElevenLabs if configured, otherwise Web Speech API.
 * Returns a cancel function.
 */
export function speak(
  text: string,
  role: 'hr' | 'technical',
  onEnd: () => void,
): () => void {
  const voiceId = role === 'hr' ? VOICE_HR : VOICE_TECH;

  if (ELEVENLABS_KEY && voiceId) {
    let cancelled = false;
    let cancelAudio: (() => void) | null = null;

    speakElevenLabs(text, voiceId, () => {
      if (!cancelled) onEnd();
    })
      .then(cancel => { cancelAudio = cancel; })
      .catch(() => {
        // ElevenLabs failed — fall back to Web Speech
        if (!cancelled) speakWebSpeech(text, role, onEnd);
      });

    return () => {
      cancelled = true;
      cancelAudio?.();
    };
  }

  return speakWebSpeech(text, role, onEnd);
}

export const elevenLabsConfigured = Boolean(ELEVENLABS_KEY && VOICE_HR && VOICE_TECH);
