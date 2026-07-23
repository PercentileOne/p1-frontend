const DID_KEY = import.meta.env.VITE_DID_API_KEY as string | undefined;
const DID_BASE = 'https://api.d-id.com';

export const didConfigured = !!DID_KEY;

// Stock presenter images — swap for real photos of Sarah & James later
const PRESENTER_IMAGES = {
  hr: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
  technical: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
};

// D-ID voice IDs (Microsoft Neural TTS — matches our ElevenLabs personas)
const DID_VOICES = {
  hr: 'en-GB-SoniaNeural',
  technical: 'en-GB-RyanNeural',
};

interface TalkResult {
  videoUrl: string;
  role: 'hr' | 'technical';
}

async function didFetch(path: string, options: RequestInit = {}) {
  return fetch(`${DID_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${DID_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
}

async function pollTalk(id: string, maxAttempts = 20): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const res = await didFetch(`/talks/${id}`);
    const data = await res.json() as { status: string; result_url?: string };
    if (data.status === 'done' && data.result_url) return data.result_url;
    if (data.status === 'error') throw new Error('D-ID render failed');
  }
  throw new Error('D-ID timed out');
}

export async function createTalk(text: string, role: 'hr' | 'technical'): Promise<TalkResult> {
  if (!DID_KEY) throw new Error('D-ID not configured');

  const body = {
    source_url: PRESENTER_IMAGES[role],
    script: {
      type: 'text',
      input: text,
      provider: {
        type: 'microsoft',
        voice_id: DID_VOICES[role],
      },
    },
    config: { fluent: true, pad_audio: 0 },
  };

  const res = await didFetch('/talks', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`D-ID create failed: ${res.status}`);
  const data = await res.json() as { id: string };
  const videoUrl = await pollTalk(data.id);
  return { videoUrl, role };
}
