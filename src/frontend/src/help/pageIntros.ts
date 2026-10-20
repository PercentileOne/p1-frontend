// What each candidate-portal page is for, in one or two plain sentences (Francis, 2026-10-20: "put a short description of what the page does, somewhere at the top").
// Shown above the page by PageIntro, keyed by the menu label in CandidateDashboard's NAV_ITEMS. Written to say only what the page really does today:
// Jobs and Messages show example data for now, and say so. Demo and Help have no entry, since the Demo page already explains itself and the Help Centre is the explanation.
// UK spelling, "practice" for the verb as well as the noun (house style). Keep each to about 300 characters.

export const PAGE_INTROS: Record<string, string> = {
  'Dashboard':
    'Your starting point. See how your profile is doing, what is happening in the job market, your next interview and today\'s question. Everything else is in the menu: WORK for the job-hunting tools, HOME for your own routines and learning.',
  'Feed':
    'Your daily feed. Answer the Question of the Day, watch short videos, find books and courses worth your time, and save what you like for later. The questions are written by us, everything else comes from the people who made it, and your saves are private to you.',
  'Job Interviews':
    'Practice interviews with AI interviewers who talk back. Set up an interview for the role you want, take it, and get a score and feedback. Every session you save is listed here, where you can replay it, keep it private or share it.',
  'My Talks':
    'Practice a talk or presentation out loud. Record yourself and get tips, a score and feedback. Your saved talks are listed here, and you choose who can see each one.',
  'Interview Preps':
    'Practice interviews set up for you by a recruiter, for the exact role you are going for. When a recruiter sends you one, it appears here ready to start.',
  'My Career Coach':
    'Ask whatever is on your mind about your career, any time: your next step, a tricky conversation, how to prepare. Your coach is an AI, so use it to think things through.',
  'Careers Explorer':
    'Look up a career and see real salaries, how much demand there is, how much AI is likely to change the job, and the route in.',
  'CV Analysis':
    'Upload your CV to see which real roles it fits, what they pay, and your strengths and weaknesses. You can save your results and, if you choose, share a card of your strengths on your profile.',
  'Certifications & Exams':
    'Pick the certification or test you are preparing for and take a multiple-choice mock exam. You get your score and can see where to practice more.',
  'Jobs':
    'Jobs is coming soon. The roles you see here are examples, so you can see how it will work: search, filter, and see roles that match you.',
  'Messages':
    'Messages is coming soon. The conversations you see here are examples that show how direct messages, groups and recruiter chats will work.',
  'My Routines':
    'Plan your day with routines you can tick off. Add your own items, mark the essential ones, and see how each day went. The Systems tab looks back over each week and month, and the Goals tab keeps what you are aiming for.',
  'My Profile':
    'Your profile: your bio, dream role, projects and interests, and the switches that control what recruiters can see and who can comment.',
  'Learn':
    'Type any topic and get a complete course with practice built in. Open a course to read it, listen to it, or test yourself.',
  'Learn Alerts':
    'Spaced practice by email. Choose a subject and one multiple-choice question arrives in your inbox at a time, so what you learn sticks.',
  'Question Bank':
    'Your saved model answers. When an interview question stumps you, you can see a model answer and keep it here to look over before the real thing.',
  'Interview Gifts':
    'Free practice interviews that someone has given you. If you have been gifted some, they show here ready to use.',
  'Settings':
    'Your account settings: profile details, how the portal looks, notifications, privacy and billing. Some of these switches are still being connected.',
};
