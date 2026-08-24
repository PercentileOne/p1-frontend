// Read-aloud for Learn module lessons — real ElevenLabs voice via the .NET backend's
// /lessons/read-aloud proxy, not a client-side ElevenLabs call. The backend chunks and
// caches audio per (voice, text) in blob storage, so rereading the same lesson — by the
// same candidate or a different one — is served from cache instead of regenerated, which
// is what keeps this affordable for lesson-length text read repeatedly (unlike a one-off
// script such as the career guide).

import { useAuthStore } from '../auth/authStore';

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export type ReadAloudState = 'idle' | 'loading' | 'playing' | 'paused' | 'done' | 'error';
export type ReadAloudGender = 'female' | 'male';

export interface ReadAloudPlayer {
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: number) => void;
  setGender: (gender: ReadAloudGender) => void;
}

interface AudioChunk {
  text: string;
  audioUrl: string;
}

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

async function fetchChunks(text: string, gender: ReadAloudGender, signal: AbortSignal): Promise<AudioChunk[]> {
  // LearnPanel only renders behind the /dashboard RequirePermission gate, so a token is
  // always present here — read non-reactively via getState() since this isn't a component.
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/lessons/read-aloud`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text, gender }),
    signal,
  });
  if (!res.ok) throw new Error(`read-aloud failed: ${res.status}`);
  const data = await res.json() as { chunks: AudioChunk[] };
  return data.chunks;
}

export function createReadAloudPlayer(
  fullText: string,
  onStateChange: (state: ReadAloudState) => void,
  initialGender: ReadAloudGender = 'female',
): ReadAloudPlayer {
  let audio: HTMLAudioElement | null = null;
  let chunks: AudioChunk[] = [];
  let index = 0;
  let rate = 1;
  let gender = initialGender;
  let generation = 0;         // bumped on stop/gender-change so stale async work is a no-op
  let abortController: AbortController | null = null;
  let currentState: ReadAloudState = 'idle';

  function emit(state: ReadAloudState) {
    currentState = state;
    onStateChange(state);
  }

  function teardownAudio() {
    if (!audio) return;
    audio.onended = null;
    audio.onerror = null;
    audio.onplay = null;
    audio.onpause = null;
    audio.pause();
    audio = null;
  }

  function playChunk(i: number) {
    if (i >= chunks.length) { emit('done'); return; }
    index = i;
    teardownAudio();
    audio = new Audio(chunks[i].audioUrl);
    audio.playbackRate = rate;
    audio.onplay = () => emit('playing');
    audio.onpause = () => { if (audio && !audio.ended) emit('paused'); };
    audio.onended = () => playChunk(i + 1);
    audio.onerror = () => emit('error');
    audio.play().catch(() => emit('error'));
  }

  async function start(fromIndex: number) {
    const myGeneration = ++generation;
    abortController?.abort();

    if (chunks.length === 0) {
      abortController = new AbortController();
      emit('loading');
      try {
        chunks = await fetchChunks(fullText, gender, abortController.signal);
      } catch (err) {
        if (myGeneration !== generation) return; // superseded by a later stop()/setGender()
        if ((err as Error).name === 'AbortError') return;
        console.error('[ReadAloud] failed to load voice audio:', err);
        emit('error');
        return;
      }
    }

    if (myGeneration !== generation) return;
    playChunk(fromIndex);
  }

  return {
    play() { start(0); },
    pause() { audio?.pause(); },
    resume() { audio?.play().catch(() => emit('error')); },
    stop() {
      generation++;
      abortController?.abort();
      teardownAudio();
      emit('idle');
    },
    setRate(r) {
      rate = r;
      if (audio) audio.playbackRate = r; // live — no restart needed, unlike Web Speech
    },
    setGender(g) {
      if (g === gender) return;
      const wasActive = currentState === 'playing' || currentState === 'paused';
      const resumeAt = index; // chunk boundaries don't depend on voice, so the same index lines up
      gender = g;
      chunks = []; // different voice → different cache keys, needs a fresh fetch
      generation++;
      abortController?.abort();
      teardownAudio();
      if (wasActive) start(resumeAt); else emit('idle');
    },
  };
}
