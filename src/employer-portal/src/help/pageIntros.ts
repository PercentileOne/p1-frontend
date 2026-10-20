// What each employer-portal page is for, in one or two plain sentences (Francis, 2026-10-20: "put a short description of what the page does, somewhere at the top").
// Shown above the page by PageIntro, keyed by the menu label in Dashboard's NAV_ITEMS. Written to say only what the page really does today.
// Direct Applications, Open Roles, Analytics and Settings have no entry because those pages are "Coming soon" placeholders that already say so.
// UK spelling, "practice" for the verb as well as the noun (house style). Keep each to about 300 characters.

export const PAGE_INTROS: Record<string, string> = {
  'Dashboard':
    'Your starting point. See figures for the industry and a summary of the introductions sent to you: how many are waiting for your reply, and how many you have accepted or declined.',
  'Candidate Marketplace':
    'Search candidates who have chosen to be discoverable. Only candidates who have opted in appear here.',
  'Introductions':
    'Candidates put in front of you by recruiters, or by the candidates themselves. Watch each candidate\'s interview, then accept or decline.',
  'Alerts':
    'Set a talent alert for a role and a score, and be told when a candidate scores above your bar.',
}
