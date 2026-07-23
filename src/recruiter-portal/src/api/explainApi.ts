const BASE_URL = import.meta.env.VITE_EXPLAIN_API_URL ?? 'http://localhost:7071/api';

export interface QuickGenerateRequest {
  jobDescriptionText: string;
  exampleCvText?: string;
  workspaceId?: string;
}

export interface InterviewQuestion {
  questionId: string;
  questionText: string;
  modelAnswer: string;
  questionType: string;
  difficulty: string;
  source: string;
  competencyTags: string[];
}

export interface QuickGenerateResponse {
  packId: string;
  title: string;
  questions: InterviewQuestion[];
  generatedAt: string;
}

export interface ScoreRequest {
  packId: string;
  questionId: string;
  answerText: string;
}

export interface FeedbackItem {
  dimension: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ScoreResponse {
  clarity: number;
  relevance: number;
  depth: number;
  confidence: number;
  overallScore: number;
  feedback: FeedbackItem[];
  suggestions: string[];
}

export interface ExportRequest {
  packId: string;
  recipientEmail?: string;
}

export interface ExportResponse {
  pdfUrl?: string;
  emailSent: boolean;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const explainApi = {
  quickGenerate: (req: QuickGenerateRequest) =>
    post<QuickGenerateResponse>('v1/interview-pack/quick-generate', req),

  scoreResponse: (req: ScoreRequest, token: string) =>
    post<ScoreResponse>('v1/response/score', req, token),

  exportPack: (req: ExportRequest, token: string) =>
    post<ExportResponse>(`v1/interview-pack/${req.packId}/export`, { recipientEmail: req.recipientEmail }, token),
};
