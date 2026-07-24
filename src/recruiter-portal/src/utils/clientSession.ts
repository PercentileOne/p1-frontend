import type { CVContext, JobSpecContext } from './contextBuilder';
import type { InterviewQuestion } from '../api/explainApi';

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

export function encodeSession(session: ClientSession): string {
  return btoa(encodeURIComponent(JSON.stringify(session)));
}

export function decodeSession(encoded: string): ClientSession | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as ClientSession;
  } catch {
    return null;
  }
}

export function buildClientUrl(session: ClientSession): string {
  const token = encodeSession(session);
  const base = window.location.origin;
  return `${base}/client#${token}`;
}

export function readSessionFromHash(): ClientSession | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return decodeSession(hash);
}

export function generateFollowUps(question: InterviewQuestion): string[] {
  const q = question.questionText.toLowerCase();
  const source = question.source;

  if (source === 'HR') {
    return [
      'What specifically about our company drew you here over others?',
      'How do you see yourself growing in this role over the next two years?',
    ];
  }

  // Role-specific follow-up patterns
  if (/trade-off|chose|decision|approach/.test(q)) {
    return [
      'Looking back, would you make the same call today? What would you change?',
      'How did you bring others along on that decision — was there pushback?',
    ];
  }
  if (/challenge|difficult|hard|struggle|problem/.test(q)) {
    return [
      'What was the moment you knew you had it solved?',
      'What would you do differently if you faced the same situation again?',
    ];
  }
  if (/team|colleague|stakeholder|manage/.test(q)) {
    return [
      'How did you handle disagreement within the team on this?',
      'What did you learn about working with others from this experience?',
    ];
  }
  if (/achiev|success|proud|result/.test(q)) {
    return [
      'How did you measure the success of this — what were the metrics?',
      'Was this a solo effort or team effort — what was your specific contribution?',
    ];
  }
  if (/quality|standard|process|ensure/.test(q)) {
    return [
      'Can you give me an example where you caught something others missed?',
      'How do you maintain standards when you are under pressure to cut corners?',
    ];
  }

  return [
    'Can you give me a specific example of that from your recent experience?',
    'How would you approach this differently at our organisation?',
  ];
}
