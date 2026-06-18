/* ══════════════════════════════════════════════════════════════
   CONTACTS + DISCOVERY ENGINE  v1.0
   ══════════════════════════════════════════════════════════════ */

export type Domain =
  | "Tradesmen" | "Musicians" | "Creatives" | "Coaches"
  | "Professionals" | "Developers" | "Designers" | "Fitness"
  | "Business";

export type Availability = "available" | "busy" | "open_to_work" | "unavailable";
export type RelationType  = "accepted" | "pending_sent" | "pending_recv" | "suggested" | "blocked";
export type ProofBadge    = "photo" | "video" | "certificate" | "testimonial" | "case_study" | "portfolio";

export interface Person {
  id: string;
  name: string;
  avatar?: string;          // initials fallback
  headline: string;
  domain: Domain;
  subdomain: string;
  location: string;
  country: string;
  skills: string[];
  visionAreas: string[];
  trustScore: number;
  behaviourScore: number;
  proofCount: number;
  proofBadges: ProofBadge[];
  cyclesCompleted: number;
  currentCycleWeek?: number;
  streakDays: number;
  rate?: string;            // "£60/hr", "£450/day", "POA"
  availability: Availability;
  bio: string;
  goals: string[];          // goal titles
  achievements: string[];
  activeGoalSimilarity?: number; // pre-computed similarity
}

export interface ContactRelation {
  personId: string;
  type: RelationType;
  connectedSince?: Date;
}

export interface DiscoveryMatchScore {
  overall: number;
  domain: number;
  vision: number;
  goals: number;
  proof: number;
  trust: number;
  cycle: number;
  location: number;
  breakdown: string[];
}

export interface DomainConfig {
  label: Domain;
  emoji: string;
  color: string;
  subdomains: string[];
  description: string;
}

/* ─── Domain Config ─────────────────────────────────────────── */

export const DOMAINS: DomainConfig[] = [
  {
    label: "Tradesmen",
    emoji: "🔧",
    color: "text-orange-400",
    subdomains: ["Electrician", "Plumber", "Carpenter", "Painter & Decorator", "Builder", "Roofer", "Tiler", "Plasterer", "Landscaper"],
    description: "Skilled tradespeople with verified work records",
  },
  {
    label: "Musicians",
    emoji: "🎵",
    color: "text-pink-400",
    subdomains: ["Singer / Vocalist", "Guitarist", "DJ", "Music Producer", "Drummer", "Pianist / Keyboardist", "Bassist", "Violinist", "Session Musician"],
    description: "Professional musicians, session artists, and performers",
  },
  {
    label: "Creatives",
    emoji: "🎨",
    color: "text-violet-400",
    subdomains: ["Photographer", "Videographer", "Graphic Designer", "Illustrator", "Content Creator", "Copywriter", "Animator", "Brand Strategist"],
    description: "Creative professionals with portfolios of verified work",
  },
  {
    label: "Coaches",
    emoji: "🏆",
    color: "text-amber-400",
    subdomains: ["Life Coach", "Business Coach", "Executive Coach", "Fitness Coach", "Mindset Coach", "Career Coach", "Relationship Coach", "Accountability Partner"],
    description: "Certified coaches and mentors across all life domains",
  },
  {
    label: "Professionals",
    emoji: "💼",
    color: "text-blue-400",
    subdomains: ["Lawyer / Solicitor", "Accountant", "Financial Advisor", "HR Consultant", "Marketing Consultant", "Business Analyst", "Project Manager", "Strategy Consultant"],
    description: "Qualified professionals with verified credentials",
  },
  {
    label: "Developers",
    emoji: "💻",
    color: "text-indigo-400",
    subdomains: ["Frontend Developer", "Backend Developer", "Full-Stack Developer", "Mobile Developer", "DevOps Engineer", "AI/ML Engineer", "Blockchain Developer", "QA Engineer"],
    description: "Software engineers and technical specialists",
  },
  {
    label: "Designers",
    emoji: "✏️",
    color: "text-teal-400",
    subdomains: ["UI/UX Designer", "Brand Designer", "Product Designer", "Motion Designer", "Web Designer", "Interior Designer", "Fashion Designer", "Packaging Designer"],
    description: "Designers with proof-backed creative portfolios",
  },
  {
    label: "Fitness",
    emoji: "💪",
    color: "text-green-400",
    subdomains: ["Personal Trainer", "Nutritionist", "Yoga Instructor", "CrossFit Coach", "Sports Therapist", "Pilates Instructor", "Running Coach", "Strength Coach"],
    description: "Fitness professionals with verified client results",
  },
  {
    label: "Business",
    emoji: "📈",
    color: "text-cyan-400",
    subdomains: ["Entrepreneur", "Startup Founder", "Investor / VC", "Sales Professional", "Growth Hacker", "Operations Lead", "Product Manager", "Business Development"],
    description: "Business builders, founders, and growth professionals",
  },
];

/* ─── Demo People (25 individuals) ──────────────────────────── */

export const DEMO_PEOPLE: Person[] = [
  // --- Tradesmen ---
  {
    id: "p1", name: "Marcus Webb", avatar: "MW",
    headline: "Master Electrician · 15 years experience",
    domain: "Tradesmen", subdomain: "Electrician",
    location: "London", country: "UK",
    skills: ["Domestic wiring", "Commercial installations", "EV charging points", "Solar panels", "NICEIC certified"],
    visionAreas: ["Career", "Wealth", "Family"],
    trustScore: 94, behaviourScore: 91, proofCount: 38, proofBadges: ["photo", "certificate", "testimonial"],
    cyclesCompleted: 3, currentCycleWeek: 6, streakDays: 21,
    rate: "£65/hr", availability: "available",
    bio: "NICEIC registered electrician specialising in domestic rewires, extensions, and EV charging. 15 years in the trade with 200+ completed projects.",
    goals: ["Expand to commercial projects", "Train apprentice", "Build 5-star review portfolio"],
    achievements: ["200+ projects completed", "Zero fault-backs in 5 years", "NICEIC Part P certified"],
  },
  {
    id: "p2", name: "Danny Okafor", avatar: "DO",
    headline: "Plumber & Gas Engineer · Emergency specialist",
    domain: "Tradesmen", subdomain: "Plumber",
    location: "Essex", country: "UK",
    skills: ["Boiler installation", "Gas safe", "Emergency repairs", "Bathroom fitting", "Underfloor heating"],
    visionAreas: ["Career", "Family", "Wealth"],
    trustScore: 87, behaviourScore: 83, proofCount: 24, proofBadges: ["photo", "testimonial", "certificate"],
    cyclesCompleted: 2, currentCycleWeek: 6, streakDays: 14,
    rate: "£55/hr", availability: "available",
    bio: "Gas Safe registered plumber with 10 years experience. Specialist in boiler replacements and bathroom renovations. Colchester & Essex based.",
    goals: ["Get 50 five-star reviews", "Train for commercial gas", "Buy a van and grow the team"],
    achievements: ["Gas Safe registered", "200+ boiler installs", "Emergency callout within 2 hours"],
  },
  {
    id: "p3", name: "Tom Hartley", avatar: "TH",
    headline: "Master Carpenter & Joiner",
    domain: "Tradesmen", subdomain: "Carpenter",
    location: "Manchester", country: "UK",
    skills: ["Bespoke furniture", "Kitchen fitting", "Loft conversions", "Staircase renovation", "Period property restoration"],
    visionAreas: ["Career", "Knowledge", "Legacy"],
    trustScore: 89, behaviourScore: 86, proofCount: 31, proofBadges: ["photo", "video", "portfolio"],
    cyclesCompleted: 4, streakDays: 28,
    rate: "£50/hr", availability: "busy",
    bio: "Bespoke joinery and carpentry across Manchester. Specialising in period property restoration and high-end kitchen installs.",
    goals: ["Open a workshop", "Launch YouTube channel", "Win a regional design award"],
    achievements: ["Featured in Manchester Evening News", "Period property restoration at Didsbury Manor", "4.9★ on Checkatrade"],
  },

  // --- Musicians ---
  {
    id: "p4", name: "Layla Ahmed", avatar: "LA",
    headline: "Professional Singer & Vocal Coach",
    domain: "Musicians", subdomain: "Singer / Vocalist",
    location: "London", country: "UK",
    skills: ["Jazz", "Soul", "Session singing", "Vocal coaching", "Songwriting", "Live performance"],
    visionAreas: ["Career", "Legacy", "Relationships"],
    trustScore: 88, behaviourScore: 85, proofCount: 19, proofBadges: ["video", "testimonial", "portfolio"],
    cyclesCompleted: 2, currentCycleWeek: 6, streakDays: 19,
    rate: "£300/event", availability: "open_to_work",
    bio: "Jazz and soul vocalist based in London. Session singer for major labels and live performer at corporate events, weddings, and festivals.",
    goals: ["Release debut EP", "Perform at Ronnie Scott's", "Grow to 10k followers"],
    achievements: ["Performed at Jazz Café London", "Session vocals on 3 chart albums", "500 vocal coaching students"],
  },
  {
    id: "p5", name: "Chris Baxter", avatar: "CB",
    headline: "DJ & Music Producer · House & Techno",
    domain: "Musicians", subdomain: "DJ",
    location: "Birmingham", country: "UK",
    skills: ["DJ (House, Techno)", "Ableton Live", "Track production", "Event management", "A&R"],
    visionAreas: ["Career", "Legacy", "Knowledge"],
    trustScore: 79, behaviourScore: 76, proofCount: 14, proofBadges: ["video", "portfolio"],
    cyclesCompleted: 1, currentCycleWeek: 8, streakDays: 7,
    rate: "£500/night", availability: "available",
    bio: "House and techno DJ with 8 years of club experience. Resident at Fabric Birmingham. Producing original tracks for 3 years.",
    goals: ["Release on a Berlin label", "Get booked at Fabric London", "Hit 50k SoundCloud plays"],
    achievements: ["Fabric Birmingham resident", "2 original releases", "Support for Bicep (2025)"],
  },

  // --- Creatives ---
  {
    id: "p6", name: "Priya Nair", avatar: "PN",
    headline: "Brand Photographer & Creative Director",
    domain: "Creatives", subdomain: "Photographer",
    location: "London", country: "UK",
    skills: ["Brand photography", "Product shoots", "Portrait", "Art direction", "Post-production"],
    visionAreas: ["Career", "Legacy", "Knowledge"],
    trustScore: 92, behaviourScore: 89, proofCount: 45, proofBadges: ["photo", "portfolio", "testimonial"],
    cyclesCompleted: 5, streakDays: 42,
    rate: "£800/day", availability: "busy",
    bio: "Award-winning brand and commercial photographer with 12 years experience. Clients include Nike, Burberry, and Channel 4.",
    goals: ["Launch editorial agency", "First solo gallery exhibition", "Mentor 5 emerging photographers"],
    achievements: ["Association of Photographers Award 2025", "Nike UK brand shoot", "Feature in British Journal of Photography"],
  },
  {
    id: "p7", name: "Alex Summers", avatar: "AS",
    headline: "Motion Designer & Video Producer",
    domain: "Creatives", subdomain: "Videographer",
    location: "Remote", country: "UK",
    skills: ["After Effects", "Premiere Pro", "Motion graphics", "Brand film", "Social content"],
    visionAreas: ["Career", "Knowledge", "Wealth"],
    trustScore: 82, behaviourScore: 80, proofCount: 22, proofBadges: ["video", "portfolio"],
    cyclesCompleted: 2, currentCycleWeek: 6, streakDays: 12,
    rate: "£600/day", availability: "available",
    bio: "Motion designer and video producer specialising in brand films, product launches, and social content. Remote-first.",
    goals: ["Launch YouTube channel", "Build SaaS brand clients", "Hit £100k revenue"],
    achievements: ["30+ brand films delivered", "Cannes Lions finalist entry 2025", "500k+ video views across client content"],
  },

  // --- Coaches ---
  {
    id: "p8", name: "Diana Mensah", avatar: "DM",
    headline: "Executive Coach & Leadership Strategist",
    domain: "Coaches", subdomain: "Executive Coach",
    location: "London", country: "UK",
    skills: ["Executive coaching", "Leadership development", "DEI strategy", "Presentation skills", "Career transition"],
    visionAreas: ["Career", "Legacy", "Relationships", "Knowledge"],
    trustScore: 95, behaviourScore: 93, proofCount: 41, proofBadges: ["certificate", "testimonial", "case_study"],
    cyclesCompleted: 6, streakDays: 56,
    rate: "£350/session", availability: "open_to_work",
    bio: "ICF PCC certified executive coach with 14 years experience. Former Head of Talent at Goldman Sachs. Coaches C-suite leaders across FTSE 100.",
    goals: ["Publish leadership book", "Scale to £1M coaching revenue", "Build a 10-person coaching firm"],
    achievements: ["ICF PCC Certification", "50+ C-suite clients", "TEDx talk: 'The Honest Leader' (180k views)"],
  },
  {
    id: "p9", name: "Ryan Shah", avatar: "RS",
    headline: "Business Coach · Startups & Scale-ups",
    domain: "Coaches", subdomain: "Business Coach",
    location: "Remote", country: "UK",
    skills: ["Business strategy", "Revenue growth", "Fundraising", "Team building", "OKRs"],
    visionAreas: ["Career", "Wealth", "Legacy", "Knowledge"],
    trustScore: 86, behaviourScore: 84, proofCount: 27, proofBadges: ["testimonial", "case_study"],
    cyclesCompleted: 4, currentCycleWeek: 6, streakDays: 35,
    rate: "£250/session", availability: "available",
    bio: "Business coach for founders. Previously scaled two startups to acquisition. Now helping 0–1 founders build repeatable revenue.",
    goals: ["Help 100 founders reach Series A", "Launch mastermind community", "Write case study book"],
    achievements: ["40+ startup clients", "3 portfolio companies acquired", "EF mentor 2024–25"],
  },

  // --- Professionals ---
  {
    id: "p10", name: "Claire Foster", avatar: "CF",
    headline: "Startup Lawyer · Contracts & IP",
    domain: "Professionals", subdomain: "Lawyer / Solicitor",
    location: "London", country: "UK",
    skills: ["Startup law", "IP protection", "Investor agreements", "Employment contracts", "SEIS/EIS"],
    visionAreas: ["Career", "Wealth", "Knowledge"],
    trustScore: 91, behaviourScore: 88, proofCount: 33, proofBadges: ["certificate", "testimonial"],
    cyclesCompleted: 3, streakDays: 22,
    rate: "£300/hr", availability: "open_to_work",
    bio: "Solicitor specialising in startup law, IP, and investment agreements. Advised 150+ early-stage companies on their first funding rounds.",
    goals: ["Launch legal tech product", "Partner at a firm", "Write a startup legal guide"],
    achievements: ["150+ startup clients", "£200M+ in deals advised", "Legal 500 recommended lawyer"],
  },
  {
    id: "p11", name: "James Nwosu", avatar: "JN",
    headline: "Chartered Accountant · Startups & Freelancers",
    domain: "Professionals", subdomain: "Accountant",
    location: "Essex", country: "UK",
    skills: ["Tax planning", "Bookkeeping", "HMRC submissions", "Payroll", "R&D tax credits", "Financial forecasting"],
    visionAreas: ["Career", "Wealth", "Family"],
    trustScore: 88, behaviourScore: 85, proofCount: 28, proofBadges: ["certificate", "testimonial"],
    cyclesCompleted: 2, currentCycleWeek: 6, streakDays: 17,
    rate: "£150/hr", availability: "available",
    bio: "Chartered accountant based in Essex specialising in startups, freelancers, and small businesses. HMRC-authorised tax agent.",
    goals: ["Build SaaS accounting tool", "Grow to 200 clients", "Move to fully digital practice"],
    achievements: ["ICAEW Chartered Accountant", "200+ clients served", "R&D tax credits specialist"],
  },

  // --- Developers ---
  {
    id: "p12", name: "Aisha Mohammed", avatar: "AM",
    headline: "Senior Full-Stack Developer · React & Node",
    domain: "Developers", subdomain: "Full-Stack Developer",
    location: "Remote", country: "UK",
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS", "Tailwind CSS", "Next.js"],
    visionAreas: ["Career", "Knowledge", "Wealth"],
    trustScore: 90, behaviourScore: 88, proofCount: 36, proofBadges: ["portfolio", "certificate", "case_study"],
    cyclesCompleted: 4, currentCycleWeek: 6, streakDays: 30,
    rate: "£650/day", availability: "open_to_work",
    bio: "Senior full-stack engineer with 8 years experience. Built products for fintech, healthtech, and SaaS. Remote-first. Open to contract and perm.",
    goals: ["Launch SaaS product", "Speak at React Conference", "Reach £150k/yr contracting"],
    achievements: ["Shipped 15+ production apps", "Open-source contributor (2.1k stars)", "AWS Certified Solutions Architect"],
  },
  {
    id: "p13", name: "Ben Carter", avatar: "BC",
    headline: "AI/ML Engineer · LLMs & Computer Vision",
    domain: "Developers", subdomain: "AI/ML Engineer",
    location: "London", country: "UK",
    skills: ["Python", "PyTorch", "LLMs", "RAG systems", "Computer vision", "FastAPI", "Azure"],
    visionAreas: ["Career", "Knowledge", "Legacy"],
    trustScore: 85, behaviourScore: 82, proofCount: 21, proofBadges: ["portfolio", "certificate"],
    cyclesCompleted: 3, currentCycleWeek: 7, streakDays: 18,
    rate: "£800/day", availability: "busy",
    bio: "ML engineer specialising in LLM fine-tuning and production AI systems. Previously at DeepMind. Now consulting for funded startups.",
    goals: ["Publish research paper", "Build AI startup", "Speak at NeurIPS"],
    achievements: ["DeepMind alumni", "3 published papers", "Azure AI 900 & 102 certified"],
  },

  // --- Designers ---
  {
    id: "p14", name: "Sophie Kim", avatar: "SK",
    headline: "Product Designer · SaaS & Fintech",
    domain: "Designers", subdomain: "Product Designer",
    location: "London", country: "UK",
    skills: ["Figma", "User research", "Design systems", "Prototyping", "Usability testing", "Motion design"],
    visionAreas: ["Career", "Knowledge", "Legacy"],
    trustScore: 93, behaviourScore: 90, proofCount: 40, proofBadges: ["portfolio", "case_study", "testimonial"],
    cyclesCompleted: 5, streakDays: 48,
    rate: "£700/day", availability: "open_to_work",
    bio: "Senior product designer with 10 years in SaaS and fintech. Led design at two Series B startups. Available for senior IC and lead roles.",
    goals: ["Head of Design at a unicorn", "Launch design course", "Open-source design system"],
    achievements: ["Reddot Design Award 2024", "Design lead at 2 exits", "Figma Advocate Community member"],
  },
  {
    id: "p15", name: "Kai Osei", avatar: "KO",
    headline: "Brand Designer & Visual Storyteller",
    domain: "Designers", subdomain: "Brand Designer",
    location: "Birmingham", country: "UK",
    skills: ["Brand identity", "Logo design", "Typography", "Packaging", "Illustrator", "Canva for Teams"],
    visionAreas: ["Career", "Legacy", "Knowledge"],
    trustScore: 81, behaviourScore: 79, proofCount: 18, proofBadges: ["portfolio", "photo"],
    cyclesCompleted: 2, currentCycleWeek: 4, streakDays: 9,
    rate: "£450/day", availability: "available",
    bio: "Brand designer helping startups and growing businesses build visual identities that stick. Based in Birmingham, working globally.",
    goals: ["Win a D&AD pencil", "100 brands in portfolio", "Launch brand kit product"],
    achievements: ["80+ brands created", "Featured in Creative Review", "Rebrand of the Year nominee 2024"],
  },

  // --- Fitness ---
  {
    id: "p16", name: "Jade Williams", avatar: "JW",
    headline: "Elite Personal Trainer · Strength & Transformation",
    domain: "Fitness", subdomain: "Personal Trainer",
    location: "London", country: "UK",
    skills: ["Strength & conditioning", "Nutrition planning", "Body recomposition", "Sports performance", "Mental resilience"],
    visionAreas: ["Health", "Career", "Relationships"],
    trustScore: 90, behaviourScore: 88, proofCount: 32, proofBadges: ["photo", "video", "testimonial"],
    cyclesCompleted: 4, currentCycleWeek: 6, streakDays: 60,
    rate: "£80/session", availability: "available",
    bio: "Level 4 personal trainer specialising in body recomposition and athletic performance. 8 years experience, 150+ transformation clients.",
    goals: ["Open boutique gym", "Launch online programme", "Train professional athlete"],
    achievements: ["150+ client transformations", "Level 4 NSCA certified", "Instagram 45k fitness followers"],
  },
  {
    id: "p17", name: "Omar Hassan", avatar: "OH",
    headline: "Sports Nutritionist & Performance Coach",
    domain: "Fitness", subdomain: "Nutritionist",
    location: "Manchester", country: "UK",
    skills: ["Performance nutrition", "Weight management", "Supplement protocols", "Meal planning", "Sports science"],
    visionAreas: ["Health", "Knowledge", "Career"],
    trustScore: 86, behaviourScore: 84, proofCount: 23, proofBadges: ["certificate", "testimonial"],
    cyclesCompleted: 3, currentCycleWeek: 5, streakDays: 24,
    rate: "£100/session", availability: "open_to_work",
    bio: "SENr registered sports nutritionist. Works with Premier League academies and elite amateur athletes. Manchester-based, remote consultations available.",
    goals: ["Publish nutrition book", "Partner with sports club", "Build online client base to 100"],
    achievements: ["SENr registered", "Premier League academy partnership", "200+ athletes coached"],
  },

  // --- Business ---
  {
    id: "p18", name: "Fatima Al-Rashid", avatar: "FA",
    headline: "Founder & Startup Investor · EdTech & SaaS",
    domain: "Business", subdomain: "Startup Founder",
    location: "London", country: "UK",
    skills: ["Fundraising", "Product strategy", "GTM", "Investor relations", "Team building", "EdTech"],
    visionAreas: ["Career", "Legacy", "Wealth", "Knowledge"],
    trustScore: 96, behaviourScore: 94, proofCount: 52, proofBadges: ["case_study", "testimonial", "certificate"],
    cyclesCompleted: 7, streakDays: 72,
    rate: "POA", availability: "open_to_work",
    bio: "2× founder (EdTech exit 2022, SaaS Series A 2024). Now angel investing and advising early-stage founders. Passion for mission-driven tech.",
    goals: ["3 portfolio companies to Series A", "Write a founders' handbook", "Start a scholarship fund"],
    achievements: ["2 company exits", "£8M raised across ventures", "Forbes 30 Under 30 2021"],
  },
  {
    id: "p19", name: "David Obi", avatar: "DB",
    headline: "Growth Hacker & Marketing Lead",
    domain: "Business", subdomain: "Growth Hacker",
    location: "Remote", country: "UK",
    skills: ["SEO", "Paid acquisition", "Email marketing", "A/B testing", "Analytics", "CRO", "Product-led growth"],
    visionAreas: ["Career", "Wealth", "Knowledge"],
    trustScore: 83, behaviourScore: 80, proofCount: 20, proofBadges: ["case_study", "portfolio"],
    cyclesCompleted: 2, currentCycleWeek: 9, streakDays: 11,
    rate: "£500/day", availability: "available",
    bio: "Growth marketer who has scaled B2B SaaS from 0 to £5M ARR. Specialist in PLG, SEO content, and paid acquisition for tech companies.",
    goals: ["Scale a SaaS to £10M ARR", "Launch growth agency", "Speak at SaaStr"],
    achievements: ["0→£5M ARR at 2 companies", "300% organic traffic growth in 12 months", "HubSpot partner"],
  },
  {
    id: "p20", name: "Sarah Mitchell", avatar: "SM",
    headline: "Operations Director & Scale-up Specialist",
    domain: "Business", subdomain: "Operations Lead",
    location: "London", country: "UK",
    skills: ["Ops strategy", "Process design", "OKRs", "Team scaling", "ERP implementation", "Cost reduction"],
    visionAreas: ["Career", "Family", "Knowledge"],
    trustScore: 89, behaviourScore: 87, proofCount: 29, proofBadges: ["testimonial", "case_study"],
    cyclesCompleted: 3, currentCycleWeek: 6, streakDays: 26,
    rate: "£600/day", availability: "open_to_work",
    bio: "COO-level operator who has scaled teams from 10 to 200+. Specialises in building operational systems that survive rapid growth.",
    goals: ["COO at a Series B company", "Write an ops playbook", "Launch ops consultancy"],
    achievements: ["Scaled 3 companies through Series B", "Reduced COGS by 40% at last role", "MBA from LBS"],
  },

  // --- Additional for variety ---
  {
    id: "p21", name: "Leo Park", avatar: "LP",
    headline: "Mobile Developer · React Native & Flutter",
    domain: "Developers", subdomain: "Mobile Developer",
    location: "Remote", country: "UK",
    skills: ["React Native", "Flutter", "iOS", "Android", "Firebase", "App Store Optimization"],
    visionAreas: ["Career", "Knowledge", "Wealth"],
    trustScore: 84, behaviourScore: 82, proofCount: 17, proofBadges: ["portfolio", "certificate"],
    cyclesCompleted: 2, currentCycleWeek: 6, streakDays: 13,
    rate: "£600/day", availability: "available",
    bio: "Mobile developer with 6 years experience shipping to App Store and Play Store. React Native and Flutter specialist.",
    goals: ["Launch own app with 10k users", "Contract at top-5 fintech", "Build dev community"],
    achievements: ["12 apps shipped to production", "5★ average on App Store", "Open source contributor"],
  },
  {
    id: "p22", name: "Nina Cross", avatar: "NC",
    headline: "Life & Mindset Coach · High Performance",
    domain: "Coaches", subdomain: "Mindset Coach",
    location: "Remote", country: "UK",
    skills: ["NLP", "Mindset coaching", "Goal setting", "Habit formation", "Accountability systems", "Journaling"],
    visionAreas: ["Health", "Career", "Relationships", "Spirituality"],
    trustScore: 87, behaviourScore: 85, proofCount: 24, proofBadges: ["testimonial", "certificate"],
    cyclesCompleted: 5, currentCycleWeek: 6, streakDays: 45,
    rate: "£150/session", availability: "available",
    bio: "Certified NLP practitioner and mindset coach. Specialises in helping high achievers break through mental blocks and build identity-level habits.",
    goals: ["Write a mindset book", "Reach 200 coaching clients", "Launch group accountability programme"],
    achievements: ["NLP Master Practitioner", "100+ clients coached", "Podcast: 'The Mindset Lab' (50k downloads)"],
  },
  {
    id: "p23", name: "Olumide Adeyemi", avatar: "OA",
    headline: "DevOps & Cloud Engineer · AWS & Kubernetes",
    domain: "Developers", subdomain: "DevOps Engineer",
    location: "London", country: "UK",
    skills: ["AWS", "Kubernetes", "Terraform", "CI/CD", "Docker", "Site reliability"],
    visionAreas: ["Career", "Knowledge", "Wealth"],
    trustScore: 88, behaviourScore: 86, proofCount: 25, proofBadges: ["certificate", "portfolio"],
    cyclesCompleted: 3, currentCycleWeek: 4, streakDays: 20,
    rate: "£750/day", availability: "available",
    bio: "Senior DevOps engineer with AWS Solutions Architect and Kubernetes certifications. Helping startups build scalable cloud infrastructure.",
    goals: ["Become AWS Distinguished Engineer", "Lead infra at a unicorn", "Create DevOps training course"],
    achievements: ["AWS SA Professional", "CKA certified", "Reduced cloud costs 60% at last client"],
  },
  {
    id: "p24", name: "Emma Beaumont", avatar: "EB",
    headline: "Yoga Instructor & Wellbeing Coach",
    domain: "Fitness", subdomain: "Yoga Instructor",
    location: "Essex", country: "UK",
    skills: ["Vinyasa yoga", "Yin yoga", "Breathwork", "Meditation", "Corporate wellbeing", "Retreats"],
    visionAreas: ["Health", "Spirituality", "Relationships"],
    trustScore: 85, behaviourScore: 83, proofCount: 16, proofBadges: ["video", "testimonial"],
    cyclesCompleted: 3, currentCycleWeek: 6, streakDays: 38,
    rate: "£60/session", availability: "available",
    bio: "200hr RYT certified yoga teacher and corporate wellbeing coach. Based in Essex, running retreats and online classes across the UK.",
    goals: ["Run annual retreat in Bali", "Build online membership to 500", "Train 10 yoga teachers"],
    achievements: ["200hr RYT certified", "Corporate clients: Lloyds, KPMG", "Annual retreat sold out 3 years running"],
  },
  {
    id: "p25", name: "Francis Cobbinah", avatar: "FC",
    headline: "Founder · Percentile.One",
    domain: "Business", subdomain: "Startup Founder",
    location: "Colchester", country: "UK",
    skills: ["Product Strategy", "Entrepreneurship", "Leadership", "TypeScript", "React", "Fundraising"],
    visionAreas: ["Career", "Wealth", "Legacy", "Knowledge"],
    trustScore: 78, behaviourScore: 82, proofCount: 23, proofBadges: ["portfolio", "case_study"],
    cyclesCompleted: 3, currentCycleWeek: 6, streakDays: 21,
    rate: "POA", availability: "open_to_work",
    bio: "Founder of Percentile.One — a personal transformation platform powered by AI, 12-week execution cycles, and a verified proof system.",
    goals: ["Launch P1 MVP", "Raise seed round", "Help 1M people close their gap"],
    achievements: ["P1 v0.1 shipped", "15+ product systems built", "3 successful cycles completed"],
  },
];

/* ─── Demo Relations ─────────────────────────────────────────── */

export const DEMO_RELATIONS: ContactRelation[] = [
  { personId: "p8",  type: "accepted",      connectedSince: new Date("2026-03-15") },
  { personId: "p12", type: "accepted",      connectedSince: new Date("2026-04-02") },
  { personId: "p18", type: "accepted",      connectedSince: new Date("2026-05-10") },
  { personId: "p14", type: "pending_sent"  },
  { personId: "p9",  type: "suggested"     },
  { personId: "p22", type: "suggested"     },
  { personId: "p7",  type: "suggested"     },
];

/* ─── Current User (mirrors CURRENT_JOB_USER) ───────────────── */

export interface DiscoveryUser {
  id: string;
  name: string;
  trustScore: number;
  behaviourScore: number;
  skills: string[];
  visionAreas: string[];
  activeGoalTitles: string[];
  proofCount: number;
  cyclesCompleted: number;
  currentCycleWeek: number;
  domain: Domain;
  subdomain: string;
  location: string;
}

export const CURRENT_DISCOVERY_USER: DiscoveryUser = {
  id: "p25",
  name: "Francis Cobbinah",
  trustScore: 78,
  behaviourScore: 82,
  skills: ["Product Strategy", "Entrepreneurship", "Leadership", "TypeScript", "React", "Fundraising"],
  visionAreas: ["Career", "Wealth", "Legacy", "Knowledge"],
  activeGoalTitles: ["Launch P1 MVP", "Build fundraising pipeline", "Improve public speaking"],
  proofCount: 23,
  cyclesCompleted: 3,
  currentCycleWeek: 6,
  domain: "Business",
  subdomain: "Startup Founder",
  location: "Colchester",
};

/* ═══════════════════════════════════════════════════════════════
   DISCOVERY MATCHING ENGINE
   ═══════════════════════════════════════════════════════════════ */

export class DiscoveryMatchingEngine {

  static matchByDomain(user: DiscoveryUser, person: Person): number {
    if (person.domain === user.domain) return 100;
    const relatedDomains: Partial<Record<Domain, Domain[]>> = {
      Business: ["Coaches", "Professionals"],
      Developers: ["Designers", "Business"],
      Creatives: ["Designers", "Musicians"],
      Fitness: ["Coaches"],
    };
    return relatedDomains[user.domain]?.includes(person.domain) ? 50 : 20;
  }

  static matchBySubdomain(user: DiscoveryUser, person: Person): number {
    if (person.subdomain === user.subdomain) return 100;
    return 30;
  }

  static matchByLocation(user: DiscoveryUser, person: Person): number {
    if (person.location.toLowerCase() === user.location.toLowerCase()) return 100;
    if (person.location === "Remote") return 80;
    return 30;
  }

  static matchByVision(user: DiscoveryUser, person: Person): number {
    const overlap = person.visionAreas.filter(a => user.visionAreas.includes(a));
    return Math.round((overlap.length / Math.max(person.visionAreas.length, 1)) * 100);
  }

  static matchByGoals(user: DiscoveryUser, person: Person): number {
    const userWords = user.activeGoalTitles.join(" ").toLowerCase();
    const hits = person.goals.filter(g => {
      const words = g.toLowerCase().split(" ");
      return words.some(w => w.length > 4 && userWords.includes(w));
    });
    return Math.round(Math.min((hits.length / Math.max(person.goals.length, 1)) * 120, 100));
  }

  static matchByProof(_user: DiscoveryUser, person: Person): number {
    const proofBase = Math.min((person.proofCount / 40) * 80, 80);
    return Math.round(proofBase + (person.trustScore / 100) * 20);
  }

  static matchByTrust(user: DiscoveryUser, person: Person): number {
    const trustDiff = Math.abs(person.trustScore - user.trustScore);
    return Math.round(Math.max(100 - trustDiff, 40));
  }

  static matchByCycle(user: DiscoveryUser, person: Person): number {
    const weekMatch = person.currentCycleWeek === user.currentCycleWeek ? 40 : 0;
    const cycleBase = Math.min(person.cyclesCompleted * 15, 60);
    return Math.round(cycleBase + weekMatch);
  }

  static overallMatchScore(user: DiscoveryUser, person: Person): DiscoveryMatchScore {
    if (person.id === user.id) return { overall: 100, domain: 100, vision: 100, goals: 100, proof: 100, trust: 100, cycle: 100, location: 100, breakdown: ["This is you"] };

    const domain   = this.matchByDomain(user, person);
    const vision   = this.matchByVision(user, person);
    const goals    = this.matchByGoals(user, person);
    const proof    = this.matchByProof(user, person);
    const trust    = this.matchByTrust(user, person);
    const cycle    = this.matchByCycle(user, person);
    const location = this.matchByLocation(user, person);

    const overall = Math.round(
      domain   * 0.10 +
      vision   * 0.25 +
      goals    * 0.20 +
      proof    * 0.15 +
      trust    * 0.15 +
      cycle    * 0.10 +
      location * 0.05
    );

    const breakdown: string[] = [];
    if (vision >= 75)   breakdown.push("Shared vision areas");
    if (goals >= 50)    breakdown.push("Similar active goals");
    if (cycle === user.currentCycleWeek) breakdown.push("Same cycle week");
    if (person.trustScore >= 85) breakdown.push("Highly trusted");
    if (person.availability === "available" || person.availability === "open_to_work") breakdown.push("Available now");

    return { overall, domain, vision, goals, proof, trust, cycle, location, breakdown };
  }

  static getLabel(score: number): string {
    if (score >= 85) return "Strong Match";
    if (score >= 70) return "Good Match";
    if (score >= 55) return "Potential";
    return "Explore";
  }

  static getColor(score: number): string {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-emerald-400";
    if (score >= 55) return "text-blue-400";
    return "text-slate-400";
  }

  static getBg(score: number): string {
    if (score >= 85) return "bg-green-500/10 border-green-500/20";
    if (score >= 70) return "bg-emerald-500/10 border-emerald-500/20";
    if (score >= 55) return "bg-blue-500/10 border-blue-500/20";
    return "bg-slate-500/10 border-slate-500/20";
  }
}

/* ─── Helpers ───────────────────────────────────────────────── */

export function getPersonById(id: string): Person | undefined {
  return DEMO_PEOPLE.find(p => p.id === id);
}

export function getPeopleByDomain(domain: string): Person[] {
  return DEMO_PEOPLE.filter(p => p.domain.toLowerCase() === domain.toLowerCase());
}

export function getPeopleBySubdomain(subdomain: string): Person[] {
  return DEMO_PEOPLE.filter(p => p.subdomain.toLowerCase() === subdomain.toLowerCase());
}

export function getPeopleByLocation(location: string): Person[] {
  return DEMO_PEOPLE.filter(p =>
    p.location.toLowerCase() === location.toLowerCase() || p.location === "Remote"
  );
}

export function getRelationType(personId: string): RelationType | undefined {
  return DEMO_RELATIONS.find(r => r.personId === personId)?.type;
}

export function getMyContacts(): Person[] {
  const accepted = DEMO_RELATIONS.filter(r => r.type === "accepted").map(r => r.personId);
  return DEMO_PEOPLE.filter(p => accepted.includes(p.id));
}

export function getSuggestedContacts(user: DiscoveryUser): Person[] {
  return DEMO_PEOPLE
    .filter(p => p.id !== user.id)
    .filter(p => !["accepted","pending_sent"].includes(getRelationType(p.id) ?? ""))
    .map(p => ({ person: p, score: DiscoveryMatchingEngine.overallMatchScore(user, p).overall }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.person);
}

export function availabilityLabel(a: Availability): string {
  return { available: "Available", busy: "Busy", open_to_work: "Open to work", unavailable: "Unavailable" }[a];
}

export function availabilityColor(a: Availability): string {
  return { available: "text-green-400", busy: "text-amber-400", open_to_work: "text-blue-400", unavailable: "text-slate-500" }[a];
}

export function domainConfig(domain: string): DomainConfig | undefined {
  return DOMAINS.find(d => d.label.toLowerCase() === domain.toLowerCase());
}