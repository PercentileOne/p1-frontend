// Deterministic CV + Job Spec context extraction — no AI required.
// Used to personalise interviewer intros, questions, and follow-ups.

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
  skills: string[];        // clean structured skills — safe for AI prompts
  technologies: string[]; // legacy alias for skills — do NOT pass to interviewer prompts
  achievements: string[];
  certifications: string[];
  education: string[];
  responsibilities: string[];
  leadershipSignals: string[];
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Director' | 'Executive' | 'Unknown';
  yearsOfExperience?: number;
  experience?: CVExperience[];
  summary?: string;
  _source?: 'ai' | 'heuristic'; // which parser produced this context
}

export interface JobSpecContext {
  rawText: string;
  title: string;
  company?: string;
  requiredSkills: string[];
  techStack: string[];
  responsibilities: string[];
  behaviouralThemes: string[];
  leadershipExpectations: string[];
  seniority: string;
}

// ── Known lists ───────────────────────────────────────────────────────────────

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

// Terms that must match as whole words — they are substrings of longer tech names
// e.g. "java" matches inside "javascript", "go" matches inside "going"
const WORD_BOUNDARY_TERMS = new Set(['java', 'c', 'r', 'rust', 'php', 'ruby', 'sql']);

const SENIORITY_MAP: Record<string, CVContext['seniority']> = {
  'c-level': 'Executive', 'cto': 'Executive', 'ceo': 'Executive', 'coo': 'Executive', 'cpo': 'Executive',
  'vp': 'Executive', 'vice president': 'Executive',
  'director': 'Director', 'head of': 'Director',
  'principal': 'Lead', 'staff': 'Lead', 'lead': 'Lead', 'architect': 'Lead', 'manager': 'Lead',
  'senior': 'Senior', 'sr.': 'Senior',
  'mid': 'Mid', 'mid-level': 'Mid',
  'junior': 'Junior', 'jr.': 'Junior', 'graduate': 'Junior', 'entry': 'Junior',
};

const LEADERSHIP_PHRASES = [
  'led', 'managed', 'built team', 'grew team', 'hired', 'line managed',
  'head of', 'director of', 'founded', 'scaled', 'reported to board',
  'budget responsibility', 'p&l', 'delivered programme', 'transformed',
];

const BEHAVIOURAL_THEMES = [
  'leadership', 'teamwork', 'communication', 'stakeholder management',
  'conflict resolution', 'delivery', 'time management', 'adaptability',
  'problem solving', 'innovation', 'customer focus', 'resilience',
];

// Lines that match the achievement regex but are NOT real achievements
const ACHIEVEMENT_BLACKLIST: RegExp[] = [
  // Imperative task descriptions (start with infinitive verbs)
  /^bring\s/i, /^create\s/i, /^introduce\s/i, /^develop\s/i,
  /^maintain\s/i, /^provide\s/i, /^assist\s/i, /^support\s/i,
  /^implement\s/i, /^ensure\s/i, /^manage\s/i, /^handle\s/i,
  // Section headings
  /tools\s*[&and]+\s*techniques/i,
  /tools\s*used\s*include/i,
  // Hardware and peripherals (NOT achievements)
  /pager|mobile\s*phone|credit\s*card|laptop|desktop\s*pc/i,
  // KPI tracking strings
  /acknowledg|queries?\s*on\s*time|response\s*time\s*sla/i,
  // App descriptions starting with "This application..."
  /^this\s+application\s+was\s+built/i,
  /^this\s+application\s+is/i,
  // Responsibility/bullet continuations
  /^[A-Z][a-z]+ing\s+the\s+/,  // "Managing the...", "Maintaining the..."
];

// ── Utility ───────────────────────────────────────────────────────────────────

function extractLines(text: string): string[] {
  return text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
}

// Word-boundary aware matching — prevents "Java" matching inside "JavaScript"
function findMatches(text: string, candidates: string[]): string[] {
  return candidates.filter(c => {
    const cLower = c.toLowerCase();
    if (WORD_BOUNDARY_TERMS.has(cLower)) {
      // Escape regex special chars then require word boundaries
      const escaped = cLower.replace(/[+.]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
    }
    return text.toLowerCase().includes(cLower);
  });
}

function extractYearsOfExp(text: string): number | undefined {
  // Match "24 years commercial experience", "over 24 years of experience", "24+ years exp", etc.
  const match = text.match(/(\d+)\+?\s*years?\s+(?:of\s+)?(?:commercial\s+|professional\s+|industry\s+)?(experience|exp)/i);
  return match ? parseInt(match[1]) : undefined;
}

function extractSeniority(text: string): CVContext['seniority'] {
  const lower = text.toLowerCase();
  for (const [keyword, level] of Object.entries(SENIORITY_MAP)) {
    if (lower.includes(keyword)) return level;
  }
  return 'Unknown';
}

// Clip a string at a word boundary — never mid-word
function wordClip(s: string, max: number): string {
  if (s.length <= max) return s;
  const clipped = s.slice(0, max);
  // Walk back to the last space to avoid cutting a word in half
  const lastSpace = clipped.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? clipped.slice(0, lastSpace) : clipped) + '…';
}

// Tech terms and generic words that should never be treated as company names
const NOT_A_COMPANY = new Set([
  ...TECH_KEYWORDS.map(t => t.toLowerCase()),
  'visual basic', 'visual studio', 'microsoft office', 'microsoft excel',
  'microsoft word', 'the team', 'the business', 'the board', 'the cto',
  'the company', 'a team', 'a company', 'a startup', 'an agency',
  'experience', 'responsibility', 'proficiency', 'knowledge', 'skills',
]);

function extractCompanies(text: string): string[] {
  const companies: string[] = [];
  const atPattern = /(?:at|@|for)\s+([A-Z][A-Za-z0-9&\s'.-]{2,30}?)(?:\s*[,|·\n]|$)/gm;
  let m: RegExpExecArray | null;
  while ((m = atPattern.exec(text)) !== null) {
    const name = m[1].trim();
    if (name.length > 2 && !companies.includes(name) && !NOT_A_COMPANY.has(name.toLowerCase())) {
      companies.push(name);
    }
  }
  return companies.slice(0, 6);
}

function extractRoles(text: string): string[] {
  const roles: string[] = [];
  const lines = extractLines(text);
  for (const line of lines) {
    // Allow up to 70 chars after the seniority keyword to capture full job titles
    const m = line.match(/^((?:senior|junior|lead|principal|staff|head of|director of|vp of|chief)[\w\s,/.-]{3,70})/i);
    if (m) {
      const role = m[1].trim();
      if (!roles.includes(role)) roles.push(role);
    }
  }
  return roles.slice(0, 4);
}

function extractAchievements(text: string): string[] {
  const lines = extractLines(text);
  return lines
    .filter(l =>
      /increased|reduced|saved|delivered|grew|launched|built|led|designed|achieved|improved|generated|raised|closed|managed \$|£|€|\d+%/i.test(l)
      && l.length > 30 && l.length < 200
      && !ACHIEVEMENT_BLACKLIST.some(p => p.test(l))
    )
    .slice(0, 5);
}

function extractName(text: string): { firstName: string; lastName: string } {
  const lines = extractLines(text);
  for (const line of lines.slice(0, 6)) {
    // Strip honourific prefixes before matching
    const cleaned = line.trim().replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?)\s+/i, '').trim();
    const words = cleaned.split(/\s+/);
    if (
      words.length >= 2 && words.length <= 4 &&
      words.every(w => /^[A-Z][a-z'-]+$/.test(w)) &&
      // Exclude known section heading phrases
      !['Personal', 'Professional', 'Career', 'Employment', 'Education', 'Technical'].includes(words[0])
    ) {
      return { firstName: words[0], lastName: words[words.length - 1] };
    }
  }
  return { firstName: '', lastName: '' };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function buildCVContext(cvText: string): CVContext {
  const { firstName, lastName } = extractName(cvText);
  const skills = findMatches(cvText, TECH_KEYWORDS).concat(
    ['communication', 'leadership', 'stakeholder management'].filter(s =>
      cvText.toLowerCase().includes(s)
    )
  ).slice(0, 10);

  return {
    rawText: cvText,
    firstName,
    lastName,
    candidateName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
    companies: extractCompanies(cvText),
    roles: extractRoles(cvText),
    dates: [],
    skills,
    technologies: skills,
    achievements: extractAchievements(cvText),
    certifications: [],
    education: [],
    responsibilities: [],
    leadershipSignals: LEADERSHIP_PHRASES.filter(p => cvText.toLowerCase().includes(p)).slice(0, 4),
    seniority: extractSeniority(cvText),
    yearsOfExperience: extractYearsOfExp(cvText),
    _source: 'heuristic',
  };
}

export function buildJobSpecContext(jobSpecText: string): JobSpecContext {
  const lines = extractLines(jobSpecText);
  const titleLine = lines[0] ?? '';
  const companyMatch = jobSpecText.match(/(?:at|@|–|-)\s*([A-Z][A-Za-z0-9\s&.]{2,30}?)(?:\s*[·,\n]|$)/);

  return {
    rawText: jobSpecText,
    title: titleLine.length < 80 ? titleLine : 'the role',
    company: companyMatch?.[1]?.trim(),
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

// ── Heuristic intro fallbacks ─────────────────────────────────────────────────
// Safe fields only: role/company/yearsOfExperience. No achievements[], no technologies[].

export function buildSarahIntro(cv: CVContext, _job: JobSpecContext): string {
  const role = cv.roles[0] ?? cv.experience?.[0]?.role;
  const company = cv.experience?.[0]?.company ?? cv.companies[0];
  const years = cv.yearsOfExperience;

  let intro = "Welcome to your practice interview. Before we begin, here's how it works: click the record button when you're ready, speak naturally, then click Stop. You'll get instant feedback after each answer. ";

  if (role || company || years) {
    intro += "I've had a chance to review your background. ";
    if (role && company) intro += `I can see you've been working as ${role} at ${company}`;
    else if (role) intro += `I can see you've been working as ${role}`;
    else if (company) intro += `I can see you've worked at ${company}`;
    if (years) intro += ` — ${years} years of commercial experience`;
    intro += ". Let's begin.";
  } else {
    intro += "I'll be asking you about your background, leadership experience, and how you approach challenges. Let's begin.";
  }

  return intro;
}

export function buildJamesIntro(cv: CVContext, _job: JobSpecContext): string {
  const recentRole = cv.roles[0];
  const recentCompany = cv.experience?.[0]?.company ?? cv.companies[0];

  if (recentRole || recentCompany) {
    let intro = `Thanks Sarah. `;
    if (recentRole && recentCompany) intro += `I've had a look at your background as ${recentRole} at ${recentCompany}. `;
    else if (recentRole) intro += `I've had a look at your background as ${recentRole}. `;
    else if (recentCompany) intro += `I've had a look at your time at ${recentCompany}. `;
    intro += `I'll be focusing on the technical aspects — architecture decisions, problem-solving, and how you approach complexity at scale.`;
    return intro;
  }

  return "Thanks Sarah. I'll be focusing on the technical aspects of your background — architecture decisions, problem-solving approaches, and how you handle complexity at scale.";
}

// ── Personalised question generation ─────────────────────────────────────────

export function buildPersonalisedQuestions(cv: CVContext, job: JobSpecContext) {
  const company = cv.experience?.[0]?.company ?? cv.companies[0] ?? 'your previous company';
  // Use skills[] (verified) not technologies[] (heuristic may contain hallucinations)
  const tech1 = cv.skills[0] ?? job.techStack[0] ?? 'your technical background';
  const tech2 = cv.skills[1] ?? job.techStack[1];
  const achievement = cv.achievements[0];
  const seniority = cv.seniority;
  const jobTitle = job.title;

  return [
    {
      questionId: 'pq1',
      questionText: `Tell me about yourself and what specifically attracted you to the ${jobTitle}.`,
      modelAnswer: 'Structure: current role → relevant experience → why this specific company/role → why now. Keep to 90 seconds and make the connection to this role explicit.',
      questionType: 'Behavioural' as const,
      difficulty: 'Easy' as const,
      source: 'HR',
      competencyTags: ['communication', 'motivation'],
    },
    {
      questionId: 'pq2',
      // wordClip at 200 chars — cuts at last complete word, never mid-word
      questionText: achievement
        ? `Your CV mentions: "${wordClip(achievement, 200)}". Can you walk me through how you achieved that, and what was the biggest obstacle?`
        : `Tell me about a significant achievement from ${company} that you're most proud of. What was your specific contribution?`,
      modelAnswer: "Use STAR format. Be specific about YOUR role vs the team's. Quantify the outcome and be honest about obstacles.",
      questionType: 'Behavioural' as const,
      difficulty: 'Medium' as const,
      source: 'HR',
      competencyTags: ['delivery', 'leadership', 'resilience'],
    },
    {
      questionId: 'pq3',
      questionText: tech2
        ? `I can see you have experience with both ${tech1} and ${tech2}. Walk me through a technical decision where you had to choose between approaches — what trade-offs did you weigh?`
        : `Walk me through the most complex technical system you've designed using ${tech1}. What trade-offs did you make?`,
      modelAnswer: 'Cover: context and constraints, options you considered, trade-offs you weighed explicitly, how you validated the decision, and what you would do differently.',
      questionType: 'Technical' as const,
      difficulty: 'Hard' as const,
      source: 'Technical',
      competencyTags: ['architecture', 'problem-solving', 'technical depth'],
    },
    {
      questionId: 'pq4',
      questionText: seniority === 'Lead' || seniority === 'Director' || seniority === 'Executive'
        ? `In a leadership role, how do you balance technical quality with delivery pace? Give me a specific example from ${company} where you had to make that call.`
        : `Describe a situation at ${company} where you had to push back on a decision you disagreed with. How did you handle it?`,
      modelAnswer: 'Show you can hold a principled position while maintaining relationships. Give the context, your approach, the outcome, and what you learned.',
      questionType: 'Behavioural' as const,
      difficulty: 'Medium' as const,
      source: 'HR',
      competencyTags: ['stakeholder management', 'leadership', 'communication'],
    },
    {
      questionId: 'pq5',
      // wordClip at 200 chars on responsibilities too
      questionText: job.responsibilities.length > 0
        ? `This role involves: "${wordClip(job.responsibilities[0], 200)}". How does your experience at ${company} prepare you for that specific challenge?`
        : `Where do you see the biggest technical challenge in this ${jobTitle} role, and how would you approach it in your first 90 days?`,
      modelAnswer: "Show you've read the job spec carefully. Connect your specific experience to their specific need. Have a concrete 30/60/90 day framework ready.",
      questionType: 'Behavioural' as const,
      difficulty: 'Medium' as const,
      source: 'HR',
      competencyTags: ['motivation', 'planning', 'adaptability'],
    },
  ];
}

// ── Follow-up question generator ─────────────────────────────────────────────

export function generateFollowUp(
  question: { questionText: string; questionType: string; source: string },
  answerText: string,
  cv: CVContext,
  _job: JobSpecContext,
): { text: string; interviewer: 'hr' | 'technical' } {
  const lower = answerText.toLowerCase();
  const interviewer: 'hr' | 'technical' = question.source === 'Technical' ? 'technical' : 'hr';

  const mentionedCompany = cv.companies.find(c => lower.includes(c.toLowerCase()));
  if (mentionedCompany) {
    return {
      text: `You mentioned your time at ${mentionedCompany}. What was the most valuable lesson you took from that experience that's directly relevant to this role?`,
      interviewer,
    };
  }

  if (/\d+%|\d+x|£\d+|\$\d+|saved|reduced|increased/.test(lower)) {
    return {
      text: "You mentioned some impressive numbers there. How did you measure that outcome, and how did you communicate it to leadership?",
      interviewer,
    };
  }

  if (question.source === 'Technical') {
    const tech = cv.skills.find(t => lower.includes(t.toLowerCase()));
    if (tech) {
      return {
        text: `You touched on your ${tech} experience. What's the hardest production issue you've faced with it, and how did you diagnose and resolve it?`,
        interviewer: 'technical',
      };
    }
    return {
      text: "That's interesting. If you were to do that differently today with what you know now, what would you change?",
      interviewer: 'technical',
    };
  }

  if (lower.includes('team') || lower.includes('we ')) {
    return {
      text: "You mentioned the team a few times. What was YOUR specific contribution to that outcome — separate from what the team did collectively?",
      interviewer: 'hr',
    };
  }

  if (lower.includes('challenge') || lower.includes('difficult')) {
    return {
      text: "That sounds like a genuinely tough situation. What did it teach you about yourself as a professional?",
      interviewer: 'hr',
    };
  }

  return {
    text: "Can you give me a specific example to bring that to life? A real situation where that played out.",
    interviewer,
  };
}
