// Dashboard "Your Profile Buzz" card — real profile views, real shared-interview views, and
// real likes for the signed-in candidate's own profile. See backend Features/Profile/Endpoint.cs
// (GET /profile/engagement) for how each number is actually counted.

const API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://api.explain.global';

export interface ProfileEngagement {
  profileViews: number;
  interviewViews: number;
  likes: number;
}

export async function getProfileEngagement(token: string): Promise<ProfileEngagement> {
  const res = await fetch(`${API_BASE}/profile/engagement`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to load profile engagement: ${res.status}`);
  return res.json();
}
