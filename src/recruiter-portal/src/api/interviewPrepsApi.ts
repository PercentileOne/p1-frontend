const BASE = (import.meta.env.VITE_EXPLAIN_API_URL as string | undefined) ?? 'https://explain-api.azurewebsites.net';

export interface InterviewPrep {
  id:            string;
  recruiterId:   string;
  recruiterName: string;
  firstName:     string;
  lastName:      string;
  email:         string;
  role:          string;
  level:         string;
  interviewDate: string; // ISO
  status:        string;
  createdAt:     string; // ISO
}

export interface SendPrepRequest {
  firstName:     string;
  lastName:      string;
  email:         string;
  role:          string;
  level:         string;
  interviewDate: string; // ISO
}

export interface ApiError {
  error: string;
}

export const interviewPrepsApi = {
  async send(token: string, body: SendPrepRequest): Promise<InterviewPrep> {
    const res = await fetch(`${BASE}/api/interview-preps`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null) as ApiError | null;
      throw new Error(data?.error ?? `Failed to send interview prep (${res.status}).`);
    }
    return res.json();
  },

  async list(token: string): Promise<InterviewPrep[]> {
    const res = await fetch(`${BASE}/api/interview-preps`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to load interview preps (${res.status}).`);
    return res.json();
  },
};
