// Name Bank API client — typed wrapper for GET /name-greetings/{speaker}/{name}/{difficulty}.
// A 404 is an expected, silent cache miss (resolves to null), not an error — but any other
// non-OK status is a real failure and gets thrown, so a genuine backend problem never gets
// silently mistaken for "no clip yet."

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface ApiError { error: string; status: number }

export const nameGreetingsApi = {
  async get(token: string, speaker: string, name: string, difficulty: string): Promise<{ videoUrl: string } | null> {
    const res = await fetch(
      `${BASE}/name-greetings/${encodeURIComponent(speaker)}/${encodeURIComponent(name)}/${encodeURIComponent(difficulty)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw { error: text || res.statusText, status: res.status } satisfies ApiError;
    }
    return res.json() as Promise<{ videoUrl: string }>;
  },
};
