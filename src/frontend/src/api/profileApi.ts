// ─────────────────────────────────────────────────────────────────────────────
// Profile API client — typed wrappers for the .NET backend's GET/PUT /profile and
// POST /profile/avatar, /profile/banner. Base URL resolves the same way authApi.ts
// does (VITE_EXPLAIN_API_URL, falling back to localhost:5130 for local dev) — this
// intentionally replaces ProfilePage.tsx's previous ad-hoc fetch, which fell back to
// the production API URL locally instead.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined)
  ?? 'http://localhost:5130';

export interface ProfileProject {
  id: string;
  title: string;
  status: 'current' | 'past' | 'future';
  description: string;
}

export interface BlockedUserRef {
  userId: string;
  name: string;
  blockedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  name: string;
  username: string;
  bio: string;
  jobRole?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  interests: string[];
  avatar?: string | null;
  banner?: string | null;
  location?: string | null;
  favouriteFilms: string[];
  projects: ProfileProject[];
  commentsEnabled: boolean;
  searchableByRecruiters: boolean;
  employmentTypePreference?: string | null;
  remotePreference?: string | null;
  bestScore?: number | null;
  country?: string | null;
  blockedUsers: BlockedUserRef[];
  phone?: string | null;
  lifeStage?: string | null;
  dreamRoleTitle?: string | null;
  dreamRoleIndustry?: string | null;
  dreamRoleSalary?: string | null;
  dreamRoleTimeline?: string | null;
  updatedAt: string;
  createdAt: string;
}

// Trimmed projection returned by GET /profile/{userId} for someone else's profile.
export interface PublicProfile {
  userId: string;
  name: string;
  username: string;
  bio: string;
  jobRole?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  interests: string[];
  avatar?: string | null;
  banner?: string | null;
  location?: string | null;
  commentsEnabled: boolean;
  employmentTypePreference?: string | null;
  remotePreference?: string | null;
  bestScore?: number | null;
  country?: string | null;
}

export type UpdateProfilePayload = Partial<{
  firstName: string; lastName: string; bio: string;
  jobRole: string; jobTitle: string; company: string;
  interests: string[];
  lifeStage: string; dreamRoleTitle: string; dreamRoleIndustry: string;
  dreamRoleSalary: string; dreamRoleTimeline: string;
  location: string; favouriteFilms: string[]; projects: ProfileProject[];
  commentsEnabled: boolean;
  searchableByRecruiters: boolean;
  employmentTypePreference: string;
  remotePreference: string;
}>;

export interface ApiError { error: string; status: number }

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

async function put<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<T>;
}

async function uploadImage(path: string, token: string, file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw { error: text || res.statusText, status: res.status } satisfies ApiError;
  }
  return res.json() as Promise<{ url: string }>;
}

export const profileApi = {
  getProfile(token: string): Promise<Profile> {
    return get('/profile', token);
  },

  updateProfile(token: string, patch: UpdateProfilePayload): Promise<Profile> {
    return put('/profile', token, patch);
  },

  uploadAvatar(token: string, file: File): Promise<{ url: string }> {
    return uploadImage('/profile/avatar', token, file);
  },

  uploadBanner(token: string, file: File): Promise<{ url: string }> {
    return uploadImage('/profile/banner', token, file);
  },

  getPublicProfile(token: string, userId: string): Promise<PublicProfile> {
    return get(`/profile/${userId}`, token);
  },

  block(token: string, userId: string): Promise<{ blockedUsers: BlockedUserRef[] }> {
    return post(`/profile/block/${userId}`, token);
  },

  unblock(token: string, userId: string): Promise<{ blockedUsers: BlockedUserRef[] }> {
    return post(`/profile/unblock/${userId}`, token);
  },
};
