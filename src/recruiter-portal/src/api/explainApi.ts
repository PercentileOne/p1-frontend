const BASE_URL = import.meta.env.VITE_EXPLAIN_API_URL ?? 'https://explain-api.azurewebsites.net';

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

export interface SessionQuestion {
  questionId: string;
  questionText: string;
  modelAnswer: string;
  questionType: string;
  difficulty: string;
  source: string;
  competencyTags: string[];
}

export interface SessionCvSummary {
  name: string;
  currentRole: string;
  experienceYears: number;
  skills: string[];
}

export interface CvExperienceEntry {
  role: string;
  company: string;
  period: string;
  responsibilities: string[];
  achievements: string[];
  technologies: string[];
  seniority: string;
}

export interface CvParseRequest {
  cvText: string;
}

export interface CvParseResponse {
  candidateId: string;
  firstName: string;
  lastName: string;
  summary: string | null;
  yearsOfExperience: number | null;
  seniority: string;
  roles: string[];
  companies: string[];
  experience: CvExperienceEntry[];
  skills: string[];
  achievements: string[];
  education: string[];
  certifications: string[];
  industries: string[];
  keywords: string[];
}

export interface SessionPrepareRequest {
  jobSpecText: string;
  cvText?: string;
}

export interface SessionPrepareResponse {
  questions: SessionQuestion[];
  sarahIntro: string;
  jamesIntro: string;
  mikeScript: string | null;
  companyFacts: string[];
  specialistTitle: string;
  cvSummary: SessionCvSummary | null;
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
    post<QuickGenerateResponse>('questions/generate', req),

  scoreResponse: (req: ScoreRequest, token: string) =>
    post<ScoreResponse>('answers/score', req, token),

  exportPack: (req: ExportRequest, token: string) =>
    post<ExportResponse>(`interview-pack/${req.packId}/export`, { recipientEmail: req.recipientEmail }, token),

  sessionPrepare: (req: SessionPrepareRequest) =>
    post<SessionPrepareResponse>('session/prepare', req),

  cvParse: (req: CvParseRequest) =>
    post<CvParseResponse>('cv/parse', req),
};
