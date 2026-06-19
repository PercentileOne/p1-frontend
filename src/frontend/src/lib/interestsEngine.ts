/* ══════════════════════════════════════════════════════════════
   P1 INTERESTS ENGINE
   Full interest taxonomy + wall / story / feed / agent mappings
   ══════════════════════════════════════════════════════════════ */

// ── Category palette ──────────────────────────────────────────

export type InterestCategory =
  | "Personal Growth"
  | "Career & Skills"
  | "Trades & Crafts"
  | "Creativity & Art"
  | "Health & Fitness"
  | "Technology"
  | "Business & Finance"
  | "Lifestyle"
  | "Mental Health"
  | "Education"
  | "Spirituality"
  | "Custom";

export const CATEGORY_META: Record<InterestCategory, { color: string; bg: string; emoji: string }> = {
  "Personal Growth":   { color: "#6366f1", bg: "#6366f115", emoji: "🌱" },
  "Career & Skills":   { color: "#0ea5e9", bg: "#0ea5e915", emoji: "💼" },
  "Trades & Crafts":   { color: "#f97316", bg: "#f9731615", emoji: "🔧" },
  "Creativity & Art":  { color: "#ec4899", bg: "#ec489915", emoji: "🎨" },
  "Health & Fitness":  { color: "#22c55e", bg: "#22c55e15", emoji: "💪" },
  "Technology":        { color: "#8b5cf6", bg: "#8b5cf615", emoji: "💻" },
  "Business & Finance":{ color: "#f59e0b", bg: "#f59e0b15", emoji: "📈" },
  "Lifestyle":         { color: "#14b8a6", bg: "#14b8a615", emoji: "✈️" },
  "Mental Health":     { color: "#a78bfa", bg: "#a78bfa15", emoji: "🌊" },
  "Education":         { color: "#3b82f6", bg: "#3b82f615", emoji: "🎓" },
  "Spirituality":      { color: "#d97706", bg: "#d9770615", emoji: "🕯️" },
  "Custom":            { color: "#94a3b8", bg: "#94a3b815", emoji: "⭐" },
};

// ── Interest ──────────────────────────────────────────────────

export interface Interest {
  id: string;
  label: string;
  category: InterestCategory;
  emoji: string;
  wallIds?: string[];          // maps to Wall Explorer wall IDs
  storyCategories?: string[];  // maps to StoryCategory
  agentHint?: string;          // what the agent says about this interest
  feedTags?: string[];         // tags used to filter feed content
}

// ── Full interest catalogue ───────────────────────────────────

export const ALL_INTERESTS: Interest[] = [

  // ── Personal Growth ──────────────────────────────────────────
  { id: "stoicism",        label: "Stoicism",            category: "Personal Growth",   emoji: "🏛️",
    storyCategories: ["Life Lessons", "Hardship"], agentHint: "Stoic philosophy, Marcus Aurelius, resilience frameworks", feedTags: ["stoicism","philosophy","mindset"] },
  { id: "journaling",      label: "Journaling",          category: "Personal Growth",   emoji: "📓",
    storyCategories: ["Life Lessons", "Mental Health"], agentHint: "Daily reflection, morning pages, evening review", feedTags: ["journaling","reflection","writing"] },
  { id: "mindset",         label: "Growth Mindset",      category: "Personal Growth",   emoji: "🧠",
    storyCategories: ["Comeback Story", "Life Lessons"], agentHint: "Fixed vs growth mindset, Carol Dweck, neuroplasticity", feedTags: ["mindset","growth","learning"] },
  { id: "habits",          label: "Habit Building",      category: "Personal Growth",   emoji: "🔄",
    storyCategories: ["Life Lessons", "Career Journey"], agentHint: "Atomic Habits, habit stacking, streak tracking", feedTags: ["habits","routine","discipline"] },
  { id: "self-discipline", label: "Self-Discipline",     category: "Personal Growth",   emoji: "💪",
    storyCategories: ["Comeback Story", "Hardship"], agentHint: "Willpower science, delayed gratification, focus", feedTags: ["discipline","willpower","focus"] },
  { id: "confidence",      label: "Confidence",          category: "Personal Growth",   emoji: "🦁",
    storyCategories: ["Identity & Background", "Career Journey"], agentHint: "Self-belief, social confidence, imposter syndrome", feedTags: ["confidence","selfbelief","identity"] },
  { id: "purpose",         label: "Finding Purpose",     category: "Personal Growth",   emoji: "🧭",
    storyCategories: ["Life Lessons", "Career Journey"], agentHint: "Ikigai, meaning, mission discovery", feedTags: ["purpose","mission","meaning"] },
  { id: "productivity",    label: "Productivity",        category: "Personal Growth",   emoji: "⚡",
    storyCategories: ["Career Journey", "Life Lessons"], agentHint: "Deep work, time blocking, GTD, flow states", feedTags: ["productivity","focus","timemanagement"] },
  { id: "resilience",      label: "Resilience",          category: "Personal Growth",   emoji: "🌱",
    storyCategories: ["Hardship", "Comeback Story"], agentHint: "Bouncing back, post-traumatic growth, adversity", feedTags: ["resilience","comeback","hardship"] },
  { id: "clarity",         label: "Mental Clarity",      category: "Personal Growth",   emoji: "💎",
    storyCategories: ["Mental Health", "Life Lessons"], agentHint: "Cognitive load, mental models, decision-making", feedTags: ["clarity","mentalhealth","decisions"] },
  { id: "gratitude",       label: "Gratitude",           category: "Personal Growth",   emoji: "🙏",
    storyCategories: ["Life Lessons", "Mental Health"], agentHint: "Gratitude practice, positivity research, appreciation", feedTags: ["gratitude","wellbeing","positivity"] },
  { id: "identity",        label: "Identity & Reinvention", category: "Personal Growth",emoji: "🦋",
    storyCategories: ["Identity & Background", "Career Journey"], agentHint: "Who am I, reinvention, self-concept", feedTags: ["identity","reinvention","selfconcept"] },

  // ── Career & Skills ───────────────────────────────────────────
  { id: "career-change",   label: "Career Change",       category: "Career & Skills",   emoji: "🔀",
    wallIds: ["founders"], storyCategories: ["Career Journey", "Comeback Story"], agentHint: "Pivoting careers, skills transfer, retraining", feedTags: ["careerchange","pivot","skills"] },
  { id: "leadership",      label: "Leadership",          category: "Career & Skills",   emoji: "👑",
    wallIds: ["founders"], storyCategories: ["Founder Journey", "Career Journey"], agentHint: "Team leadership, management, influence", feedTags: ["leadership","management","influence"] },
  { id: "public-speaking", label: "Public Speaking",     category: "Career & Skills",   emoji: "🎤",
    storyCategories: ["Career Journey", "Life Lessons"], agentHint: "Stage fright, presentation skills, persuasion", feedTags: ["publicspeaking","presenting","communication"] },
  { id: "negotiation",     label: "Negotiation",         category: "Career & Skills",   emoji: "🤝",
    storyCategories: ["Career Journey", "Business & Finance"], agentHint: "Salary negotiation, deal-making, BATNA", feedTags: ["negotiation","deals","salary"] },
  { id: "networking",      label: "Networking",          category: "Career & Skills",   emoji: "🕸️",
    wallIds: ["founders","tech-london"], storyCategories: ["Career Journey"], agentHint: "Relationship building, warm introductions, LinkedIn", feedTags: ["networking","relationships","connections"] },
  { id: "cv-writing",      label: "CV & Interview Prep", category: "Career & Skills",   emoji: "📄",
    storyCategories: ["Career Journey", "Student Life"], agentHint: "Resume writing, interview techniques, job search", feedTags: ["cv","interview","jobsearch"] },
  { id: "freelancing",     label: "Freelancing",         category: "Career & Skills",   emoji: "🖥️",
    storyCategories: ["Career Journey", "Founder Journey"], agentHint: "Going solo, client acquisition, pricing", feedTags: ["freelancing","selfemployed","clients"] },
  { id: "mentorship",      label: "Mentorship",          category: "Career & Skills",   emoji: "🧑‍🏫",
    storyCategories: ["Life Lessons", "Career Journey"], agentHint: "Finding mentors, being mentored, coaching", feedTags: ["mentorship","coaching","guidance"] },
  { id: "project-mgmt",    label: "Project Management",  category: "Career & Skills",   emoji: "📋",
    wallIds: ["product-mgmt"], storyCategories: ["Career Journey"], agentHint: "Agile, Scrum, delivery, stakeholder management", feedTags: ["projectmanagement","agile","delivery"] },
  { id: "remote-work",     label: "Remote Work",         category: "Career & Skills",   emoji: "🏠",
    storyCategories: ["Career Journey", "Life Lessons"], agentHint: "Async work, home office, distributed teams", feedTags: ["remotework","wfh","async"] },

  // ── Trades & Crafts ───────────────────────────────────────────
  { id: "plumbing",        label: "Plumbing",            category: "Trades & Crafts",   emoji: "🔧",
    wallIds: ["plumbers-uk"], storyCategories: ["Trade Story", "Craft & Mastery"], agentHint: "Plumbing craft, pipework, trade business", feedTags: ["plumbing","trades","craftsmanship"] },
  { id: "carpentry",       label: "Carpentry & Joinery", category: "Trades & Crafts",   emoji: "🪚",
    wallIds: ["builders-uk"], storyCategories: ["Trade Story", "Craft & Mastery"], agentHint: "Woodwork, joinery, furniture making", feedTags: ["carpentry","woodwork","joinery"] },
  { id: "electrical",      label: "Electrical",          category: "Trades & Crafts",   emoji: "⚡",
    wallIds: ["builders-uk"], storyCategories: ["Trade Story", "Craft & Mastery"], agentHint: "Electrical installation, circuits, safety", feedTags: ["electrical","sparky","wiring"] },
  { id: "welding",         label: "Welding",             category: "Trades & Crafts",   emoji: "🔥",
    storyCategories: ["Trade Story", "Craft & Mastery"], agentHint: "MIG/TIG welding, fabrication, metalwork", feedTags: ["welding","metalwork","fabrication"] },
  { id: "painting-dec",    label: "Painting & Decorating",category: "Trades & Crafts",  emoji: "🖌️",
    storyCategories: ["Trade Story", "Craft & Mastery"], agentHint: "Interior painting, wallpaper, surface prep", feedTags: ["painting","decorating","interiors"] },
  { id: "hvac",            label: "HVAC",                category: "Trades & Crafts",   emoji: "🌡️",
    storyCategories: ["Trade Story", "Craft & Mastery"], agentHint: "Heating, ventilation, air conditioning, installation", feedTags: ["hvac","heating","aircon"] },
  { id: "masonry",         label: "Masonry & Bricklaying",category: "Trades & Crafts",  emoji: "🧱",
    storyCategories: ["Trade Story", "Craft & Mastery"], agentHint: "Bricklaying, stone masonry, concrete work", feedTags: ["masonry","bricklaying","construction"] },
  { id: "trade-business",  label: "Running a Trade Business",category: "Trades & Crafts",emoji: "🏢",
    wallIds: ["founders"], storyCategories: ["Trade Story", "Founder Journey"], agentHint: "Quoting, marketing a trade, hiring apprentices", feedTags: ["tradebusiness","tradesman","selfemployed"] },
  { id: "apprenticeship",  label: "Apprenticeships",     category: "Trades & Crafts",   emoji: "🎓",
    storyCategories: ["Trade Story", "Student Life"], agentHint: "Trade apprenticeships, NVQs, earn-while-you-learn", feedTags: ["apprenticeship","trades","training"] },
  { id: "craftsmanship",   label: "Craft & Mastery",     category: "Trades & Crafts",   emoji: "🏺",
    storyCategories: ["Craft & Mastery", "Life Lessons"], agentHint: "Mastery, deliberate practice, pride in work", feedTags: ["craftsmanship","mastery","quality"] },

  // ── Creativity & Art ──────────────────────────────────────────
  { id: "writing",         label: "Writing",             category: "Creativity & Art",  emoji: "✍️",
    storyCategories: ["Creativity & Art", "Life Lessons"], agentHint: "Creative writing, storytelling, content creation", feedTags: ["writing","storytelling","creativity"] },
  { id: "music",           label: "Music",               category: "Creativity & Art",  emoji: "🎵",
    wallIds: ["musicians-uk"], storyCategories: ["Creativity & Art", "Career Journey"], agentHint: "Music production, performance, songwriting", feedTags: ["music","production","songwriting"] },
  { id: "design",          label: "Design",              category: "Creativity & Art",  emoji: "🎨",
    wallIds: ["designers-uk"], storyCategories: ["Creativity & Art", "Career Journey"], agentHint: "UI/UX, graphic design, visual communication", feedTags: ["design","ux","visual"] },
  { id: "photography",     label: "Photography",         category: "Creativity & Art",  emoji: "📸",
    storyCategories: ["Creativity & Art", "Lifestyle"], agentHint: "Portrait, landscape, commercial photography", feedTags: ["photography","camera","visual"] },
  { id: "filmmaking",      label: "Filmmaking & Video",  category: "Creativity & Art",  emoji: "🎬",
    storyCategories: ["Creativity & Art", "Career Journey"], agentHint: "Short films, YouTube, documentary, storytelling", feedTags: ["film","video","filmmaking"] },
  { id: "illustration",    label: "Illustration",        category: "Creativity & Art",  emoji: "🖊️",
    storyCategories: ["Creativity & Art"], agentHint: "Digital illustration, character design, comics", feedTags: ["illustration","art","drawing"] },
  { id: "fashion",         label: "Fashion & Style",     category: "Creativity & Art",  emoji: "👔",
    storyCategories: ["Creativity & Art", "Identity & Background"], agentHint: "Personal style, fashion industry, brand", feedTags: ["fashion","style","clothing"] },
  { id: "architecture",    label: "Architecture",        category: "Creativity & Art",  emoji: "🏗️",
    storyCategories: ["Creativity & Art", "Career Journey"], agentHint: "Space design, architecture practice, urban design", feedTags: ["architecture","design","buildings"] },
  { id: "theatre",         label: "Theatre & Performance",category: "Creativity & Art",  emoji: "🎭",
    storyCategories: ["Creativity & Art", "Career Journey"], agentHint: "Acting, directing, performance craft", feedTags: ["theatre","acting","performance"] },
  { id: "dance",           label: "Dance",               category: "Creativity & Art",  emoji: "💃",
    storyCategories: ["Creativity & Art", "Health & Recovery"], agentHint: "Ballet, contemporary, street dance, choreography", feedTags: ["dance","movement","choreography"] },

  // ── Health & Fitness ──────────────────────────────────────────
  { id: "running",         label: "Running",             category: "Health & Fitness",  emoji: "🏃",
    storyCategories: ["Health & Recovery", "Comeback Story"], agentHint: "Marathon training, 5K, parkrun, injury recovery", feedTags: ["running","marathon","fitness"] },
  { id: "strength",        label: "Strength Training",   category: "Health & Fitness",  emoji: "🏋️",
    storyCategories: ["Health & Recovery", "Life Lessons"], agentHint: "Powerlifting, gym, progressive overload", feedTags: ["strengthtraining","lifting","gym"] },
  { id: "nutrition",       label: "Nutrition",           category: "Health & Fitness",  emoji: "🥗",
    storyCategories: ["Health & Recovery", "Life Lessons"], agentHint: "Diet, meal prep, macro tracking, gut health", feedTags: ["nutrition","diet","food"] },
  { id: "cycling",         label: "Cycling",             category: "Health & Fitness",  emoji: "🚴",
    storyCategories: ["Health & Recovery", "Life Lessons"], agentHint: "Road cycling, mountain biking, commuting", feedTags: ["cycling","biking","fitness"] },
  { id: "yoga",            label: "Yoga & Mindfulness",  category: "Health & Fitness",  emoji: "🧘",
    storyCategories: ["Mental Health", "Health & Recovery"], agentHint: "Yoga practice, breathwork, somatic awareness", feedTags: ["yoga","mindfulness","breathwork"] },
  { id: "martial-arts",    label: "Martial Arts",        category: "Health & Fitness",  emoji: "🥋",
    storyCategories: ["Health & Recovery", "Life Lessons"], agentHint: "Boxing, BJJ, MMA, discipline through sport", feedTags: ["martialarts","boxing","bjj"] },
  { id: "sport-comeback",  label: "Sport & Comeback",    category: "Health & Fitness",  emoji: "🏅",
    storyCategories: ["Comeback Story", "Health & Recovery"], agentHint: "Injury recovery, returning to sport, resilience", feedTags: ["sport","comeback","injury"] },
  { id: "sleep",           label: "Sleep & Recovery",    category: "Health & Fitness",  emoji: "😴",
    storyCategories: ["Health & Recovery", "Life Lessons"], agentHint: "Sleep quality, recovery protocols, chronobiology", feedTags: ["sleep","recovery","wellness"] },
  { id: "cold-exposure",   label: "Cold Exposure",       category: "Health & Fitness",  emoji: "🧊",
    storyCategories: ["Life Lessons", "Health & Recovery"], agentHint: "Cold showers, ice baths, Wim Hof, inflammation", feedTags: ["coldexposure","icebath","wimhof"] },
  { id: "biohacking",      label: "Biohacking",          category: "Health & Fitness",  emoji: "🔬",
    storyCategories: ["Life Lessons", "Health & Recovery"], agentHint: "HRV, continuous glucose, fasting, optimisation", feedTags: ["biohacking","optimisation","health"] },

  // ── Technology ────────────────────────────────────────────────
  { id: "coding",          label: "Coding",              category: "Technology",        emoji: "💻",
    wallIds: ["developers-uk","ai-builders-uk"], storyCategories: ["Career Journey", "Comeback Story"], agentHint: "Programming languages, software engineering, open source", feedTags: ["coding","programming","software"] },
  { id: "ai",              label: "AI & Machine Learning",category: "Technology",       emoji: "🤖",
    wallIds: ["ai-builders-uk"], storyCategories: ["Career Journey", "Technology"], agentHint: "LLMs, ML engineering, AI adoption, future of work", feedTags: ["ai","machinelearning","llm"] },
  { id: "product",         label: "Product Management",  category: "Technology",        emoji: "📋",
    wallIds: ["product-mgmt"], storyCategories: ["Career Journey", "Founder Journey"], agentHint: "Product thinking, roadmaps, user research, metrics", feedTags: ["product","ux","productmanagement"] },
  { id: "cybersecurity",   label: "Cybersecurity",       category: "Technology",        emoji: "🔐",
    storyCategories: ["Career Journey", "Technology"], agentHint: "InfoSec, ethical hacking, zero trust, compliance", feedTags: ["cybersecurity","infosec","hacking"] },
  { id: "cloud",           label: "Cloud Computing",     category: "Technology",        emoji: "☁️",
    storyCategories: ["Career Journey", "Technology"], agentHint: "AWS, GCP, Azure, DevOps, infrastructure", feedTags: ["cloud","devops","infrastructure"] },
  { id: "web3",            label: "Web3 & Crypto",       category: "Technology",        emoji: "⛓️",
    storyCategories: ["Career Journey", "Technology"], agentHint: "Blockchain, DeFi, NFTs, crypto investing", feedTags: ["web3","crypto","blockchain"] },
  { id: "no-code",         label: "No-Code & Low-Code",  category: "Technology",        emoji: "🛠️",
    wallIds: ["indie-hackers"], storyCategories: ["Career Journey", "Founder Journey"], agentHint: "Bubble, Webflow, Airtable, building without engineers", feedTags: ["nocode","lowcode","webflow"] },
  { id: "data",            label: "Data & Analytics",    category: "Technology",        emoji: "📊",
    storyCategories: ["Career Journey", "Technology"], agentHint: "SQL, Python, dashboards, data storytelling", feedTags: ["data","analytics","sql"] },
  { id: "ux-design",       label: "UX & Interface Design",category: "Technology",       emoji: "✏️",
    wallIds: ["designers-uk"], storyCategories: ["Career Journey", "Creativity & Art"], agentHint: "User experience, Figma, design systems, usability", feedTags: ["ux","design","figma"] },
  { id: "open-source",     label: "Open Source",         category: "Technology",        emoji: "🌐",
    storyCategories: ["Career Journey", "Community"], agentHint: "OSS contribution, GitHub, collaborative code", feedTags: ["opensource","github","community"] },

  // ── Business & Finance ────────────────────────────────────────
  { id: "startups",        label: "Startups",            category: "Business & Finance",emoji: "🚀",
    wallIds: ["founders","indie-hackers"], storyCategories: ["Founder Journey", "Career Journey"], agentHint: "Early-stage startups, founding teams, product-market fit", feedTags: ["startups","founder","entrepreneurship"] },
  { id: "investing",       label: "Investing",           category: "Business & Finance",emoji: "📈",
    storyCategories: ["Life Lessons", "Business & Finance"], agentHint: "Index funds, stocks, property, angel investing", feedTags: ["investing","finance","wealth"] },
  { id: "marketing",       label: "Marketing & Growth",  category: "Business & Finance",emoji: "📣",
    wallIds: ["founders"], storyCategories: ["Founder Journey", "Career Journey"], agentHint: "Content marketing, SEO, paid ads, community growth", feedTags: ["marketing","growth","seo"] },
  { id: "personal-finance",label: "Personal Finance",    category: "Business & Finance",emoji: "💰",
    storyCategories: ["Life Lessons", "Hardship"], agentHint: "Budgeting, debt clearing, saving, FIRE movement", feedTags: ["personalfinance","budgeting","money"] },
  { id: "sales",           label: "Sales",               category: "Business & Finance",emoji: "🎯",
    wallIds: ["founders"], storyCategories: ["Career Journey", "Founder Journey"], agentHint: "B2B sales, closing, pipeline management, consultative selling", feedTags: ["sales","closing","revenue"] },
  { id: "fundraising",     label: "Fundraising & VC",    category: "Business & Finance",emoji: "💸",
    wallIds: ["founders"], storyCategories: ["Founder Journey", "Hardship"], agentHint: "Seed rounds, pitch decks, VC relationships, term sheets", feedTags: ["fundraising","vc","investment"] },
  { id: "ecommerce",       label: "eCommerce",           category: "Business & Finance",emoji: "🛍️",
    wallIds: ["indie-hackers"], storyCategories: ["Founder Journey", "Career Journey"], agentHint: "Shopify, DTC brands, dropshipping, Amazon FBA", feedTags: ["ecommerce","shopify","dtc"] },
  { id: "real-estate",     label: "Real Estate",         category: "Business & Finance",emoji: "🏘️",
    storyCategories: ["Life Lessons", "Career Journey"], agentHint: "Buy-to-let, property development, REITs", feedTags: ["realestate","property","investing"] },
  { id: "build-in-public", label: "Build in Public",     category: "Business & Finance",emoji: "🔨",
    wallIds: ["founders","indie-hackers"], storyCategories: ["Founder Journey", "Career Journey"], agentHint: "Transparency, audience building, creator economy", feedTags: ["buildinpublic","creator","transparency"] },
  { id: "consulting",      label: "Consulting",          category: "Business & Finance",emoji: "📊",
    storyCategories: ["Career Journey"], agentHint: "Independent consulting, strategy, client management", feedTags: ["consulting","strategy","advisory"] },

  // ── Lifestyle ─────────────────────────────────────────────────
  { id: "travel",          label: "Travel",              category: "Lifestyle",         emoji: "✈️",
    storyCategories: ["Life Lessons", "Identity & Background"], agentHint: "Solo travel, digital nomad, cultural immersion", feedTags: ["travel","nomad","adventure"] },
  { id: "cooking",         label: "Cooking",             category: "Lifestyle",         emoji: "👨‍🍳",
    storyCategories: ["Lifestyle", "Life Lessons"], agentHint: "Home cooking, recipe development, food culture", feedTags: ["cooking","food","recipes"] },
  { id: "reading",         label: "Reading",             category: "Lifestyle",         emoji: "📚",
    storyCategories: ["Life Lessons", "Personal Growth"], agentHint: "Book recommendations, reading habits, non-fiction", feedTags: ["reading","books","learning"] },
  { id: "parenting",       label: "Parenting",           category: "Lifestyle",         emoji: "👨‍👧",
    storyCategories: ["Family & Relationships", "Life Lessons"], agentHint: "Raising kids, work-life balance, parenting philosophy", feedTags: ["parenting","family","kids"] },
  { id: "sustainability",  label: "Sustainability",      category: "Lifestyle",         emoji: "🌍",
    storyCategories: ["Life Lessons", "Identity & Background"], agentHint: "Climate action, sustainable living, zero waste", feedTags: ["sustainability","climate","green"] },
  { id: "minimalism",      label: "Minimalism",          category: "Lifestyle",         emoji: "⬜",
    storyCategories: ["Life Lessons", "Personal Growth"], agentHint: "Decluttering, intentional living, essentialism", feedTags: ["minimalism","essentialism","simplicity"] },
  { id: "side-hustle",     label: "Side Hustles",        category: "Lifestyle",         emoji: "💡",
    wallIds: ["indie-hackers"], storyCategories: ["Career Journey", "Founder Journey"], agentHint: "Passive income, second income streams, side projects", feedTags: ["sidehustle","income","projects"] },
  { id: "community",       label: "Community Building",  category: "Lifestyle",         emoji: "🏘️",
    wallIds: ["founders"], storyCategories: ["Life Lessons", "Identity & Background"], agentHint: "Online and offline community, belonging, collective", feedTags: ["community","belonging","togetherness"] },
  { id: "dating",          label: "Dating & Relationships",category: "Lifestyle",       emoji: "💕",
    storyCategories: ["Family & Relationships", "Identity & Background"], agentHint: "Modern dating, long-term relationships, communication", feedTags: ["dating","relationships","love"] },
  { id: "luxury",          label: "Luxury & Quality",    category: "Lifestyle",         emoji: "💎",
    storyCategories: ["Lifestyle", "Life Lessons"], agentHint: "Quality over quantity, investment pieces, appreciation", feedTags: ["luxury","quality","premium"] },

  // ── Mental Health ─────────────────────────────────────────────
  { id: "anxiety",         label: "Managing Anxiety",    category: "Mental Health",     emoji: "🌊",
    storyCategories: ["Mental Health", "Hardship"], agentHint: "CBT, panic attacks, social anxiety, coping strategies", feedTags: ["anxiety","mentalhealth","coping"] },
  { id: "depression",      label: "Depression & Recovery",category: "Mental Health",    emoji: "☁️",
    storyCategories: ["Mental Health", "Hardship", "Comeback Story"], agentHint: "Recovery, therapy, medication, lived experience", feedTags: ["depression","recovery","mentalhealth"] },
  { id: "therapy",         label: "Therapy & Healing",   category: "Mental Health",     emoji: "💬",
    storyCategories: ["Mental Health", "Life Lessons"], agentHint: "CBT, psychotherapy, EMDR, talking therapies", feedTags: ["therapy","healing","psychology"] },
  { id: "burnout",         label: "Burnout Recovery",    category: "Mental Health",     emoji: "🔋",
    storyCategories: ["Mental Health", "Hardship", "Career Journey"], agentHint: "Work burnout, recovery, boundaries, rest", feedTags: ["burnout","recovery","boundaries"] },
  { id: "addiction",       label: "Addiction & Recovery", category: "Mental Health",    emoji: "🔓",
    storyCategories: ["Mental Health", "Hardship", "Comeback Story"], agentHint: "Sobriety, 12-step, recovery community, sober living", feedTags: ["addiction","sobriety","recovery"] },
  { id: "grief",           label: "Grief & Loss",        category: "Mental Health",     emoji: "🕯️",
    storyCategories: ["Mental Health", "Hardship", "Family & Relationships"], agentHint: "Bereavement, loss, processing grief, healing", feedTags: ["grief","loss","bereavement"] },
  { id: "adhd",            label: "ADHD",                category: "Mental Health",     emoji: "⚡",
    storyCategories: ["Mental Health", "Identity & Background", "Career Journey"], agentHint: "ADHD strategies, hyperfocus, neurodiversity at work", feedTags: ["adhd","neurodiversity","focus"] },
  { id: "self-care",       label: "Self-Care",           category: "Mental Health",     emoji: "🌸",
    storyCategories: ["Mental Health", "Life Lessons"], agentHint: "Rest, boundaries, emotional needs, nervous system", feedTags: ["selfcare","rest","boundaries"] },
  { id: "trauma",          label: "Trauma & Healing",    category: "Mental Health",     emoji: "🌿",
    storyCategories: ["Mental Health", "Hardship", "Comeback Story"], agentHint: "Trauma-informed approaches, PTSD, healing journey", feedTags: ["trauma","healing","ptsd"] },

  // ── Education ─────────────────────────────────────────────────
  { id: "uni-life",        label: "University Life",     category: "Education",         emoji: "🎓",
    storyCategories: ["Student Life", "Identity & Background"], agentHint: "First-gen students, university culture, wellbeing", feedTags: ["university","studentlife","campus"] },
  { id: "first-gen",       label: "First-Generation Student",category: "Education",     emoji: "🏅",
    storyCategories: ["Student Life", "Hardship", "Identity & Background"], agentHint: "First-gen student experience, access, representation", feedTags: ["firstgen","student","access"] },
  { id: "self-taught",     label: "Self-Taught Learning", category: "Education",        emoji: "📗",
    storyCategories: ["Career Journey", "Comeback Story"], agentHint: "Teaching yourself skills, MOOCs, structured self-study", feedTags: ["selftaught","learning","mooc"] },
  { id: "certifications",  label: "Certifications",      category: "Education",         emoji: "📜",
    storyCategories: ["Career Journey", "Trade Story"], agentHint: "Professional certifications, AWS, NVQs, CPD", feedTags: ["certifications","cpd","qualifications"] },
  { id: "online-learning", label: "Online Learning",     category: "Education",         emoji: "🖥️",
    storyCategories: ["Career Journey", "Life Lessons"], agentHint: "Coursera, Udemy, YouTube learning, structured courses", feedTags: ["onlinelearning","elearning","courses"] },
  { id: "adult-learning",  label: "Adult Learning",      category: "Education",         emoji: "📖",
    storyCategories: ["Comeback Story", "Career Journey"], agentHint: "Returning to education as an adult, access courses", feedTags: ["adultlearning","returner","education"] },
  { id: "languages",       label: "Languages",           category: "Education",         emoji: "🗣️",
    storyCategories: ["Life Lessons", "Identity & Background"], agentHint: "Language learning, polyglots, Duolingo, immersion", feedTags: ["languages","learning","polyglot"] },
  { id: "scholarships",    label: "Scholarships & Funding",category: "Education",       emoji: "💰",
    storyCategories: ["Student Life", "Hardship"], agentHint: "Scholarships, bursaries, student finance, access", feedTags: ["scholarships","funding","access"] },
  { id: "research",        label: "Research & Academia",  category: "Education",        emoji: "🔭",
    storyCategories: ["Student Life", "Career Journey"], agentHint: "Academic research, PhDs, publishing, academia", feedTags: ["research","academia","phd"] },

  // ── Spirituality ──────────────────────────────────────────────
  { id: "meditation",      label: "Meditation",          category: "Spirituality",      emoji: "🧘",
    storyCategories: ["Mental Health", "Life Lessons"], agentHint: "Vipassana, TM, mindfulness meditation, presence", feedTags: ["meditation","mindfulness","presence"] },
  { id: "faith",           label: "Faith & Religion",    category: "Spirituality",      emoji: "🕊️",
    storyCategories: ["Life Lessons", "Identity & Background"], agentHint: "Faith journey, religious practice, doubt and belief", feedTags: ["faith","religion","spirituality"] },
  { id: "nature",          label: "Nature & Outdoors",   category: "Spirituality",      emoji: "🌲",
    storyCategories: ["Life Lessons", "Health & Recovery"], agentHint: "Nature connection, forest bathing, outdoor living", feedTags: ["nature","outdoors","wilderness"] },
  { id: "astrology",       label: "Astrology & Cosmos",  category: "Spirituality",      emoji: "⭐",
    storyCategories: ["Life Lessons", "Identity & Background"], agentHint: "Birth charts, cosmic timing, personal narrative", feedTags: ["astrology","cosmos","spirituality"] },
  { id: "philosophy",      label: "Philosophy",          category: "Spirituality",      emoji: "🏛️",
    storyCategories: ["Life Lessons", "Personal Growth"], agentHint: "Ethics, existentialism, virtue, meaning-making", feedTags: ["philosophy","ethics","meaning"] },
  { id: "ikigai",          label: "Ikigai & Purpose",    category: "Spirituality",      emoji: "🎯",
    storyCategories: ["Life Lessons", "Career Journey"], agentHint: "Japanese concept of purpose, reason for being", feedTags: ["ikigai","purpose","mission"] },
  { id: "ancient-wisdom",  label: "Ancient Wisdom",      category: "Spirituality",      emoji: "📜",
    storyCategories: ["Life Lessons"], agentHint: "Taoism, Buddhism, Stoicism, ancient philosophy", feedTags: ["wisdom","ancient","philosophy"] },
  { id: "fasting",         label: "Fasting & Discipline",category: "Spirituality",      emoji: "🌙",
    storyCategories: ["Life Lessons", "Health & Recovery"], agentHint: "Intermittent fasting, Ramadan, spiritual fasting", feedTags: ["fasting","discipline","spiritual"] },
];

// ── Computed helpers ──────────────────────────────────────────

export function getInterestById(id: string): Interest | undefined {
  return ALL_INTERESTS.find(i => i.id === id);
}

export function getInterestsByCategory(category: InterestCategory): Interest[] {
  return ALL_INTERESTS.filter(i => i.category === category);
}

export const ORDERED_CATEGORIES: InterestCategory[] = [
  "Personal Growth",
  "Career & Skills",
  "Trades & Crafts",
  "Creativity & Art",
  "Health & Fitness",
  "Technology",
  "Business & Finance",
  "Lifestyle",
  "Mental Health",
  "Education",
  "Spirituality",
  "Custom",
];

// ── Mapping engine ────────────────────────────────────────────

export interface WallRecommendation {
  wallId: string;
  wallName: string;
  wallEmoji: string;
  accent: string;
  matchingInterests: string[];
  score: number;
}

export interface StoryRecommendation {
  category: string;
  matchingInterests: string[];
  score: number;
}

export interface AgentRecommendation {
  type: "story" | "wall" | "group" | "quote" | "news" | "goal";
  emoji: string;
  text: string;
  interestIds: string[];
}

export interface FeedWeighting {
  followingPct: number;
  wallsPct: number;
  interestsPct: number;
  agentPct: number;
  topInterestBoost: string[];
}

// Derive wall recommendations from selected interest IDs
export function deriveWallRecommendations(selectedIds: string[]): WallRecommendation[] {
  const wallMap: Record<string, { name: string; emoji: string; accent: string; interests: string[] }> = {
    "founders":       { name: "Founders' Wall",       emoji: "🚀", accent: "#6366f1", interests: [] },
    "ai-builders-uk": { name: "AI Builders UK",        emoji: "🤖", accent: "#8b5cf6", interests: [] },
    "developers-uk":  { name: "Developers UK",         emoji: "💻", accent: "#0ea5e9", interests: [] },
    "designers-uk":   { name: "Designers UK",          emoji: "🎨", accent: "#ec4899", interests: [] },
    "plumbers-uk":    { name: "Plumbers' Wall",        emoji: "🔧", accent: "#f97316", interests: [] },
    "builders-uk":    { name: "Builders & Trades UK",  emoji: "🏗️", accent: "#f59e0b", interests: [] },
    "musicians-uk":   { name: "Musicians UK",          emoji: "🎵", accent: "#a855f7", interests: [] },
    "indie-hackers":  { name: "Indie Hackers",         emoji: "💡", accent: "#f59e0b", interests: [] },
    "product-mgmt":   { name: "Product Management",    emoji: "📋", accent: "#0ea5e9", interests: [] },
    "tech-london":    { name: "Tech London",           emoji: "🏙️", accent: "#22c55e", interests: [] },
  };

  for (const id of selectedIds) {
    const interest = getInterestById(id);
    if (!interest?.wallIds) continue;
    for (const wid of interest.wallIds) {
      if (wallMap[wid]) wallMap[wid].interests.push(interest.label);
    }
  }

  return Object.entries(wallMap)
    .filter(([, v]) => v.interests.length > 0)
    .map(([wallId, v]) => ({
      wallId,
      wallName: v.name,
      wallEmoji: v.emoji,
      accent: v.accent,
      matchingInterests: v.interests,
      score: v.interests.length,
    }))
    .sort((a, b) => b.score - a.score);
}

// Derive story category recommendations
export function deriveStoryRecommendations(selectedIds: string[]): StoryRecommendation[] {
  const catMap: Record<string, string[]> = {};
  for (const id of selectedIds) {
    const interest = getInterestById(id);
    if (!interest?.storyCategories) continue;
    for (const cat of interest.storyCategories) {
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(interest.label);
    }
  }
  return Object.entries(catMap)
    .map(([category, interests]) => ({ category, matchingInterests: interests, score: interests.length }))
    .sort((a, b) => b.score - a.score);
}

// Generate agent recommendations from interests (top 5 by priority)
export function deriveAgentRecommendations(prioritisedIds: string[]): AgentRecommendation[] {
  const recs: AgentRecommendation[] = [];
  const top = prioritisedIds.slice(0, 5);

  for (const id of top) {
    const interest = getInterestById(id);
    if (!interest?.agentHint) continue;
    recs.push({
      type: "quote",
      emoji: interest.emoji,
      text: `You're into ${interest.label} — ${interest.agentHint.split(",")[0].toLowerCase()}.`,
      interestIds: [id],
    });
  }

  // Cross-interest recommendations
  const hasAI      = top.includes("ai");
  const hasCoding  = top.includes("coding");
  const hasStartup = top.includes("startups");
  const hasResilience = top.includes("resilience") || top.includes("self-discipline");

  if (hasAI && hasCoding) {
    recs.push({ type: "story", emoji: "💻", text: "You're into both AI and coding — stories from the Developers' Wall are ranked higher in your feed.", interestIds: ["ai","coding"] });
  }
  if (hasStartup && hasResilience) {
    recs.push({ type: "story", emoji: "🚀", text: "Founder Journey + Resilience: the agent will prioritise comeback stories from founders in your recommendations.", interestIds: ["startups","resilience"] });
  }

  return recs.slice(0, 6);
}

// Feed weighting based on interests + priority
export function deriveFeedWeighting(selectedIds: string[]): FeedWeighting {
  const topThree = selectedIds.slice(0, 3).map(id => getInterestById(id)?.label ?? id);
  return {
    followingPct: 40,
    wallsPct: 30,
    interestsPct: 20,
    agentPct: 10,
    topInterestBoost: topThree,
  };
}
