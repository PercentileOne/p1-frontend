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

export type FeedbackOutcome = 'pass' | 'fail' | 'door-open';

// ── Candidate Feedback Session (hash-encoded, sent by recruiter to candidate) ──

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

export function encodeCandidateSession(session: CandidateFeedbackSession): string {
  return btoa(encodeURIComponent(JSON.stringify(session)));
}

export function decodeCandidateSession(encoded: string): CandidateFeedbackSession | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as CandidateFeedbackSession;
  } catch {
    return null;
  }
}

export function buildCandidateFeedbackUrl(session: CandidateFeedbackSession): string {
  const token = encodeCandidateSession(session);
  return `${window.location.origin}/candidate/feedback#${token}`;
}

export function readCandidateSessionFromHash(): CandidateFeedbackSession | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return decodeCandidateSession(hash);
}

// ── Candidate Prep Session (recruiter → candidate pre-interview prep link) ─────

export interface CandidatePrepSession {
  version: 1;
  prepType: 'pre-interview' | 'full-prep' | 'practice';
  candidateName?: string;
  role: string;
  company?: string;
  industry?: string;
  questions: import('../api/explainApi').InterviewQuestion[];
  recruiterName?: string;
  recruiterMessage?: string;
  generatedAt: number;
}

export function encodePrepSession(session: CandidatePrepSession): string {
  return btoa(encodeURIComponent(JSON.stringify(session)));
}

export function decodePrepSession(encoded: string): CandidatePrepSession | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as CandidatePrepSession;
  } catch {
    return null;
  }
}

export function buildCandidatePrepUrl(session: CandidatePrepSession): string {
  const token = encodePrepSession(session);
  return `${window.location.origin}/candidate/prep#${token}`;
}

export function readPrepSessionFromHash(): CandidatePrepSession | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return decodePrepSession(hash);
}

export interface ClientFeedbackContext {
  candidateName: string;
  role: string;
  company?: string;
  industry?: string;
  outcome: FeedbackOutcome;
  improvementAreas: string[];
  clientNotes: string;
  aiGeneratedSummary: string;
  timestamp: number;
}

export function getRoleImprovementAreas(jobTitle: string, industry?: string): string[][] {
  const t = (jobTitle + ' ' + (industry ?? '')).toLowerCase();

  if (/engineer|developer|architect|software|backend|frontend|devops|cloud/.test(t)) {
    return [
      ['Technical depth', 'System design', 'Code quality', 'Problem solving'],
      ['Architecture', 'Communication', 'Leadership', 'Delivery pace'],
      ['Testing', 'Documentation', 'Stakeholder management', 'Domain knowledge'],
    ];
  }
  if (/barista|coffee|café|cafe|starbucks|costa/.test(t)) {
    return [
      ['Beverage craft', 'Speed under pressure', 'Customer service', 'Product knowledge'],
      ['Hygiene', 'Teamwork', 'Communication', 'Reliability'],
      ['Upselling', 'Consistency', 'Time management', 'Brand knowledge'],
    ];
  }
  if (/chef|cook|kitchen|restaurant|hospitality|hotel/.test(t)) {
    return [
      ['Food safety', 'Speed under pressure', 'Consistency', 'Kitchen hygiene'],
      ['Menu knowledge', 'Teamwork', 'Communication', 'Creativity'],
      ['Time management', 'Waste management', 'Leadership', 'Reliability'],
    ];
  }
  if (/store manager|retail manager|shop manager|assistant manager/.test(t)) {
    return [
      ['Retail operations', 'Team leadership', 'Customer service', 'Stock management'],
      ['KPI delivery', 'Communication', 'Problem solving', 'Loss prevention'],
      ['Staff development', 'Stakeholder management', 'Commercial awareness', 'Reliability'],
    ];
  }
  if (/sales|account manager|business development/.test(t)) {
    return [
      ['Closing skills', 'Pipeline management', 'Communication', 'Product knowledge'],
      ['Objection handling', 'Relationship building', 'Resilience', 'Stakeholder management'],
      ['Negotiation', 'CRM discipline', 'Domain knowledge', 'Commercial awareness'],
    ];
  }
  if (/nurse|doctor|clinician|gp |therapist|physio/.test(t)) {
    return [
      ['Clinical knowledge', 'Patient communication', 'Decision-making', 'Empathy'],
      ['Documentation', 'Teamwork', 'Safeguarding', 'Resilience'],
      ['Time management', 'Leadership', 'Professional boundaries', 'Domain knowledge'],
    ];
  }
  if (/teacher|lecturer|tutor|educator/.test(t)) {
    return [
      ['Subject knowledge', 'Classroom management', 'Communication', 'Student engagement'],
      ['Differentiation', 'Assessment', 'Teamwork', 'Resilience'],
      ['Behaviour management', 'Curriculum knowledge', 'Leadership', 'Reliability'],
    ];
  }
  if (/trainer|coach|fitness|gym|sport/.test(t)) {
    return [
      ['Coaching methodology', 'Client motivation', 'Communication', 'Programme design'],
      ['Safety awareness', 'Reliability', 'Domain knowledge', 'Empathy'],
      ['Commercial awareness', 'Retention skills', 'Leadership', 'Resilience'],
    ];
  }
  if (/driver|logistics|warehouse|delivery/.test(t)) {
    return [
      ['Route planning', 'Time management', 'Safety awareness', 'Reliability'],
      ['Communication', 'Teamwork', 'Problem solving', 'Vehicle knowledge'],
      ['Customer service', 'Documentation', 'Resilience', 'Physical fitness'],
    ];
  }
  if (/lawyer|solicitor|legal|barrister/.test(t)) {
    return [
      ['Legal knowledge', 'Analytical thinking', 'Communication', 'Attention to detail'],
      ['Client management', 'Stakeholder management', 'Problem solving', 'Resilience'],
      ['Time management', 'Commercial awareness', 'Leadership', 'Domain knowledge'],
    ];
  }
  if (/childcare|nursery|nanny|early years/.test(t)) {
    return [
      ['Child development knowledge', 'Safeguarding', 'Communication', 'Empathy'],
      ['Patience', 'Teamwork', 'Reliability', 'Creativity'],
      ['Behaviour management', 'Documentation', 'Parent communication', 'Resilience'],
    ];
  }

  // Generic fallback
  return [
    ['Communication', 'Problem solving', 'Leadership', 'Teamwork'],
    ['Domain knowledge', 'Stakeholder management', 'Reliability', 'Resilience'],
    ['Time management', 'Commercial awareness', 'Delivery pace', 'Technical depth'],
  ];
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
