// Deterministic CV + Job Spec context extraction — no AI required.
// Used to personalise interviewer intros, questions, and follow-ups.

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
  responsibilities: string[];
  leadershipSignals: string[];
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Director' | 'Executive' | 'Unknown';
  yearsOfExperience?: number;
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
  'Java', 'Go', 'Rust', 'Swift', 'Kotlin', 'PHP', 'Ruby',
  'Azure', 'AWS', 'GCP', 'Kubernetes', 'Docker', 'Terraform', 'Ansible',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cosmos DB', 'DynamoDB',
  'Kafka', 'RabbitMQ', 'Service Bus', 'GraphQL', 'REST', 'gRPC',
  'Microservices', 'CI/CD', 'GitHub Actions', 'Jenkins', 'Datadog',
  'Node.js', 'Django', 'FastAPI', 'Spring Boot', 'ASP.NET',
  'Agile', 'Scrum', 'Kanban', 'JIRA', 'Figma', 'Tableau', 'Power BI',
];

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

// ── Utility ───────────────────────────────────────────────────────────────────

function extractLines(text: string): string[] {
  return text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
}

function findMatches(text: string, candidates: string[]): string[] {
  const lower = text.toLowerCase();
  return candidates.filter(c => lower.includes(c.toLowerCase()));
}

function extractYearsOfExp(text: string): number | undefined {
  const match = text.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i);
  return match ? parseInt(match[1]) : undefined;
}

function extractSeniority(text: string): CVContext['seniority'] {
  const lower = text.toLowerCase();
  for (const [keyword, level] of Object.entries(SENIORITY_MAP)) {
    if (lower.includes(keyword)) return level;
  }
  return 'Unknown';
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
  // Only match "at Company" / "@ Company" / "for Company" — exclude "with" (used for tech)
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
    const m = line.match(/^((?:senior|junior|lead|principal|staff|head of|director of|vp of|chief)[\w\s,/.-]{3,40})/i);
    if (m) {
      const role = m[1].trim();
      if (!roles.includes(role)) roles.push(role);
    }
  }
  return roles.slice(0, 4);
}

function extractAchievements(text: string): string[] {
  const lines = extractLines(text);
  const achievements = lines.filter(l =>
    /increased|reduced|saved|delivered|grew|launched|built|led|designed|achieved|improved|generated|raised|closed|managed \$|£|€|\d+%/i.test(l)
    && l.length > 20 && l.length < 200
  );
  return achievements.slice(0, 5);
}

// ── Public API ────────────────────────────────────────────────────────────────

function extractName(text: string): { firstName: string; lastName: string } {
  // First non-empty line that looks like a name (2 capitalised words, ≤ 4 words total)
  const lines = extractLines(text);
  for (const line of lines.slice(0, 5)) {
    const words = line.trim().split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && words.every(w => /^[A-Z][a-z'-]+$/.test(w))) {
      return { firstName: words[0], lastName: words[words.length - 1] };
    }
  }
  return { firstName: '', lastName: '' };
}

export function buildCVContext(cvText: string): CVContext {
  const { firstName, lastName } = extractName(cvText);
  return {
    rawText: cvText,
    firstName,
    lastName,
    candidateName: firstName && lastName ? `${firstName} ${lastName}` : undefined,
    companies: extractCompanies(cvText),
    roles: extractRoles(cvText),
    dates: [],
    skills: findMatches(cvText, TECH_KEYWORDS).concat(
      ['communication', 'leadership', 'stakeholder management'].filter(s =>
        cvText.toLowerCase().includes(s)
      )
    ).slice(0, 10),
    technologies: findMatches(cvText, TECH_KEYWORDS).slice(0, 8),
    achievements: extractAchievements(cvText),
    certifications: [],
    responsibilities: [],
    leadershipSignals: LEADERSHIP_PHRASES.filter(p => cvText.toLowerCase().includes(p)).slice(0, 4),
    seniority: extractSeniority(cvText),
    yearsOfExperience: extractYearsOfExp(cvText),
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

// ── Personalised speech lines ─────────────────────────────────────────────────

export function buildSarahIntro(cv: CVContext, _job: JobSpecContext): string {
  const company = cv.companies[0];
  const role = cv.roles[0];
  const achievement = cv.achievements[0];

  let intro = "Welcome to your practice interview. Before we begin, here's how it works. When you're ready to answer a question, click the record button. Speak naturally — we'll transcribe everything in real time. When you're finished, click Stop. You'll immediately see our feedback, along with suggestions for how to improve. ";

  if (company || role || achievement) {
    intro += "I've had a chance to review your background. ";
    if (company && role) intro += `I can see you've worked at ${company} as ${role}. `;
    else if (company) intro += `I can see you've worked at ${company}. `;
    else if (role) intro += `I can see you've worked as ${role}. `;
    if (achievement) {
      // Trim long achievements and make them flow naturally in speech
      const ach = achievement.substring(0, 80).replace(/^[-•*]\s*/, '');
      intro += `I was particularly struck by your work where you ${ach.toLowerCase()}. `;
    }
    intro += "I'll tailor some of my questions to your experience. Let's begin.";
  } else {
    intro += "I'll be asking you about your background, leadership experience, and how you approach challenges. Let's begin.";
  }

  return intro;
}

export function buildJamesIntro(cv: CVContext, job: JobSpecContext): string {
  const techs = cv.technologies.slice(0, 3).join(', ');
  const achievement = cv.achievements.find(a => /built|designed|architected|developed|migrated|scaled/i.test(a));

  if (techs || achievement) {
    let intro = `Thanks Sarah. `;
    if (techs) intro += `I noticed your experience with ${techs}. `;
    if (achievement) intro += `I also saw that you ${achievement.substring(0, 80).toLowerCase()}. `;
    intro += `I'll focus on the technical side and ask a few questions related to your specific experience. `;
    if (job.techStack.length > 0) intro += `This role requires ${job.techStack.slice(0, 2).join(' and ')}, so I'll explore that too.`;
    return intro;
  }

  return "Thanks Sarah. I'll be focusing on the technical aspects of your background — architecture decisions, problem-solving approaches, and how you handle complexity at scale.";
}

// ── Personalised question generation ─────────────────────────────────────────

export function buildPersonalisedQuestions(cv: CVContext, job: JobSpecContext) {
  const company = cv.companies[0] ?? 'your previous company';
  const tech1 = cv.technologies[0] ?? job.techStack[0] ?? 'your tech stack';
  const tech2 = cv.technologies[1] ?? job.techStack[1];
  const achievement = cv.achievements[0];
  const seniority = cv.seniority;
  const jobTitle = job.title;

  const questions = [
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
      questionText: achievement
        ? `Your CV mentions: "${achievement.substring(0, 100)}". Can you walk me through how you achieved that, and what was the biggest obstacle?`
        : `Tell me about a significant achievement from ${company} that you're most proud of. What was your specific contribution?`,
      modelAnswer: 'Use STAR format. Be specific about YOUR role vs the team\'s. Quantify the outcome and be honest about obstacles.',
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
      questionText: job.responsibilities.length > 0
        ? `This role involves: "${job.responsibilities[0].substring(0, 100)}". How does your experience at ${company} prepare you for that specific challenge?`
        : `Where do you see the biggest technical challenge in this ${jobTitle} role, and how would you approach it in your first 90 days?`,
      modelAnswer: 'Show you\'ve read the job spec carefully. Connect your specific experience to their specific need. Have a concrete 30/60/90 day framework ready.',
      questionType: 'Behavioural' as const,
      difficulty: 'Medium' as const,
      source: 'HR',
      competencyTags: ['motivation', 'planning', 'adaptability'],
    },
  ];

  return questions;
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

  // If they mentioned a specific company from their CV
  const mentionedCompany = cv.companies.find(c => lower.includes(c.toLowerCase()));
  if (mentionedCompany) {
    return {
      text: `You mentioned your time at ${mentionedCompany}. What was the most valuable lesson you took from that experience that's directly relevant to this role?`,
      interviewer,
    };
  }

  // If they mentioned a metric
  if (/\d+%|\d+x|£\d+|\$\d+|saved|reduced|increased/.test(lower)) {
    return {
      text: "You mentioned some impressive numbers there. How did you measure that outcome, and how did you communicate it to leadership?",
      interviewer,
    };
  }

  // If it's technical and they mentioned a tech
  if (question.source === 'Technical') {
    const tech = cv.technologies.find(t => lower.includes(t.toLowerCase()));
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

  // Behavioural follow-ups
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
