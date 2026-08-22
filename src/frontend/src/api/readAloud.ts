// Read-aloud for Learn module lessons — Web Speech API, not ElevenLabs.
// Reading whole lesson modules across "dozens of courses a month" would rack up real
// per-character cost on an exposed browser key with no natural cap, and ElevenLabs'
// buffer playback has no native pause/resume or true speed control anyway (would need
// manual chunking + fake-pause bookkeeping). Web Speech is free, has no length limit,
// and gives pause/resume/rate for free via the browser's own engine.
import { sanitiseForTTS } from './ttsApi';

export type ReadAloudState = 'idle' | 'playing' | 'paused' | 'done' | 'error';
export type ReadAloudGender = 'female' | 'male';

export interface ReadAloudPlayer {
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
  setGender: (gender: ReadAloudGender) => void;
}

// Matches the same name heuristics ttsApi.ts already uses for 'hr' vs 'technical' —
// consistent voice-picking convention across the app rather than a second one invented here.
const VOICE_PATTERNS: Record<ReadAloudGender, RegExp> = {
  female: /Hazel|Libby|Susan|Zira|Female/i,
  male:   /George|Ryan|Arthur|Male|David/i,
};

// Strips {{CODE_N}} / {{DIAGRAM_N}} markers and blank lines from lesson content — those
// render as separate structured components (code blocks, diagrams), and reading the raw
// marker text aloud would be meaningless ("open brace open brace CODE underscore one...").
export function extractReadableText(content: string): string {
  return content
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !/^\{\{(CODE|DIAGRAM)_\d+\}\}$/.test(l))
    .join(' ');
}

export function createReadAloudPlayer(
  fullText: string,
  onStateChange: (state: ReadAloudState) => void,
  initialGender: ReadAloudGender = 'female',
): ReadAloudPlayer {
  const synth = window.speechSynthesis;
  let rate = 1;
  let gender = initialGender;
  let offset = 0;       // char offset into fullText where the current utterance began
  let lastBoundary = 0; // char offset within the current (sanitised) utterance's remaining text

  function speakFrom(startOffset: number) {
    synth.cancel();
    offset = startOffset;
    lastBoundary = 0;
    const remaining = fullText.slice(startOffset);
    if (!remaining.trim()) { onStateChange('done'); return; }

    const u = new SpeechSynthesisUtterance(sanitiseForTTS(remaining));
    u.lang = 'en-GB';
    u.rate = rate;

    const voices = synth.getVoices();
    const preferred = voices.find(v => VOICE_PATTERNS[gender].test(v.name))
      ?? voices.find(v => v.lang.startsWith('en')) ?? null;
    if (preferred) u.voice = preferred;

    // Tracks roughly where we are so setRate() can restart from here at the new speed —
    // Web Speech has no live rate change on an in-flight utterance. Drift against the
    // ORIGINAL text is possible since phonetic substitutions can change length, but a
    // word or two of imprecision on a speed change is a fine tradeoff, not safety-critical.
    u.onboundary = (e) => { if (e.name === 'word') lastBoundary = e.charIndex; };
    u.onstart = () => onStateChange('playing');
    u.onend = () => onStateChange('done');
    u.onerror = () => onStateChange('error');
    u.onpause = () => onStateChange('paused');
    u.onresume = () => onStateChange('playing');

    synth.speak(u);
  }

  return {
    play() { speakFrom(0); },
    pause() { synth.pause(); },
    resume() { synth.resume(); },
    stop() { synth.cancel(); onStateChange('idle'); },
    setRate(r) {
      rate = r;
      if (synth.speaking) speakFrom(offset + lastBoundary);
    },
    setGender(g) {
      gender = g;
      if (synth.speaking) speakFrom(offset + lastBoundary);
    },
  };
}
