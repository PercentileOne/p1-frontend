// Help Centre content for the recruiter portal (Francis, 2026-09-30). Plain data on purpose: one place to edit wording, and the same
// text can later feed the support assistant and the public help pages. Rules for writing here:
//  - describe only what the portal really does (check the page before adding a claim);
//  - no prices or limits in the text — they change; point to the pricing page instead;
//  - one task per article, steps first, short.

export type HelpCategory = 'Getting started' | 'Your candidates' | 'Your clients' | 'Finding talent' | 'Your team' | 'Troubleshooting';

export interface HelpArticle {
  id: string;
  category: HelpCategory;
  title: string;
  summary: string;
  /** The left-menu page this article explains — drives the "How does this work?" hint on that page. */
  navLabel?: string;
  body?: string[];
  steps?: string[];
  tips?: string[];
  related?: string[];
  keywords?: string[];
}

export const HELP_CATEGORIES: HelpCategory[] = ['Getting started', 'Your candidates', 'Your clients', 'Finding talent', 'Your team', 'Troubleshooting'];

export const CONTACT_URL = 'https://www.theinterviewchair.com/contact';

export const RECRUITER_ARTICLES: HelpArticle[] = [
  {
    id: 'welcome',
    category: 'Getting started',
    title: 'Welcome — what you can do here',
    summary: 'A quick tour of the menu, so you know where everything lives.',
    body: [
      'This portal helps you send candidates in fully prepared, and helps your clients interview better. Everything is in the menu on the left:',
      'Interview Preps — send a candidate a tailored practice interview for the exact role they are going for.',
      'Client Gifts — give your client a free batch of interview questions, branded as a gift from you.',
      'CV Insights — upload a CV and get an AI read of skills, suitable roles, strengths and weaknesses.',
      'Alerts — be told when a candidate scores above your bar for a role.',
      'Candidate Marketplace — search candidates who have chosen to be found by recruiters.',
      'Team — a shared feed for your agency, plus your seat roster.',
    ],
    related: ['first-ten-minutes', 'send-interview-prep'],
    keywords: ['start', 'overview', 'menu', 'tour', 'new'],
  },
  {
    id: 'first-ten-minutes',
    category: 'Getting started',
    title: 'Your first ten minutes',
    summary: 'Four quick wins that show you what the portal is for.',
    steps: [
      'Send an Interview Prep to a candidate you are about to put forward (Interview Preps).',
      'Gift your client a free set of interview questions for the role (Client Gifts).',
      'Set a talent alert for a role you recruit for often (Alerts).',
      'Say hello to your colleagues on the Team page.',
    ],
    tips: ['The "Getting started" card on your Dashboard ticks these off for you as you go.'],
    related: ['send-interview-prep', 'gift-client-questions', 'talent-alerts', 'team-page'],
    keywords: ['first', 'begin', 'checklist', 'onboarding'],
  },
  {
    id: 'send-interview-prep',
    category: 'Your candidates',
    title: 'Send a candidate an Interview Prep',
    summary: 'Give a candidate a realistic AI interview for the exact role, before the real one.',
    navLabel: 'Interview Preps',
    steps: [
      'Open Interview Preps in the left menu and choose to send a new prep.',
      'Enter the candidate\'s first name, last name and email address.',
      'Say which role they are interviewing for. Paste the full job description, or upload it as a PDF — the more detail, the better the questions fit.',
      'Choose the interview difficulty and which round it is, using the dropdowns.',
      'Optionally add the salary expectation and any special focus areas.',
      'Click Send Interview Prep.',
    ],
    body: [
      'Your candidate receives an email that presents the practice as a gift from you, with a link to try a realistic interview for that role. At the end they get a score and honest feedback.',
    ],
    tips: [
      'Choosing the real interview round makes the questions match what they will actually face.',
      'Pasting the whole job description gives much sharper questions than a job title alone.',
    ],
    related: ['edit-resend-prep', 'email-not-arrived'],
    keywords: ['prep', 'send', 'candidate', 'link', 'invite', 'practice', 'interview'],
  },
  {
    id: 'edit-resend-prep',
    category: 'Your candidates',
    title: 'Edit, resend or remove a prep',
    summary: 'Fix a typo, change the role, or clear out old preps.',
    navLabel: 'Interview Preps',
    steps: [
      'Open Interview Preps and find the prep in your list.',
      'Click it to open it, change whatever you need, then choose Save & Resend. Your candidate gets the updated email.',
      'To tidy up, select the preps you no longer need and remove them.',
    ],
    related: ['send-interview-prep', 'email-not-arrived'],
    keywords: ['edit', 'change', 'resend', 'delete', 'remove', 'typo', 'wrong email'],
  },
  {
    id: 'gift-client-questions',
    category: 'Your clients',
    title: 'Gift your client interview questions',
    summary: 'Help the hiring manager interview well — a free set of questions, from you.',
    navLabel: 'Client Gifts',
    steps: [
      'Open Client Gifts in the left menu.',
      'Enter your client\'s email and company, and the job role they are interviewing for.',
      'Choose the difficulty and how many questions to send (up to 50).',
      'Optionally add a personal message.',
      'Click send. Your client gets a branded email from you with a link to their questions — they can read and print them, no login needed.',
    ],
    body: ['It is free with your seat. It works best alongside a candidate prep: you prepare the candidate, and you also help the client.'],
    tips: [
      'Sending the same client the same role again reuses the earlier set. Tick "Send a different set of questions" if you want a fresh one.',
      'The set is deliberately bigger than a candidate\'s, so your client never worries they are seeing the candidate\'s list.',
    ],
    related: ['send-interview-prep'],
    keywords: ['client', 'gift', 'questions', 'hiring manager', 'employer', 'print', 'free'],
  },
  {
    id: 'talent-alerts',
    category: 'Finding talent',
    title: 'Set a talent alert',
    summary: 'Be told when a candidate scores above your bar for a role.',
    navLabel: 'Alerts',
    steps: [
      'Open Alerts and choose New talent alert.',
      'Pick the role (start typing and choose from the list, or enter your own).',
      'Set the minimum score a candidate must reach.',
      'Optionally add a location and a distance in miles.',
      'Save. You are notified whenever a completed interview clears your bar.',
    ],
    body: ['Every match is kept under Match History. You can pause, resume or delete an alert at any time.'],
    tips: ['Role matching is loose, so a short role name such as "Software Engineer" catches more than a long one.'],
    related: ['candidate-marketplace'],
    keywords: ['alert', 'notify', 'score', 'talent', 'match', 'threshold'],
  },
  {
    id: 'candidate-marketplace',
    category: 'Finding talent',
    title: 'Search the Candidate Marketplace',
    summary: 'Find candidates who have chosen to be discoverable.',
    navLabel: 'Candidate Marketplace',
    steps: [
      'Open Candidate Marketplace.',
      'Search by name, role, skill or location.',
      'Open a result to see their public profile.',
    ],
    body: [
      'Only candidates who have switched on visibility to recruiters in their own profile appear here, and you see only their public profile. That is why the list grows over time as more candidates opt in.',
    ],
    related: ['talent-alerts'],
    keywords: ['search', 'find', 'candidates', 'marketplace', 'discover', 'profile'],
  },
  {
    id: 'cv-insights',
    category: 'Finding talent',
    title: 'Get insights from a CV',
    summary: 'Upload a CV and get an AI read of the person.',
    navLabel: 'CV Insights',
    steps: [
      'Open CV Insights and upload a CV.',
      'Read the analysis: skills, suitable roles, strengths and weaknesses.',
      'Listen to the spoken walkthrough if you prefer.',
      'Find earlier analyses in the list on the same page.',
    ],
    keywords: ['cv', 'resume', 'analyse', 'analyze', 'skills', 'strengths'],
  },
  {
    id: 'team-page',
    category: 'Your team',
    title: 'Use the Team page',
    summary: 'A shared feed for your agency, and a view of your seats.',
    navLabel: 'Team',
    steps: [
      'Open Team in the left menu.',
      'Write an update in the box and click Post — everyone at your agency can see it and post too.',
      'Check the seat roster to see who is on your account and how many seats are used.',
    ],
    tips: ['Need more seats? Get in touch and we will sort it out.'],
    keywords: ['team', 'colleagues', 'seats', 'feed', 'post', 'invite'],
  },
  {
    id: 'email-not-arrived',
    category: 'Troubleshooting',
    title: 'My candidate says they did not get the email',
    summary: 'The usual causes, and how to resend.',
    steps: [
      'Ask them to check their spam or junk folder, and to search their mailbox for "TheInterviewChair".',
      'In Interview Preps, open the prep and check the email address is spelled correctly.',
      'If it was wrong, correct it and choose Save & Resend.',
      'Still nothing? Contact us and tell us the candidate\'s email and roughly when you sent it.',
    ],
    related: ['edit-resend-prep', 'get-in-touch'],
    keywords: ['email', 'spam', 'junk', 'not received', 'missing', 'resend', 'delivery'],
  },
  {
    id: 'get-in-touch',
    category: 'Troubleshooting',
    title: 'Still stuck? Contact us',
    summary: 'A real person will look at it.',
    body: ['If you cannot find your answer here, or something is not working as described, send us a message. Tell us what you were trying to do and what happened — screenshots help.'],
    keywords: ['contact', 'support', 'help', 'problem', 'bug', 'feedback'],
  },
];
