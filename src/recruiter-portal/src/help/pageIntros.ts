// What each recruiter-portal page is for, in one or two plain sentences (Francis, 2026-10-20: "put a short description of what the page does, somewhere at the top").
// Shown above the page by PageIntro, keyed by the menu label in Dashboard's NAV_ITEMS. Written to say only what the page really does today: the Dashboard's activity numbers and
// pending-interviews list are fixed examples for now, and the description says so. Settings has no entry because that page is a "Coming soon" placeholder, and Help is the explanation.
// UK spelling, "practice" for the verb as well as the noun (house style). Keep each to about 300 characters.

export const PAGE_INTROS: Record<string, string> = {
  'Dashboard':
    'Your starting point. Follow the getting-started steps and see figures for the industry. The activity numbers and the pending interviews further down are examples for now.',
  'Interview Preps':
    'Send a candidate a realistic AI interview for the exact role, before the real one. You can see whether they have opened it, how many attempts they have made and whether they have finished. You never see their answers or scores.',
  'Client Gifts':
    'Gift your client\'s hiring manager a free set of interview questions, branded as a gift from you. It helps them interview well, and it is included with your seat.',
  'CV Insights':
    'Upload a CV and get an AI read of the person. Your saved analyses are listed here to reopen, and you can share one by link.',
  'Alerts':
    'Set a talent alert for a role and a score, and be told when a candidate scores above your bar.',
  'Team':
    'A shared feed for your agency to post to, and a view of how many of your seats are in use.',
  'Candidate Marketplace':
    'Search candidates who have chosen to be discoverable. Only candidates who have opted in appear here.',
  'Analytics':
    'Your own activity over the last six months, counted from your records.',
}
