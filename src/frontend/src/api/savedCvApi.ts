// The CV a candidate used last time, kept on their account so it does not have to be uploaded again (2026-10-04). All calls are best-effort: a failure
// simply means the person uploads or pastes their CV as before.
const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface SavedCv { fileName: string; text: string; updatedAt: string }

export async function getSavedCv(token: string): Promise<SavedCv | null> {
  try {
    const res = await fetch(`${API_BASE}/api/me/cv`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const j = await res.json() as { hasCv?: boolean; fileName?: string; text?: string; updatedAt?: string };
    return j.hasCv && j.text ? { fileName: j.fileName ?? 'My CV', text: j.text, updatedAt: j.updatedAt ?? '' } : null;
  } catch { return null; }
}

export async function saveCv(token: string, fileName: string, text: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/me/cv`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fileName, text }),
    });
  } catch { /* the interview carries on without it */ }
}

export async function removeSavedCv(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/me/cv`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    return res.ok;
  } catch { return false; }
}
