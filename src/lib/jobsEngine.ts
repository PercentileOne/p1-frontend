/* ══════════════════════════════════════════════════════════════
   JOBS ENGINE  v1.0
   Types, demo data, and JobMatchingEngine class
   ══════════════════════════════════════════════════════════════ */

export type JobType       = "full-time" | "part-time" | "contract" | "freelance" | "remote";
export type JobDifficulty = "entry" | "mid" | "senior" | "lead" | "executive";
export type AppStatus     = "pending" | "reviewed" | "shortlisted" | "rejected" | "offered";

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo: string;         // emoji fallback
  companySummary: string;
  industry: string;
  companySize: string;
  salary: string;
  salaryMin: number;
  salaryMax: number;
  location: string;
  remote: boolean;
  type: JobType;
  difficulty: JobDifficulty;
  postedDaysAgo: number;
  featured: boolean;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  proofRequired: boolean;
  proofTypes: string[];
  visionAreas: string[];       // which vision domains this job serves
  views: number;
  applicants: number;
  recruiterId: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userTrustScore: number;
  userBehaviourScore: number;
  skills: string[];
  proofAttached: boolean;
  cycleHistoryAttached: boolean;
  trustScoreAttached: boolean;
  status: AppStatus;
  submittedAt: Date;
  matchScore: number;
  cyclesCompleted: number;
  topProofTypes: string[];
  coverNote?: string;
}

export interface RecruiterPost {
  jobId: string;
  views: number;
  applicants: number;
  matches: number;
  proofSubmissions: number;
  status: "active" | "paused" | "closed";
}

export interface JobMatchScore {
  overall: number;
  vision: number;
  goals: number;
  skills: number;
  proof: number;
  cycle: number;
  behaviour: number;
  breakdown: string[];
  strengths: string[];
  gaps: string[];
}

export interface JobUser {
  id: string;
  name: string;
  trustScore: number;
  behaviourScore: number;
  skills: string[];
  visionAreas: string[];
  activeGoalTitles: string[];
  proofCount: number;
  cyclesCompleted: number;
  currentCycleProgress: number; // 0-100
}

/* ─── Demo Jobs ─────────────────────────────────────────────── */

export const DEMO_JOBS: Job[] = [
  {
    id: "j1",
    title: "Senior Product Manager",
    company: "Nexus Labs",
    companyLogo: "🚀",
    companySummary: "Nexus Labs builds AI-powered enterprise productivity tools used by 500+ companies worldwide.",
    industry: "Technology",
    companySize: "201–500 employees",
    salary: "£85,000 – £110,000",
    salaryMin: 85000,
    salaryMax: 110000,
    location: "London, UK",
    remote: true,
    type: "full-time",
    difficulty: "senior",
    postedDaysAgo: 2,
    featured: true,
    description: "We're looking for a Senior PM to lead our core product suite. You'll work directly with the CTO and drive the roadmap for our flagship B2B platform.",
    responsibilities: [
      "Own the product roadmap for 3 core product lines",
      "Lead weekly sprint planning and stakeholder reviews",
      "Define success metrics and drive data-informed decisions",
      "Collaborate with engineering, design, and commercial teams",
      "Run customer discovery sessions and synthesise insights",
    ],
    requirements: [
      "5+ years of product management experience",
      "Track record of launching B2B SaaS products",
      "Strong analytical skills and data literacy",
      "Excellent stakeholder communication",
      "Experience with agile methodologies",
    ],
    skills: ["Product Strategy", "Roadmapping", "Data Analysis", "Agile", "Stakeholder Management", "B2B SaaS"],
    proofRequired: true,
    proofTypes: ["portfolio", "case study", "reference"],
    visionAreas: ["Career", "Wealth", "Knowledge"],
    views: 342,
    applicants: 47,
    recruiterId: "r1",
  },
  {
    id: "j2",
    title: "Full-Stack Engineer",
    company: "Bloom Health",
    companyLogo: "🌿",
    companySummary: "Bloom Health is a digital health platform helping 2M+ people manage chronic conditions through AI-driven insights.",
    industry: "Health Technology",
    companySize: "51–200 employees",
    salary: "£75,000 – £95,000",
    salaryMin: 75000,
    salaryMax: 95000,
    location: "Remote (UK)",
    remote: true,
    type: "remote",
    difficulty: "mid",
    postedDaysAgo: 5,
    featured: true,
    description: "Join our engineering team to build the next generation of our health platform. You'll work across the full stack with React, Node, and PostgreSQL.",
    responsibilities: [
      "Build and ship product features end-to-end",
      "Write clean, tested, well-documented code",
      "Participate in architecture decisions",
      "Mentor junior developers",
      "Work closely with designers and PMs",
    ],
    requirements: [
      "3+ years full-stack experience",
      "Strong TypeScript / React skills",
      "Node.js and PostgreSQL proficiency",
      "Experience with cloud infrastructure (AWS/GCP)",
      "Good eye for UI/UX",
    ],
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS", "REST APIs"],
    proofRequired: true,
    proofTypes: ["code sample", "GitHub portfolio", "live project"],
    visionAreas: ["Career", "Knowledge", "Health"],
    views: 218,
    applicants: 31,
    recruiterId: "r1",
  },
  {
    id: "j3",
    title: "Head of Growth",
    company: "VentureFlow",
    companyLogo: "📈",
    companySummary: "VentureFlow helps early-stage startups grow from zero to Series A with data-driven growth frameworks.",
    industry: "Consulting",
    companySize: "11–50 employees",
    salary: "£90,000 – £130,000 + equity",
    salaryMin: 90000,
    salaryMax: 130000,
    location: "London / Remote",
    remote: true,
    type: "full-time",
    difficulty: "lead",
    postedDaysAgo: 1,
    featured: true,
    description: "We need a growth leader who can build systems, not just run campaigns. You'll define our growth strategy and build the team.",
    responsibilities: [
      "Own all growth channels (paid, organic, product-led)",
      "Build and lead a 4-person growth team",
      "Design and run growth experiments",
      "Report directly to the CEO",
      "Partner with product on PLG initiatives",
    ],
    requirements: [
      "7+ years in growth, marketing, or product",
      "Proven ability to scale user acquisition 10x",
      "Strong analytical skills (SQL preferred)",
      "Leadership experience",
      "Startup experience preferred",
    ],
    skills: ["Growth Strategy", "SEO", "Paid Acquisition", "Analytics", "SQL", "Team Leadership"],
    proofRequired: true,
    proofTypes: ["case study", "metrics evidence", "reference"],
    visionAreas: ["Career", "Wealth", "Legacy"],
    views: 481,
    applicants: 62,
    recruiterId: "r2",
  },
  {
    id: "j4",
    title: "UX Designer",
    company: "Craftify Studio",
    companyLogo: "🎨",
    companySummary: "Craftify Studio is an award-winning product design agency working with global brands and funded startups.",
    industry: "Design",
    companySize: "11–50 employees",
    salary: "£55,000 – £70,000",
    salaryMin: 55000,
    salaryMax: 70000,
    location: "Manchester, UK",
    remote: false,
    type: "full-time",
    difficulty: "mid",
    postedDaysAgo: 7,
    featured: false,
    description: "We're looking for a thoughtful UX designer to join our studio and help craft world-class digital experiences for our clients.",
    responsibilities: [
      "Lead UX research and usability testing",
      "Create wireframes, prototypes, and design specifications",
      "Collaborate with clients and developers",
      "Contribute to our design system",
    ],
    requirements: [
      "3+ years UX design experience",
      "Strong Figma skills",
      "Portfolio demonstrating research-led design",
      "Excellent communication skills",
    ],
    skills: ["Figma", "User Research", "Wireframing", "Prototyping", "Design Systems", "Usability Testing"],
    proofRequired: false,
    proofTypes: [],
    visionAreas: ["Career", "Knowledge"],
    views: 127,
    applicants: 19,
    recruiterId: "r2",
  },
  {
    id: "j5",
    title: "Executive Coach",
    company: "Peak Performance Group",
    companyLogo: "🏆",
    companySummary: "Peak Performance Group provides executive coaching, leadership development, and performance optimisation for C-suite executives.",
    industry: "Coaching & Consulting",
    companySize: "1–10 employees",
    salary: "£60,000 – £120,000 (OTE)",
    salaryMin: 60000,
    salaryMax: 120000,
    location: "Remote (Global)",
    remote: true,
    type: "contract",
    difficulty: "senior",
    postedDaysAgo: 3,
    featured: false,
    description: "Join our network of elite coaches. You'll work with senior leaders across finance, tech, and sport to unlock peak performance.",
    responsibilities: [
      "Coach C-suite and senior executives 1:1",
      "Design bespoke development programmes",
      "Facilitate team offsites and workshops",
      "Build long-term client relationships",
    ],
    requirements: [
      "ICF accreditation (ACC or PCC)",
      "5+ years coaching experience",
      "C-suite client experience",
      "Strong results track record",
    ],
    skills: ["Executive Coaching", "Leadership Development", "Facilitation", "Emotional Intelligence", "Performance Psychology"],
    proofRequired: true,
    proofTypes: ["accreditation", "client testimonial", "case study"],
    visionAreas: ["Career", "Legacy", "Relationships"],
    views: 94,
    applicants: 8,
    recruiterId: "r2",
  },
  {
    id: "j6",
    title: "Financial Analyst",
    company: "Meridian Capital",
    companyLogo: "💰",
    companySummary: "Meridian Capital is a boutique investment firm managing £2B in assets across private equity and growth equity.",
    industry: "Finance",
    companySize: "51–200 employees",
    salary: "£65,000 – £85,000 + bonus",
    salaryMin: 65000,
    salaryMax: 85000,
    location: "London, UK",
    remote: false,
    type: "full-time",
    difficulty: "mid",
    postedDaysAgo: 10,
    featured: false,
    description: "We're hiring a Financial Analyst to join our investment team. You'll support deal analysis, portfolio monitoring, and investor reporting.",
    responsibilities: [
      "Build and maintain financial models",
      "Analyse investment opportunities",
      "Prepare investor reports and presentations",
      "Monitor portfolio company performance",
    ],
    requirements: [
      "2+ years financial analysis experience",
      "Strong Excel and financial modelling skills",
      "ACA, CFA, or equivalent",
      "Detail-oriented with strong numeracy",
    ],
    skills: ["Financial Modelling", "Excel", "Valuation", "Due Diligence", "Investor Reporting", "CFA"],
    proofRequired: false,
    proofTypes: [],
    visionAreas: ["Career", "Wealth"],
    views: 203,
    applicants: 38,
    recruiterId: "r3",
  },
  {
    id: "j7",
    title: "Startup Founder in Residence",
    company: "Ignite Ventures",
    companyLogo: "🔥",
    companySummary: "Ignite Ventures backs exceptional founders at the idea stage, providing capital, co-founders, and a global network.",
    industry: "Venture Capital",
    companySize: "1–10 employees",
    salary: "£50,000 + equity stake",
    salaryMin: 50000,
    salaryMax: 50000,
    location: "London, UK",
    remote: true,
    type: "full-time",
    difficulty: "executive",
    postedDaysAgo: 4,
    featured: true,
    description: "Join us as a Founder in Residence. We'll back your idea. You bring the vision, drive, and executional horsepower — we bring the network and capital.",
    responsibilities: [
      "Identify a problem worth solving",
      "Validate with real customers",
      "Build an MVP with our support",
      "Pitch to the Ignite investment committee",
      "Launch and scale",
    ],
    requirements: [
      "Previous startup or leadership experience",
      "Evidence of exceptional executional ability",
      "High drive and resilience",
      "Ability to sell your vision",
    ],
    skills: ["Entrepreneurship", "Product Thinking", "Fundraising", "Leadership", "Resilience"],
    proofRequired: true,
    proofTypes: ["case study", "evidence of achievement", "video pitch"],
    visionAreas: ["Career", "Legacy", "Wealth", "Knowledge"],
    views: 567,
    applicants: 89,
    recruiterId: "r3",
  },
  {
    id: "j8",
    title: "Personal Trainer (Elite)",
    company: "Apex Performance",
    companyLogo: "💪",
    companySummary: "Apex Performance provides elite personal training and health coaching to high-performing professionals and athletes.",
    industry: "Health & Fitness",
    companySize: "11–50 employees",
    salary: "£45,000 – £80,000 (OTE)",
    salaryMin: 45000,
    salaryMax: 80000,
    location: "London, UK",
    remote: false,
    type: "full-time",
    difficulty: "mid",
    postedDaysAgo: 6,
    featured: false,
    description: "We're looking for an exceptional personal trainer to work with our high-performing client base. Results and professionalism are everything.",
    responsibilities: [
      "Deliver 1:1 and small group training sessions",
      "Design bespoke training programmes",
      "Track and report client progress",
      "Build long-term client relationships",
    ],
    requirements: [
      "Level 3 Personal Training qualification",
      "2+ years experience with premium clients",
      "Strength & conditioning background preferred",
      "Professional appearance and demeanour",
    ],
    skills: ["Strength & Conditioning", "Nutrition", "Programme Design", "Client Management", "Motivation"],
    proofRequired: true,
    proofTypes: ["qualification", "client result", "video"],
    visionAreas: ["Health", "Career", "Relationships"],
    views: 156,
    applicants: 22,
    recruiterId: "r3",
  },
];

/* ─── Demo Applications ─────────────────────────────────────── */

export const DEMO_APPLICATIONS: JobApplication[] = [
  {
    id: "app1", jobId: "j1", userId: "u2", userName: "Sarah M.",
    userTrustScore: 91, userBehaviourScore: 88,
    skills: ["Product Strategy", "Agile", "B2B SaaS", "Stakeholder Management"],
    proofAttached: true, cycleHistoryAttached: true, trustScoreAttached: true,
    status: "shortlisted", submittedAt: new Date("2026-06-12"), matchScore: 88,
    cyclesCompleted: 4, topProofTypes: ["case study", "portfolio"],
    coverNote: "I've led product at two Series B companies and am passionate about AI tooling.",
  },
  {
    id: "app2", jobId: "j1", userId: "u3", userName: "James K.",
    userTrustScore: 54, userBehaviourScore: 61,
    skills: ["Product Strategy", "Agile"],
    proofAttached: false, cycleHistoryAttached: false, trustScoreAttached: false,
    status: "pending", submittedAt: new Date("2026-06-13"), matchScore: 54,
    cyclesCompleted: 1, topProofTypes: [],
    coverNote: "Keen to transition from consulting to product.",
  },
  {
    id: "app3", jobId: "j1", userId: "u4", userName: "Amara D.",
    userTrustScore: 67, userBehaviourScore: 74,
    skills: ["Product Strategy", "Data Analysis", "Roadmapping", "B2B SaaS"],
    proofAttached: true, cycleHistoryAttached: true, trustScoreAttached: false,
    status: "reviewed", submittedAt: new Date("2026-06-11"), matchScore: 73,
    cyclesCompleted: 2, topProofTypes: ["portfolio"],
    coverNote: "4 years at fintech startups, now targeting enterprise SaaS.",
  },
  {
    id: "app4", jobId: "j7", userId: "u1", userName: "Francis C.",
    userTrustScore: 78, userBehaviourScore: 82,
    skills: ["Entrepreneurship", "Product Thinking", "Leadership", "Resilience"],
    proofAttached: true, cycleHistoryAttached: true, trustScoreAttached: true,
    status: "shortlisted", submittedAt: new Date("2026-06-10"), matchScore: 92,
    cyclesCompleted: 3, topProofTypes: ["case study", "evidence of achievement"],
    coverNote: "Building Percentile.One — P1 is both the product and the proof.",
  },
];

/* ─── Demo Recruiter Posts ───────────────────────────────────── */

export const DEMO_RECRUITER_POSTS: RecruiterPost[] = [
  { jobId: "j1", views: 342, applicants: 47, matches: 12, proofSubmissions: 18, status: "active" },
  { jobId: "j2", views: 218, applicants: 31, matches: 8,  proofSubmissions: 11, status: "active" },
  { jobId: "j3", views: 481, applicants: 62, matches: 21, proofSubmissions: 29, status: "active" },
];

/* ─── Mock Current User ──────────────────────────────────────── */

export const CURRENT_JOB_USER: JobUser = {
  id: "u1",
  name: "Francis Cobbinah",
  trustScore: 78,
  behaviourScore: 82,
  skills: ["Product Strategy", "Entrepreneurship", "Leadership", "TypeScript", "React", "Roadmapping", "Team Building"],
  visionAreas: ["Career", "Wealth", "Legacy", "Knowledge"],
  activeGoalTitles: ["Launch P1 MVP", "Build fundraising pipeline", "Improve public speaking"],
  proofCount: 23,
  cyclesCompleted: 3,
  currentCycleProgress: 62,
};

/* ═══════════════════════════════════════════════════════════════
   JOB MATCHING ENGINE
   ═══════════════════════════════════════════════════════════════ */

export class JobMatchingEngine {

  static matchByVision(user: JobUser, job: Job): number {
    const overlap = job.visionAreas.filter(a => user.visionAreas.includes(a));
    return Math.round((overlap.length / Math.max(job.visionAreas.length, 1)) * 100);
  }

  static matchByGoals(user: JobUser, job: Job): number {
    const goalWords = user.activeGoalTitles.join(" ").toLowerCase();
    const skillHits = job.skills.filter(s =>
      goalWords.includes(s.toLowerCase()) ||
      user.skills.some(us => us.toLowerCase().includes(s.toLowerCase().split(" ")[0]))
    );
    return Math.round(Math.min((skillHits.length / Math.max(job.skills.length, 1)) * 130, 100));
  }

  static matchBySkills(user: JobUser, job: Job): number {
    const userSkillsLower = user.skills.map(s => s.toLowerCase());
    const hits = job.skills.filter(s => userSkillsLower.some(us =>
      us.includes(s.toLowerCase().split(" ")[0]) || s.toLowerCase().includes(us.split(" ")[0])
    ));
    return Math.round(Math.min((hits.length / Math.max(job.skills.length, 1)) * 120, 100));
  }

  static matchByProof(user: JobUser, job: Job): number {
    if (!job.proofRequired) return 85;
    const proofBase = Math.min((user.proofCount / 20) * 80, 80);
    const trustBonus = (user.trustScore / 100) * 20;
    return Math.round(proofBase + trustBonus);
  }

  static matchByCycle(user: JobUser, _job: Job): number {
    const cycleBase = Math.min(user.cyclesCompleted * 20, 60);
    const progressBonus = (user.currentCycleProgress / 100) * 40;
    return Math.round(cycleBase + progressBonus);
  }

  static matchByBehaviour(user: JobUser, _job: Job): number {
    return Math.round((user.behaviourScore * 0.6) + (user.trustScore * 0.4));
  }

  static overallMatchScore(user: JobUser, job: Job): JobMatchScore {
    const vision    = this.matchByVision(user, job);
    const goals     = this.matchByGoals(user, job);
    const skills    = this.matchBySkills(user, job);
    const proof     = this.matchByProof(user, job);
    const cycle     = this.matchByCycle(user, job);
    const behaviour = this.matchByBehaviour(user, job);

    const overall = Math.round(
      vision    * 0.20 +
      goals     * 0.15 +
      skills    * 0.30 +
      proof     * 0.15 +
      cycle     * 0.10 +
      behaviour * 0.10
    );

    const breakdown: string[] = [];
    if (vision >= 80)    breakdown.push("Strong vision alignment");
    if (skills >= 70)    breakdown.push("Good skills match");
    if (proof >= 75)     breakdown.push("Solid proof record");
    if (cycle >= 60)     breakdown.push("Active cycle demonstrates commitment");
    if (behaviour >= 75) breakdown.push("High trust & behaviour score");

    const strengths: string[] = [];
    const gaps: string[] = [];

    const userSkillsLower = user.skills.map(s => s.toLowerCase());
    job.skills.forEach(s => {
      const matched = userSkillsLower.some(us =>
        us.includes(s.toLowerCase().split(" ")[0]) || s.toLowerCase().includes(us.split(" ")[0])
      );
      if (matched) strengths.push(s);
      else gaps.push(s);
    });

    return { overall, vision, goals, skills, proof, cycle, behaviour, breakdown, strengths, gaps };
  }

  static getMatchLabel(score: number): string {
    if (score >= 85) return "Excellent Match";
    if (score >= 70) return "Strong Match";
    if (score >= 55) return "Good Match";
    if (score >= 40) return "Partial Match";
    return "Developing";
  }

  static getMatchColor(score: number): string {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-emerald-400";
    if (score >= 55) return "text-blue-400";
    if (score >= 40) return "text-amber-400";
    return "text-slate-400";
  }

  static getMatchBg(score: number): string {
    if (score >= 85) return "bg-green-500/10 border-green-500/20";
    if (score >= 70) return "bg-emerald-500/10 border-emerald-500/20";
    if (score >= 55) return "bg-blue-500/10 border-blue-500/20";
    if (score >= 40) return "bg-amber-500/10 border-amber-500/20";
    return "bg-slate-500/10 border-slate-500/20";
  }
}

/* ─── Helpers ───────────────────────────────────────────────── */

export function getJobById(id: string): Job | undefined {
  return DEMO_JOBS.find(j => j.id === id);
}

export function getApplicationsByJob(jobId: string): JobApplication[] {
  return DEMO_APPLICATIONS.filter(a => a.jobId === jobId);
}

export function getApplicationById(id: string): JobApplication | undefined {
  return DEMO_APPLICATIONS.find(a => a.id === id);
}

export function getFeaturedJobs(): Job[] {
  return DEMO_JOBS.filter(j => j.featured);
}

export function getTrendingJobs(): Job[] {
  return [...DEMO_JOBS].sort((a, b) => b.views - a.views).slice(0, 4);
}

export function getJobsForUser(user: JobUser): Job[] {
  return [...DEMO_JOBS]
    .map(j => ({ job: j, score: JobMatchingEngine.overallMatchScore(user, j).overall }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.job);
}

export function formatSalary(min: number, max: number): string {
  const fmt = (n: number) => n >= 1000 ? `£${Math.round(n / 1000)}k` : `£${n}`;
  return `${fmt(min)} – ${fmt(max)}`;
}

export function daysSince(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}