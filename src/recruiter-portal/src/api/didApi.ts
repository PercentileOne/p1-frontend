export const didConfigured = true; // key lives server-side in Azure App Settings

interface TalkResult {
  videoUrl: string;
  role: 'hr' | 'technical' | 'agent';
}

async function pollTalk(talkId: string, attempts = 40): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const res = await fetch('/api/did-talk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ talkId }),
    });
    if (!res.ok) throw new Error(`poll ${res.status}`);
    const data = await res.json() as { status: string; videoUrl?: string };
    if (data.status === 'done' && data.videoUrl) return data.videoUrl;
    if (data.status === 'error') throw new Error('D-ID render failed');
  }
  throw new Error('D-ID timed out');
}

export async function createTalk(text: string, role: 'hr' | 'technical' | 'agent'): Promise<TalkResult> {
  // Phase 1: submit the job (returns immediately with talkId)
  const createRes = await fetch('/api/did-talk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, role }),
  });
  if (!createRes.ok) throw new Error(`did-talk create ${createRes.status}`);
  const { talkId } = await createRes.json() as { talkId: string };

  // Phase 2: poll from the browser until done (no function timeout risk)
  const videoUrl = await pollTalk(talkId);
  return { videoUrl, role };
}
