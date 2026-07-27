// Deterministic CV + Job Spec context extraction — no AI required.

export interface CVExperience {
  role: string;
  company: string;
  period: string;
}

export interface CVContext {
  rawText: string;
  firstName: string;
  lastName: string;
  candidateName?: string;
  companies: string[];
  roles: string[];
  dates: string[];
  skills: string[];
  technologies: string[];
  achievements: string[];
  certifications: string[];
  education: string[];
  responsibilities: string[];
  leadershipSignals: string[];
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Director' | 'Executive' | 'Unknown';
  yearsOfExperience?: number;
  experience?: CVExperience[];
  summary?: string;
  _source?: 'ai' | 'heuristic';
}

export interface JobSpecContext {
  rawText: string;
  title: string;
  company?: string;
  industry?: string;
  requiredSkills: string[];
  techStack: string[];
  responsibilities: string[];
  behaviouralThemes: string[];
  leadershipExpectations: string[];
  seniority: string;
}

const TECH_KEYWORDS = [
  'React', 'Angular', 'Vue', 'TypeScript', 'JavaScript', 'Python', 'C#', '.NET',
  'Java', 'Rust', 'Swift', 'Kotlin', 'PHP', 'Ruby',
  'Azure', 'AWS', 'GCP', 'Kubernetes', 'Docker', 'Terraform', 'Ansible',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cosmos DB', 'DynamoDB',
  'Kafka', 'RabbitMQ', 'Service Bus', 'GraphQL', 'REST', 'gRPC',
  'Microservices', 'CI/CD', 'GitHub Actions', 'Jenkins', 'Datadog',
  'Node.js', 'Django', 'FastAPI', 'Spring Boot', 'ASP.NET',
  'Agile', 'Scrum', 'Kanban', 'JIRA', 'Figma', 'Tableau', 'Power BI',
];

const WORD_BOUNDARY_TERMS = new Set(['java', 'c', 'r', 'rust', 'php', 'ruby', 'sql']);

const SENIORITY_MAP: Record<string, CVContext['seniority']> = {
  'c-level': 'Executive', 'cto': 'Executive', 'ceo': 'Executive',
  'vp': 'Executive', 'vice president': 'Executive',
  'director': 'Director', 'head of': 'Director',
  'principal': 'Lead', 'staff': 'Lead', 'lead': 'Lead', 'architect': 'Lead', 'manager': 'Lead',
  'senior': 'Senior', 'sr.': 'Senior',
  'mid': 'Mid', 'mid-level': 'Mid',
  'junior': 'Junior', 'jr.': 'Junior', 'graduate': 'Junior', 'entry': 'Junior',
};

const LEADERSHIP_PHRASES = [
  'led', 'managed', 'built team', 'grew team', 'hired', 'line managed',
  'head of', 'director of', 'founded', 'scaled',
];

const BEHAVIOURAL_THEMES = [
  'leadership', 'teamwork', 'communication', 'stakeholder management',
  'conflict resolution', 'delivery', 'time management', 'adaptability',
  'problem solving', 'innovation', 'customer focus', 'resilience',
];

function extractLines(text: string): string[] {
  return text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
}

function findMatches(text: string, candidates: string[]): string[] {
  return candidates.filter(c => {
    const cLower = c.toLowerCase();
    if (WORD_BOUNDARY_TERMS.has(cLower)) {
      const escaped = cLower.replace(/[+.]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
    }
    return text.toLowerCase().includes(cLower);
  });
}

function extractSeniority(text: string): CVContext['seniority'] {
  const lower = text.toLowerCase();
  for (const [keyword, level] of Object.entries(SENIORITY_MAP)) {
    if (lower.includes(keyword)) return level;
  }
  return 'Unknown';
}

function extractName(text: string): { firstName: string; lastName: string } {
  const lines = extractLines(text);
  for (const line of lines.slice(0, 6)) {
    const cleaned = line.trim().replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+/i, '').trim();
    const words = cleaned.split(/\s+/);
    if (
      words.length >= 2 && words.length <= 4 &&
      words.every(w => /^[A-Z][a-z'-]+$/.test(w)) &&
      !['Personal', 'Professional', 'Career', 'Employment', 'Education', 'Technical'].includes(words[0])
    ) {
      return { firstName: words[0], lastName: words[words.length - 1] };
    }
  }
  return { firstName: '', lastName: '' };
}

export function buildCVContext(cvText: string): CVContext {
  const { firstName, lastName } = extractName(cvText);
  const skills = findMatches(cvText, TECH_KEYWORDS).slice(0, 10);

  return {
    rawText: cvText,
    firstName,
    lastName,
    candidateName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
    companies: [],
    roles: [],
    dates: [],
    skills,
    technologies: skills,
    achievements: [],
    certifications: [],
    education: [],
    responsibilities: [],
    leadershipSignals: LEADERSHIP_PHRASES.filter(p => cvText.toLowerCase().includes(p)).slice(0, 4),
    seniority: extractSeniority(cvText),
    _source: 'heuristic',
  };
}

export function buildJobSpecContext(jobSpecText: string): JobSpecContext {
  const lines = extractLines(jobSpecText);
  const titleLine = lines[0] ?? '';

  return {
    rawText: jobSpecText,
    title: titleLine.length < 80 ? titleLine : 'the role',
    requiredSkills: findMatches(jobSpecText, TECH_KEYWORDS).slice(0, 8),
    techStack: findMatches(jobSpecText, TECH_KEYWORDS).slice(0, 6),
    responsibilities: lines.filter(l =>
      /^[-•*]\s/.test(l) || /responsibilit|you will|key duties/i.test(l)
    ).map(l => l.replace(/^[-•*]\s*/, '')).slice(0, 6),
    behaviouralThemes: findMatches(jobSpecText, BEHAVIOURAL_THEMES).slice(0, 4),
    leadershipExpectations: LEADERSHIP_PHRASES.filter(p =>
      jobSpecText.toLowerCase().includes(p)
    ).slice(0, 3),
    seniority: extractSeniority(jobSpecText),
  };
}
