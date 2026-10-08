// The interviewers registry (2026-10-07): every interviewer a candidate can meet — Spatius face, background, voice, description and personality. Super-Admin only on the
// backend (CAN_VIEW_SYSTEM_SETTINGS), like the avatar-provider setting. Backgrounds are uploaded here and served by the API (private blob container behind it).

export const EXPLAIN_API_BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'http://localhost:5000'

export type InterviewerRole = 'hr' | 'technical' | 'briefing'

export interface Traits { depth: number; strictness: number; warmth: number; humour: number; pace: number }

export interface Interviewer {
  id: string
  displayName: string
  role: InterviewerRole
  spatiusAvatarId: string
  voiceId: string | null
  description: string
  traits: Traits
  active: boolean
  sortOrder: number
  defaultFor: InterviewerRole | null
  backgroundUrl: string | null
  portraitUrl: string | null
  greetingUrl: string | null
  updatedAt: string
}

export interface InterviewerInput {
  displayName: string
  role: InterviewerRole
  spatiusAvatarId: string
  voiceId: string
  description: string
  depth: number
  strictness: number
  warmth: number
  humour: number
  pace: number
  active: boolean
  sortOrder: number
  defaultFor: InterviewerRole | null
}

async function call<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${EXPLAIN_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    let message = res.statusText
    try { const body = await res.json() as { error?: string }; if (body.error) message = body.error } catch { /* not JSON */ }
    throw new Error(message || `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const interviewersApi = {
  list: (token: string) => call<Interviewer[]>('/api/admin/interviewers', token),
  save: (token: string, id: string, body: InterviewerInput) =>
    call<Interviewer>(`/api/admin/interviewers/${encodeURIComponent(id)}`, token, {
      method: 'PUT',
      body: JSON.stringify({
        displayName: body.displayName, role: body.role, spatiusAvatarId: body.spatiusAvatarId, voiceId: body.voiceId || null, description: body.description,
        depth: body.depth, strictness: body.strictness, warmth: body.warmth, humour: body.humour, pace: body.pace,
        active: body.active, sortOrder: body.sortOrder, defaultFor: body.defaultFor,
      }),
    }),
  remove: (token: string, id: string) => call<void>(`/api/admin/interviewers/${encodeURIComponent(id)}`, token, { method: 'DELETE' }),
  uploadPortrait: (token: string, id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return call<Interviewer>(`/api/admin/interviewers/${encodeURIComponent(id)}/portrait`, token, { method: 'POST', body: form })
  },
  uploadBackground: (token: string, id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return call<Interviewer>(`/api/admin/interviewers/${encodeURIComponent(id)}/background`, token, { method: 'POST', body: form })
  },
}
