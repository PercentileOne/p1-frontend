export interface LeagueEntry {
  id: string;
  name: string;
  jobTitle: string;
  experience: number;
  subject: string;
  rel: number;
  cla: number;
  dep: number;
  con: number;
  overall: number;
  date: string;
}

const STORAGE_KEY = 'explain_league_v1';

const SEED: LeagueEntry[] = [
  { id: 's1', name: 'Lena Müller',     jobTitle: 'Software Architect',    experience: 14, subject: 'Software Architecture',   rel: 93, cla: 90, dep: 96, con: 91, overall: 93, date: '2025-07-20' },
  { id: 's2', name: 'Yuki Tanaka',     jobTitle: 'Staff Engineer',         experience: 11, subject: 'System Design',            rel: 91, cla: 87, dep: 94, con: 88, overall: 90, date: '2025-07-19' },
  { id: 's3', name: 'Amara Osei',      jobTitle: 'Senior Product Manager', experience:  8, subject: 'Product Strategy',         rel: 88, cla: 92, dep: 85, con: 90, overall: 89, date: '2025-07-18' },
  { id: 's4', name: 'Marcus Adeyemi',  jobTitle: 'Head of Engineering',    experience: 12, subject: 'Technical Leadership',     rel: 86, cla: 88, dep: 89, con: 92, overall: 89, date: '2025-07-21' },
  { id: 's5', name: 'Chidera Nwosu',   jobTitle: 'Marketing Director',     experience:  7, subject: 'Marketing Strategy',       rel: 84, cla: 89, dep: 80, con: 86, overall: 85, date: '2025-07-20' },
  { id: 's6', name: 'Priya Sharma',    jobTitle: 'Data Scientist',         experience:  5, subject: 'Machine Learning',         rel: 82, cla: 85, dep: 88, con: 79, overall: 84, date: '2025-07-21' },
  { id: 's7', name: 'Sofia Reyes',     jobTitle: 'Senior UX Designer',     experience:  6, subject: 'UX Design',                rel: 80, cla: 86, dep: 78, con: 81, overall: 81, date: '2025-07-22' },
  { id: 's8', name: 'James Okonkwo',   jobTitle: 'Boxing Trainer',         experience:  9, subject: 'Professional Boxing',      rel: 78, cla: 82, dep: 76, con: 88, overall: 81, date: '2025-07-22' },
  { id: 's9', name: 'Fatima Al-Said',  jobTitle: 'Senior Consultant',      experience:  6, subject: 'Stakeholder Management',   rel: 76, cla: 84, dep: 72, con: 80, overall: 78, date: '2025-07-23' },
  { id: 's10', name: 'David Kim',      jobTitle: 'Engineering Manager',    experience: 10, subject: 'Agile Leadership',         rel: 74, cla: 78, dep: 71, con: 77, overall: 75, date: '2025-07-23' },
];

export function getLeague(): LeagueEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const user: LeagueEntry[] = stored ? JSON.parse(stored) : [];
    return [...SEED, ...user].sort((a, b) => b.overall - a.overall);
  } catch {
    return [...SEED].sort((a, b) => b.overall - a.overall);
  }
}

export function addLeagueEntry(entry: Omit<LeagueEntry, 'id' | 'date'>): LeagueEntry {
  const full: LeagueEntry = {
    ...entry,
    id: `user-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
  };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const existing: LeagueEntry[] = stored ? JSON.parse(stored) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, full]));
  } catch { /* ignore */ }
  return full;
}
