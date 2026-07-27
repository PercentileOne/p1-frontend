import type { CVContext, JobSpecContext } from './contextBuilder';
import type { InterviewQuestion } from '../api/explainApi';

export type FeedbackOutcome = 'pass' | 'fail' | 'door-open';

export interface CandidateFeedbackSession {
  version: 1;
  candidateName: string;
  role: string;
  company?: string;
  outcome: FeedbackOutcome;
  feedbackText: string;
  improvementAreas: string[];
  recruiterName?: string;
  recruiterNotes?: string;
  generatedAt: number;
}

export function decodeCandidateSession(encoded: string): CandidateFeedbackSession | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as CandidateFeedbackSession;
  } catch {
    return null;
  }
}

export function readCandidateSessionFromHash(): CandidateFeedbackSession | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return decodeCandidateSession(hash);
}

export interface CandidatePrepSession {
  version: 1;
  prepType: 'pre-interview' | 'full-prep' | 'practice';
  candidateName?: string;
  role: string;
  company?: string;
  industry?: string;
  questions: InterviewQuestion[];
  recruiterName?: string;
  recruiterMessage?: string;
  generatedAt: number;
}

export function decodePrepSession(encoded: string): CandidatePrepSession | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as CandidatePrepSession;
  } catch {
    return null;
  }
}

export function readPrepSessionFromHash(): CandidatePrepSession | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return decodePrepSession(hash);
}

// Keep ClientSession for completeness (used by recruiter portal to build links)
export interface ClientSession {
  version: 2;
  meta: {
    candidateName: string;
    currentRole: string;
    currentCompany: string;
    recruiterName?: string;
    recruiterNotes?: string;
    interviewDate?: string;
    interviewTime?: string;
    interviewLocation?: string;
    generatedAt: number;
  };
  cvCtx: Omit<CVContext, 'rawText'>;
  jobCtx: Omit<JobSpecContext, 'rawText'>;
  questions: (InterviewQuestion & { followUps?: string[] })[];
}
