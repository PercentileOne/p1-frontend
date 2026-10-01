// Help Centre content for the candidate portal (Francis, 2026-10-01). Plain data on purpose: one place to edit wording, and the same
// text can later feed short videos, the support assistant and the public help pages. Rules for writing here:
//  - describe only what the portal really does (check the page before adding a claim) — every article below was written from the page itself;
//  - no prices, pass marks or usage limits in the text — they change; the page itself shows the current figure;
//  - one task per article, steps first, short;
//  - spell it "practice"/"practicing" (noun and verb); sharing is always the candidate's choice — never imply they should be "seen".

export type HelpCategory = 'Getting started' | 'Practice interviews' | 'Learn & exams' | 'Careers & CV' | 'Profile & sharing' | 'Troubleshooting';

export interface HelpArticle {
  id: string;
  category: HelpCategory;
  title: string;
  summary: string;
  /** The left-menu page this article explains — drives the article's "Go to …" button, and (with `hint`) the "How does this work?" bar on that page. */
  navLabel?: string;
  /** Show this article in the dismissible "New to …?" bar on its `navLabel` page. Exactly one article per page should set it. */
  hint?: boolean;
  body?: string[];
  steps?: string[];
  tips?: string[];
  related?: string[];
  keywords?: string[];
}

export const HELP_CATEGORIES: HelpCategory[] = ['Getting started', 'Practice interviews', 'Learn & exams', 'Careers & CV', 'Profile & sharing', 'Troubleshooting'];

export const CONTACT_URL = 'https://www.theinterviewchair.com/contact';

/** localStorage flag set when the candidate opens the Help Centre — ticks the "look around" step of the Getting started card. */
export const HELP_VISITED_KEY = 'tic.help.visited';

export const CANDIDATE_ARTICLES: HelpArticle[] = [
  // ───────────── Getting started ─────────────
  {
    id: 'welcome',
    category: 'Getting started',
    title: 'Welcome — what you can do here',
    summary: 'A quick tour of the menu, so you know where everything lives.',
    body: [
      'TheInterviewChair.com is where you practice interviews for real, learn what you need to know, and decide for yourself who sees your results. Everything is in the menu on the left:',
      'Job Interviews — start a practice interview and keep the ones you save.',
      'My Career Coach — chat with a coach about your career.',
      'My Profile — your public profile, dream role and profile video.',
      'Certifications & Exams — mock multiple-choice exams for the certification or test you are preparing for.',
      'What Am I Worth? — upload your CV and see which real roles fit and what they pay.',
      'Question Bank — the model answers you chose to keep.',
      'My Talks — practice a spoken presentation on any subject.',
      'Learn Alerts — one quick multiple-choice question at a time, sent to your inbox.',
      'Interview Preps and Interview Gifts — practice interviews that a recruiter or another person has sent you.',
      'Learn — type any topic and get a complete course.',
      'Careers — explore careers, with salaries, demand and AI impact.',
      'Jobs, Messages, Demo and Settings — job listings, your messages, showcase demos, and your account settings.',
    ],
    related: ['first-ten-minutes', 'practice-interview'],
    keywords: ['start', 'overview', 'menu', 'tour', 'new', 'begin', 'what is this'],
  },
  {
    id: 'first-ten-minutes',
    category: 'Getting started',
    title: 'Your first ten minutes',
    summary: 'A few quick wins that show you what the portal is for.',
    steps: [
      'Do a practice interview for a role you are interested in, and save it (Job Interviews).',
      'In the interview, try "Tell Me The Answer" on a question you find hard, then "Save & Continue" to keep the model answer (Question Bank).',
      'Build a Learn course on the topic your weakest answer was about (Learn).',
      'If you are preparing for a certification or test, try a mock exam (Certifications & Exams).',
      'Add a short bio and your dream role to your profile (My Profile).',
    ],
    tips: ['The "Getting started" card on your Dashboard ticks these off for you as you go, and you can hide it any time.'],
    related: ['practice-interview', 'tell-me-the-answer', 'learn-course', 'mock-exams', 'edit-profile'],
    keywords: ['first', 'begin', 'checklist', 'onboarding', 'getting started', 'where do i start'],
  },

  // ───────────── Practice interviews ─────────────
  {
    id: 'practice-interview',
    category: 'Practice interviews',
    title: 'Set up a practice interview',
    summary: 'Tell us about the role, and every question is tailored to it.',
    navLabel: 'Job Interviews',
    hint: true,
    steps: [
      'On Job Interviews, click Practice Interview. (On the Dashboard, the button is at the top right.)',
      'Describe the role with any of three tabs: Job Title, Job Spec (paste the job description or upload it) or CV (upload it or paste the text). Any one of them is enough to start. Switching tabs never clears the others.',
      'Choose the Interview Round that matches your real process, from First Round to Final Round.',
      'Optionally set a Salary Expectation. Practicing for a role above your comfort zone builds confidence — the higher the band, the tougher the questions.',
      'Optionally add a Special Focus: type a topic and press Enter to add it. Questions narrow to those topics.',
      'Pick the Interview Language, the Question Difficulty and how many questions you want. Choosing fewer gives you a quick run-through.',
      'Optionally type the name you would like the interviewers to call you. It overrides your account name.',
      'Check the recording switch (see the tips below), then click Start Interview →.',
    ],
    body: [
      'The more detail you give, the sharper the questions. A full job description gives much better questions than a job title alone. Uploaded files can be PDF, DOCX or TXT.',
      'If something is missing, the screen tells you exactly what to add before you can start.',
    ],
    tips: [
      'Recording on means your interview is recorded, so a recruiter could watch it back if you later save it and make it public. Recording off means it is not recorded. Sharing is always your choice, and you can change your mind afterwards.',
      'Want an interview in the style of a particular employer? See "Practice for a specific company".',
    ],
    related: ['company-interview', 'interview-room', 'my-interviews', 'interview-wont-start'],
    keywords: ['interview', 'practice', 'start', 'set up', 'setup', 'intake', 'job title', 'job spec', 'cv', 'round', 'salary', 'difficulty', 'language', 'special focus', 'questions', 'recording', 'name'],
  },
  {
    id: 'company-interview',
    category: 'Practice interviews',
    title: 'Practice for a specific company',
    summary: 'An interview modelled on how an employer hires — their values, style and bar.',
    navLabel: 'Job Interviews',
    steps: [
      'Start a practice interview. At the top of the set-up screen, open Interview Style.',
      'Search by company name or brand and pick one. Leave it on Standard for a well-rounded interview for any role.',
      'Fill in the rest of the set-up as usual and start.',
    ],
    body: [
      'A company-style interview is based on publicly described hiring processes and written fresh for you. They are not real questions from that company, and the service is not affiliated with or endorsed by them.',
      'The difficulty is set to a typical level for that company. On your results page it is labelled as a mock interview for that company.',
    ],
    related: ['practice-interview', 'interview-results'],
    keywords: ['company', 'employer', 'google', 'amazon', 'mock', 'style', 'brand', 'specific'],
  },
  {
    id: 'interview-room',
    category: 'Practice interviews',
    title: 'Inside the Interview Room',
    summary: 'What happens from the briefing to the final question.',
    body: [
      'First you meet Michelle, your recruitment consultant, who briefs you. Then she hands over to your two interviewers, Amina and Wayne, who ask the questions: a few open-ended HR questions plus questions specific to your role.',
      'Before you begin, a summary shows how many questions to expect, your Answer mode (Speak or Type) and an Audio check. There is also a Go Deeper option that adds the occasional real follow-up question to test genuine depth of experience.',
    ],
    steps: [
      'Check the summary, click 🔊 Test audio if you like, then click Begin Interview →.',
      'Listen to each question as it is asked. It is also shown on screen.',
      'To answer by voice, click Record, speak naturally, then click Stop. To type instead, use the text box and click Submit Answer.',
      'Use ↩ Repeat to hear the question again, or ⏸ Pause whenever you need a moment (it is also at the top of the screen).',
      'Stuck? Choose 💡 Tell Me The Answer, or Pass → to move on.',
      'Now and then a multiple-choice question appears as a short bonus round. Near the end you may get the chance to ask the interviewers a question of your own.',
      'When the last question is done you go straight to your results.',
    ],
    tips: [
      'Repeat, Pause and Pass are switched off while you are recording — click Stop first.',
      'The speaker control at the top of the screen sets the interviewers\' Voice Volume.',
      'The screen shows your progress, the time on your answer and your running average as you go.',
    ],
    related: ['tell-me-the-answer', 'interview-results', 'microphone-audio'],
    keywords: ['room', 'michelle', 'amina', 'wayne', 'record', 'stop', 'repeat', 'pause', 'pass', 'speak', 'type', 'go deeper', 'multiple choice', 'mcq', 'follow-up', 'avatar', 'panel'],
  },
  {
    id: 'tell-me-the-answer',
    category: 'Practice interviews',
    title: 'Stuck on a question? "Tell Me The Answer"',
    summary: 'See a model answer, keep it, and learn from it — and what it does to your score.',
    steps: [
      'During a question, click 💡 Tell Me The Answer.',
      'Read or listen to the model answer.',
      'Click Save & Continue → to keep it in your Question Bank and move on.',
    ],
    body: [
      'A question where you revealed the answer counts as not attempted, so it scores zero for that question and is marked "Answer revealed" in your results. It is there to teach you, not to flatter your score.',
      'The answers you save become your own library of model answers to revisit before a real interview.',
    ],
    tips: ['If you would rather just move on without an answer, use Pass → instead.'],
    related: ['question-bank', 'interview-room', 'interview-results'],
    keywords: ['answer', 'model answer', 'reveal', 'stuck', 'hint', 'save', 'score', 'zero'],
  },
  {
    id: 'interview-results',
    category: 'Practice interviews',
    title: 'Understand your results',
    summary: 'Your score, the outcome, feedback from Michelle, and your certificate.',
    steps: [
      'When the interview ends, your results page opens. At the top is your interview outcome and score.',
      'Click Get Feedback to have Michelle give you a personalised spoken debrief (Play Feedback to hear it again).',
      'Scroll down for your replay (if it was recorded), your Focus Areas and a breakdown of every question with its feedback.',
      'If your weakest area is flagged, click Study Now → to jump into Learn on that topic.',
      'If you passed, click 🏆 Get your certificate.',
    ],
    body: [
      'The outcome is one of Passed, Keep on File or Not this time. The pass mark depends on the difficulty you chose, and the page shows the exact marks for your level.',
      '"Keep on File" means you were just short of the pass mark: in a real process, an employer would keep your CV (or name) on file for future roles.',
      'The Save / Discard choice also appears on this page — see "Save, share or discard an interview".',
    ],
    related: ['share-interview', 'learn-course', 'tell-me-the-answer'],
    keywords: ['results', 'score', 'pass', 'fail', 'keep on file', 'outcome', 'feedback', 'certificate', 'debrief', 'summary', 'replay', 'focus areas'],
  },
  {
    id: 'question-bank',
    category: 'Practice interviews',
    title: 'Your Question Bank',
    summary: 'The model answers you chose to keep, ready to revisit before the real thing.',
    navLabel: 'Question Bank',
    hint: true,
    steps: [
      'In a practice interview, click 💡 Tell Me The Answer on a question, then Save & Continue →. That answer is added to your Question Bank.',
      'Open Question Bank from the menu to see everything you have saved.',
      'Search by question, job title or company, and click a column heading to sort by Saved, Question, Job Title or Difficulty.',
      'Click a row to read the full model answer. Use the listen button to hear it narrated.',
      'Use the remove button on a row to delete an answer you no longer need.',
    ],
    tips: ['Only answers you choose to save appear here — nothing is added without you clicking Save & Continue.'],
    related: ['tell-me-the-answer', 'practice-interview'],
    keywords: ['question bank', 'saved', 'answers', 'model answer', 'library', 'revise', 'listen'],
  },
  {
    id: 'interview-prep-from-recruiter',
    category: 'Practice interviews',
    title: 'A recruiter sent me an Interview Prep',
    summary: 'Practice for the exact role you are going for, set up by your recruiter.',
    navLabel: 'Interview Preps',
    hint: true,
    steps: [
      'Sign in with the same email address your recruiter used. Preps are matched to your email — there is nothing to claim or link.',
      'Open Interview Preps in the menu. You will see each prep with its interview date, role, who it is from, difficulty and CV.',
      'Click Review & Start → on a prep. The set-up screen opens already filled in with the role, job description and level.',
      'Check or adjust anything, then start your practice interview.',
    ],
    tips: ['The page shows how many you have received and how many are for interviews still to come.'],
    related: ['practice-interview'],
    keywords: ['recruiter', 'prep', 'interview prep', 'invite', 'sent', 'email', 'link'],
  },
  {
    id: 'interview-gift',
    category: 'Practice interviews',
    title: 'Someone gave me an Interview Gift',
    summary: 'Free practice interviews from someone who wants you to do well.',
    navLabel: 'Interview Gifts',
    hint: true,
    steps: [
      'Sign in with the same email address the gift was sent to — gifts are matched to your email, with nothing to claim.',
      'Open Interview Gifts in the menu. You will see who each gift is from, how many sessions are left and when it expires.',
      'Click Start Interview → to use one, and set up your practice interview as normal.',
    ],
    related: ['practice-interview'],
    keywords: ['gift', 'gifted', 'voucher', 'free', 'sessions', 'expires', 'pass'],
  },

  // ───────────── Learn & exams ─────────────
  {
    id: 'learn-course',
    category: 'Learn & exams',
    title: 'Learn anything with a course',
    summary: 'Type any topic and get a complete course, with practice built in.',
    navLabel: 'Learn',
    hint: true,
    steps: [
      'Open Learn and type a topic — anything from "Plumbing Fundamentals" to "Certified Chief Technology Officer". Suggestions appear as you type. Or click one of the Popular Topics.',
      'Choose your level: Beginner, Intermediate or Expert.',
      'Optionally add a Special Focus (type a topic and press Enter) to narrow the course to specific sub-topics.',
      'Click Generate Course →. Your course is built in front of you; the first module is ready first.',
      'Open a module and pick a lecture. Use 🔊 Read Aloud if you prefer to listen.',
      'At the end of a lecture, take the 🎯 Short Multiple Choice Test, or start a full interview practice on the course topic.',
    ],
    body: [
      'Each course is a set of modules and lectures with interview questions and practice built in. If a module fails to write, there is a retry button on it.',
      'Your courses are kept on this device and browser. Use Remove course to delete one, or Clear all to remove them all.',
    ],
    tips: [
      'Coming from a results page or the CV Analyzer? The "Study" buttons there open Learn already on the right topic.',
      'A narrower topic with a Special Focus gives a more targeted course than a very broad one.',
    ],
    related: ['learn-alerts', 'interview-results', 'cv-analyzer'],
    keywords: ['learn', 'course', 'study', 'lecture', 'module', 'topic', 'level', 'special focus', 'read aloud', 'mcq', 'multiple choice', 'teach'],
  },
  {
    id: 'learn-alerts',
    category: 'Learn & exams',
    title: 'Set up Learn Alerts',
    summary: 'Spaced practice, one multiple-choice question at a time, straight to your inbox.',
    navLabel: 'Learn Alerts',
    hint: true,
    steps: [
      'Open Learn Alerts and click New Alert.',
      'Enter the Job Title you want to practice for, for example "Head of Prime Brokerage Technology".',
      'Optionally add a Special Focus to narrow the questions to specific topics.',
      'Choose the Difficulty, how often you want a question (Frequency) and how long the alert should run (Duration).',
      'Choose whether the alert is Hidden or Public, then click Create Alert. Your questions arrive by email, one at a time.',
    ],
    body: ['Frequency runs from every few hours to weekly, so you can fit in more questions before an interview that is only days away. The page shows how many you have got right and your current and best streak. You can switch an alert between Public and Hidden from the list (or use Alert Visibility to change them all), and edit, delete or reset one at any time.'],
    related: ['learn-course', 'mock-exams'],
    keywords: ['alert', 'learn alert', 'email', 'daily', 'streak', 'spaced', 'repetition', 'question', 'inbox'],
  },
  {
    id: 'mock-exams',
    category: 'Learn & exams',
    title: 'Take a mock exam',
    summary: 'A multiple-choice mock for the certification or test you are preparing for.',
    navLabel: 'Certifications & Exams',
    hint: true,
    steps: [
      'Open Certifications & Exams and click Start a mock exam →.',
      'Pick a category, or choose All exams, then search for yours — for example "GCSE Maths", "SAT" or "AZ-104".',
      'Not listed? Click Can\'t find it? Add "…" → and we will check it and add it for you.',
      'Choose how many questions you want. For official tests with a fixed real length, the full-test option is marked "full test".',
      'Optionally type the name you would like Michelle to call you, then click Begin Exam →.',
      'Answer the questions. When you finish, you get a scaled score and whether you passed.',
    ],
    body: [
      'Michelle briefs you before the exam, and it is scored like the real thing. The first time you open an exam that was just added, it takes a few extra seconds to set up.',
      'Back on the Certifications & Exams page, your past attempts are listed with their score and result, and you can search them, make one public or private, or remove one. A result you have not yet saved or discarded shows as Pending — open it to decide.',
    ],
    tips: ['Not ready yet? Choose "Learn this first" on the exam screen to generate a course on that subject.'],
    related: ['learn-course', 'share-interview'],
    keywords: ['exam', 'certification', 'mock', 'test', 'gcse', 'sat', 'driving theory', 'az-104', 'pass', 'scaled score', 'pending', 'add exam'],
  },

  // ───────────── Careers & CV ─────────────
  {
    id: 'careers-explorer',
    category: 'Careers & CV',
    title: 'Explore careers',
    summary: 'Real salaries, demand, AI impact and the route in, for every career we cover.',
    navLabel: 'Careers',
    hint: true,
    steps: [
      'Open Careers and search any career — for example Surgeon, Plumber, CTO or Music Producer. Or browse by category.',
      'Open a career to see its details: Salary (UK and US), Contract Day Rates, Workforce, and Demand & Future (automation risk, future score and trend).',
      'Keep scrolling for Lifestyle (environment, hours, stress, remote score), Key Skills, Getting Started and Who Thrives Here.',
      'Look for Courses to Get There if you want to start learning.',
      'Click Start Interview Practice → at the bottom to practice an interview for that role, with the job title already filled in.',
    ],
    body: ['New careers are added every day. If you cannot find yours, try a broader search, or clear the search and browse by category.'],
    related: ['practice-interview', 'learn-course', 'cv-analyzer'],
    keywords: ['careers', 'career', 'salary', 'jobs', 'pay', 'automation', 'ai risk', 'future', 'explore', 'role', 'what does it pay'],
  },
  {
    id: 'cv-analyzer',
    category: 'Careers & CV',
    title: 'Find out what roles fit your CV',
    summary: 'Upload your CV and see which real roles fit, what they pay, and your strengths and weaknesses.',
    navLabel: 'What Am I Worth?',
    hint: true,
    steps: [
      'Open What Am I Worth? and upload your CV. It can be a PDF, DOCX, DOC or TXT file.',
      'Wait a moment while it is read. Then review your Skills Breakdown.',
      'See Roles You Could Apply For: real roles with real salary bands, highest first.',
      'Check What\'s Hot for your top role, and click Study on Learn → on any topic you are missing.',
      'Read your Strengths, Weaknesses and any Inconsistencies Worth Addressing.',
      'Click Talk Me Through My CV to hear a spoken walkthrough of the analysis.',
      'To keep or show your analysis, click Share this analysis. It makes a link anyone can open without an account.',
    ],
    tips: [
      'The analysis is only a guide. Use the inconsistencies list to tidy your CV before a real application.',
      'Your analysis is not kept in a list here — if you want to come back to it, share it and save the link.',
      'Close it with the X button at the top. Clicking outside it does nothing, so you will not lose it by accident.',
    ],
    related: ['careers-explorer', 'learn-course', 'cv-analysis-error'],
    keywords: ['cv', 'resume', 'résumé', 'worth', 'salary', 'analyse', 'analyze', 'roles', 'strengths', 'weaknesses', 'skills', 'upload'],
  },

  {
    id: 'career-coach',
    category: 'Careers & CV',
    title: 'Talk to your Career Coach',
    summary: 'Ask whatever is on your mind about your career, any time.',
    navLabel: 'My Career Coach',
    hint: true,
    steps: [
      'Open My Career Coach. Click one of the suggested questions to get started, or type your own and send it.',
      'Ask about career decisions, your job search, confidence or upskilling — for example, how to explain a career gap, or what to focus on this month.',
      'Click + New Conversation to start a fresh topic. Your earlier conversations are listed on the left, and you can reopen any of them.',
      'To remove one, use the delete icon beside it in the list.',
    ],
    body: ['Your Career Coach is an AI coach. Every conversation stays in your list, ready whenever you come back to it. If you reach the daily limit, a message on the page says so.'],
    related: ['careers-explorer', 'cv-analyzer', 'practice-interview'],
    keywords: ['coach', 'career coach', 'advice', 'chat', 'career change', 'career gap', 'job search', 'confidence', 'conversation'],
  },
  {
    id: 'my-talks',
    category: 'Practice interviews',
    title: 'Rehearse a talk or presentation',
    summary: 'Practice presenting out loud and get tips, a score and feedback.',
    navLabel: 'My Talks',
    hint: true,
    steps: [
      'Open My Talks. For tips first, click 🎙️ Talk Coaching to hear what makes a great talk.',
      'Click 🎤 New Talk, and type the Subject of your talk.',
      'Choose what kind of talk it is: Factual / informational (you get subject tips) or Personal / experiential (you get storytelling tips).',
      'Choose the length (3 or 5 minutes) and the Talk Language, and optionally type the name you would like used.',
      'Optionally add supporting notes or diagrams. Only you see them during the talk.',
      'Click Start Talk →, then give your talk. Amina and Wayne listen throughout.',
      'Afterwards you get a score and feedback, your transcript, and a spoken debrief from Wayne. Then choose whether to save it.',
    ],
    body: [
      'Saved talks appear on My Talks with their Date, Subject and Score. Switch any talk between Public and Private with the Visibility switch, or use the menu at the top to change them all. Private takes it out of public view; nothing is deleted.',
      'The 🌍 Public Talks tab shows talks other people have chosen to make public. You can pin any you like to your own library.',
    ],
    tips: ['A factual talk is judged on accuracy and a personal story on authenticity, so choose the type that really fits.'],
    related: ['share-interview', 'microphone-audio'],
    keywords: ['talk', 'talks', 'presentation', 'speech', 'speaking', 'rehearse', 'public speaking', 'present', 'pitch'],
  },

  // ───────────── Profile & sharing ─────────────
  {
    id: 'my-interviews',
    category: 'Profile & sharing',
    title: 'Find and manage your saved interviews',
    summary: 'Replay, review, search and control who can see each one.',
    navLabel: 'Job Interviews',
    steps: [
      'Open Job Interviews. Each saved interview is a row with its Date, Role, Company, Score, Recording and Visibility.',
      'Search by role or company, filter by All, Public or Private, and click a column heading to sort.',
      'Click a row (or View →) to open its results and replay.',
      'Use the Visibility switch on a row to make that interview Public or Private. Use the trash icon to discard one.',
      'To change them all at once, use Interview Visibility at the top and confirm.',
    ],
    body: ['Interviews appear here once you save them from the results page. Discarded sessions are not kept.'],
    related: ['share-interview', 'practice-interview'],
    keywords: ['my interviews', 'saved', 'history', 'list', 'replay', 'visibility', 'public', 'private', 'delete', 'discard', 'search'],
  },
  {
    id: 'share-interview',
    category: 'Profile & sharing',
    title: 'Save, share or discard an interview',
    summary: 'You decide what happens to every session — and you can change your mind.',
    steps: [
      'When an interview finishes, your results page asks "What would you like to do with this session?".',
      'Click Save this interview to keep it. Or click Discard — it was practice to throw it away.',
      'After saving, you get a shareable link, a QR code you can download and add to your CV, and quick buttons to share to LinkedIn, WhatsApp, X or email — or just copy the link.',
      'Later, switch any interview between Public and Private from Job Interviews.',
    ],
    body: [
      'Saving makes the interview public: people with the link can watch it, and recruiters and employers can find it in Candidate Search. That is why it is a clear choice, never automatic.',
      'Going Private again takes it out of search and switches its link and QR code off straight away. Nothing is deleted, and you can make it public again whenever you like.',
      'Recipients can see your scores and transcript, and your CV if you uploaded one.',
    ],
    tips: [
      'If you turned recording off at the start, there is no video to share — your scores are still saved.',
      'Not ready to share anything? Save it and set it to Private, or simply discard it.',
    ],
    related: ['my-interviews', 'profile-visibility', 'interview-results'],
    keywords: ['share', 'save', 'discard', 'link', 'qr', 'qr code', 'linkedin', 'whatsapp', 'public', 'private', 'cv', 'recruiter', 'candidate search'],
  },
  {
    id: 'edit-profile',
    category: 'Profile & sharing',
    title: 'Edit your profile',
    summary: 'Your bio, dream role, projects and interests, in one place.',
    navLabel: 'My Profile',
    hint: true,
    steps: [
      'Open My Profile and click Edit Profile.',
      'Add your avatar and banner, and write a short bio.',
      'Fill in your Location, Job Title and Company.',
      'Set your Dream Role: the title, industry, target salary and timeline.',
      'Optionally add favourite films, projects (current or future) and your interests — type an interest and press Enter.',
      'Click Save Changes.',
    ],
    body: ['The tabs across the top of your profile — Overview, Story, Posts, Walls, Groups, Interests and Profile Video — show the rest of what is on your profile.'],
    related: ['profile-visibility', 'profile-video'],
    keywords: ['profile', 'edit', 'bio', 'avatar', 'banner', 'photo', 'dream role', 'projects', 'interests', 'location', 'job title'],
  },
  {
    id: 'profile-visibility',
    category: 'Profile & sharing',
    title: 'Who can find you and comment',
    summary: 'The switches that control what recruiters can see, and who can comment.',
    navLabel: 'My Profile',
    steps: [
      'Open My Profile and click Edit Profile.',
      'Under Visibility, switch "Show my profile in recruiter/employer candidate search" on or off.',
      'Under Work preferences, optionally set your Employment type (permanent, contract or either) and Remote preference. Recruiters can use these as search filters; leave them on "Not set" if you would rather not say.',
      'Under Comments & Moderation, choose whether to allow comments on your profile.',
      'Click Save Changes.',
    ],
    body: [
      'Candidate search visibility is off by default. It only controls whether recruiters and employers can find you by searching — a direct link to your profile works either way.',
      'Comments are off by default too. Anyone can report a comment, and you can delete a comment or block a commenter at any time. Blocked users are listed there so you can unblock them.',
    ],
    related: ['share-interview', 'edit-profile'],
    keywords: ['visibility', 'privacy', 'recruiter', 'search', 'comments', 'block', 'work preferences', 'remote', 'contract', 'permanent', 'hidden', 'public', 'private'],
  },
  {
    id: 'profile-video',
    category: 'Profile & sharing',
    title: 'Record a profile introduction video',
    summary: 'A short, friendly introduction that appears on your profile.',
    navLabel: 'My Profile',
    steps: [
      'Open My Profile, choose the Profile Video tab and click Record Profile Introduction.',
      'Allow camera and microphone access when your browser asks.',
      'Choose how you want to look — a look and background — then continue. The look stays on for every clip.',
      'Answer the five relaxed questions. You get personalised coaching after each one.',
      'You can re-record as many times as you like.',
    ],
    tips: ['Speak naturally and confidently — authenticity is what employers remember most.'],
    related: ['edit-profile', 'microphone-audio'],
    keywords: ['video', 'introduction', 'profile video', 'record', 'camera', 'intro', 'filter', 'background'],
  },

  // ───────────── Troubleshooting ─────────────
  {
    id: 'microphone-audio',
    category: 'Troubleshooting',
    title: 'I can\'t hear the interviewers, or they can\'t hear me',
    summary: 'The usual causes of audio, microphone and camera problems.',
    steps: [
      'Before starting, click 🔊 Test audio on the interview summary. If you don\'t hear it, check your device volume, then the speaker control at the top of the screen (Voice Volume).',
      'If your answers are not being picked up, allow microphone access when your browser asks. If you blocked it, click the padlock beside the address bar and switch the microphone back on, then reload the page.',
      'If the status at the top says "No video — camera/mic denied", allow camera and microphone in the same way and start again.',
      'No luck with the microphone? Switch Answer mode to Type, or use the text box under the question, and carry on.',
      'Close other apps or tabs that might be using your microphone or camera, then try again.',
    ],
    related: ['interview-room', 'get-in-touch'],
    keywords: ['audio', 'sound', 'microphone', 'mic', 'camera', 'hear', 'volume', 'voice', 'silent', 'no sound', 'permission', 'denied'],
  },
  {
    id: 'interview-wont-start',
    category: 'Troubleshooting',
    title: 'My interview won\'t start',
    summary: 'The two reasons, and what to do about each.',
    steps: [
      'If the screen says something is missing ("Add … before you can start"), add it: a Job Title, Job Spec or CV is needed, and one is enough.',
      'If a box appears saying you can\'t start right now, read its message — it tells you exactly why, for example that you have reached a limit for today or you need a plan. It also shows your ways forward.',
      'Check your plan: click your name at the bottom left of the menu to open My Account.',
      'Still stuck? Contact us and tell us what the screen said.',
    ],
    related: ['account-and-plan', 'practice-interview', 'get-in-touch'],
    keywords: ['start', 'won\'t start', 'cannot start', 'limit', 'paywall', 'subscribe', 'plan', 'blocked', 'error', 'missing'],
  },
  {
    id: 'account-and-plan',
    category: 'Troubleshooting',
    title: 'Manage my plan or delete my account',
    summary: 'Where to subscribe, change or cancel, and how to delete your account.',
    steps: [
      'Click your name at the bottom left of the menu to open My Account.',
      'There you can see your plan, subscribe or cancel, and delete your account.',
    ],
    body: ['If you do not yet have a paid plan, the same spot reads "Subscribe" so it is easy to find.'],
    related: ['interview-wont-start', 'get-in-touch'],
    keywords: ['account', 'plan', 'subscribe', 'subscription', 'cancel', 'billing', 'delete account', 'payment', 'pricing'],
  },
  {
    id: 'cv-analysis-error',
    category: 'Troubleshooting',
    title: 'My CV won\'t upload or analyse',
    summary: 'Quick fixes for the CV Analyzer and the CV box in an interview.',
    steps: [
      'Check the file type: PDF, DOCX, DOC or TXT, up to 10MB.',
      'If a file will not read, save it again as a PDF or DOCX, or paste the text into the CV Text box on the interview set-up screen instead.',
      'If you see an error message, wait a moment and try again.',
      'If a message says you have reached a limit, it explains what the limit is.',
    ],
    related: ['cv-analyzer', 'get-in-touch'],
    keywords: ['cv', 'upload', 'error', 'pdf', 'docx', 'file', 'resume', 'won\'t read', 'failed', 'limit'],
  },
  {
    id: 'forgot-password',
    category: 'Troubleshooting',
    title: 'I forgot my password',
    summary: 'Reset it by email in a minute.',
    steps: [
      'On the sign-in page, click "Forgot your password?".',
      'Enter the email address you registered with and send the request.',
      'Open the email we send you and click the link in it.',
      'Choose a new password, confirm it, and sign in.',
    ],
    tips: [
      'No email? Check your spam or junk folder, and make sure you used the same address you registered with.',
      'If the link says it is invalid or missing, request a new reset link and use the newest email.',
    ],
    related: ['get-in-touch'],
    keywords: ['password', 'forgot', 'reset', 'sign in', 'login', 'log in', 'cannot log in', 'locked out', 'access'],
  },
  {
    id: 'get-in-touch',
    category: 'Troubleshooting',
    title: 'Still stuck? Contact us',
    summary: 'A real person will look at it.',
    body: ['If you cannot find your answer here, or something is not working as described, send us a message. Tell us what you were trying to do and what happened — screenshots help.'],
    keywords: ['contact', 'support', 'help', 'problem', 'bug', 'feedback', 'talk to someone'],
  },
];
