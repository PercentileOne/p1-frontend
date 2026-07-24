export const didConfigured = true; // key lives server-side in Azure App Settings

interface TalkResult {
  videoUrl: string;
  role: 'hr' | 'technical';
}

export async function createTalk(text: string, role: 'hr' | 'technical'): Promise<TalkResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch('/api/did-talk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, role }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`did-talk ${res.status}`);
    const { videoUrl } = await res.json() as { videoUrl: string };
    return { videoUrl, role };
  } finally {
    clearTimeout(timeout);
  }
}
