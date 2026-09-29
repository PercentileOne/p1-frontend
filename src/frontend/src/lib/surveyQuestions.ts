// Rotating intake-screen survey bank (Francis, 2026-09-29). One question is shown per intake,
// so every interview adds a real data point to TheInterviewChair's own, growing stats.
//
// RULES for adding questions — the ids are the permanent join key in Cosmos (surveyResponses):
//   - never rename or reuse a question id or answer id once shipped; retire it by deleting the
//     question here (old rows simply stop being asked, they aren't lost);
//   - ids are kebab-case [a-z0-9-], max 60 chars (backend validates);
//   - no protected-characteristic questions (age, race, health, religion, etc.) — we ask about
//     experiences and behaviour, never about who the candidate is. Every question is skippable.

export interface SurveyOption { id: string; label: string }
export interface SurveyQuestion {
  id: string;
  theme: 'confidence' | 'cost' | 'process' | 'ghosting' | 'fairness' | 'ai' | 'prep' | 'nerves' | 'search' | 'outcome';
  text: string;
  options: SurveyOption[];
}

const YES_NO: SurveyOption[] = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];
const FREQ: SurveyOption[] = [
  { id: 'never', label: 'Never' }, { id: 'once', label: 'Once' },
  { id: 'a-few-times', label: 'A few times' }, { id: 'often', label: 'Often' },
];
const AGREE: SurveyOption[] = [
  { id: 'strongly-disagree', label: 'Strongly disagree' }, { id: 'disagree', label: 'Disagree' },
  { id: 'neutral', label: 'Neutral' }, { id: 'agree', label: 'Agree' }, { id: 'strongly-agree', label: 'Strongly agree' },
];
const opts = (...pairs: [string, string][]): SurveyOption[] => pairs.map(([id, label]) => ({ id, label }));

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  // ── Confidence (the original fixed question; keeps its legacy id so history stays joined) ──
  { id: 'interview-confidence', theme: 'confidence', text: 'Right now, how do you feel about interviews in general?',
    options: opts(['confident', 'Confident'], ['not-confident', 'Not confident']) },
  { id: 'confidence-scale', theme: 'confidence', text: 'How confident do you feel going into your next real interview?',
    options: opts(['very-low', 'Very low'], ['low', 'Low'], ['ok', 'OK'], ['high', 'High'], ['very-high', 'Very high']) },
  { id: 'confidence-after-practice', theme: 'confidence', text: 'Does practising out loud make you feel more confident?',
    options: opts(['a-lot', 'Yes, a lot'], ['a-bit', 'A little'], ['no-change', 'No change'], ['not-sure', 'Not sure yet']) },
  { id: 'biggest-worry', theme: 'confidence', text: "What's your biggest worry about interviews?",
    options: opts(['blanking', 'Going blank'], ['tough-questions', 'Tough questions'], ['nerves', 'Nerves'], ['not-good-enough', 'Not being good enough'], ['salary', 'Salary questions'], ['nothing', 'Nothing much']) },
  { id: 'imposter-feeling', theme: 'confidence', text: 'Do you ever feel you got an interview by luck rather than merit?', options: FREQ },
  { id: 'better-than-last-time', theme: 'confidence', text: 'Compared with your last real interview, do you feel more prepared this time?',
    options: opts(['more', 'More prepared'], ['same', 'About the same'], ['less', 'Less prepared'], ['first', "It's my first"]) },

  // ── Cost & access ──
  { id: 'cost-declined-interview', theme: 'cost', text: 'Have you ever turned down or skipped an interview because you couldn\'t afford to get there?', options: FREQ },
  { id: 'cost-typical-spend', theme: 'cost', text: 'Roughly how much does attending one in-person interview cost you (travel, clothes, time off)?',
    options: opts(['under-10', 'Under £10'], ['10-25', '£10–25'], ['25-50', '£25–50'], ['50-100', '£50–100'], ['over-100', 'Over £100']) },
  { id: 'cost-unpaid-time-off', theme: 'cost', text: 'Have you ever taken unpaid time off work to attend an interview?', options: FREQ },
  { id: 'cost-expenses-offered', theme: 'cost', text: 'Has an employer ever offered to cover your interview travel costs?',
    options: opts(['always', 'Always'], ['sometimes', 'Sometimes'], ['rarely', 'Rarely'], ['never', 'Never']) },
  { id: 'cost-remote-preference', theme: 'cost', text: 'Would you rather do early interview rounds by video to save money and time?',
    options: opts(['always', 'Yes, always'], ['depends', 'Depends on the role'], ['in-person', 'I prefer in person']) },
  { id: 'cost-bought-outfit', theme: 'cost', text: 'Have you ever bought clothes specifically for an interview?', options: FREQ },
  { id: 'cost-childcare', theme: 'cost', text: 'Has arranging childcare or caring cover ever made an interview harder to attend?',
    options: opts(['yes-often', 'Yes, often'], ['yes-once', 'Once or twice'], ['no', 'No'], ['na', 'Not applicable']) },
  { id: 'cost-travel-long-distance', theme: 'cost', text: 'Have you travelled more than two hours for a single interview?', options: FREQ },
  { id: 'cost-prep-paid', theme: 'cost', text: 'Have you ever paid for interview coaching or prep materials?',
    options: opts(['yes-worth', 'Yes, worth it'], ['yes-not-worth', "Yes, wasn't worth it"], ['no-cant-afford', "No, couldn't afford it"], ['no-not-needed', "No, didn't need to"]) },
  { id: 'cost-financial-pressure', theme: 'cost', text: 'Is money a source of pressure in your job search right now?',
    options: opts(['a-lot', 'A lot'], ['some', 'Some'], ['little', 'A little'], ['none', 'Not at all']) },

  // ── Process length & structure ──
  { id: 'process-rounds-last', theme: 'process', text: 'How many interview rounds did your most recent job involve?',
    options: opts(['1', 'One'], ['2', 'Two'], ['3', 'Three'], ['4-plus', 'Four or more'], ['none-yet', "I haven't had one"]) },
  { id: 'process-too-long', theme: 'process', text: 'Have you ever felt a hiring process dragged on too long?', options: FREQ },
  { id: 'process-weeks-to-offer', theme: 'process', text: 'From first interview to a decision, how long did your last process take?',
    options: opts(['under-1-week', 'Under a week'], ['1-2-weeks', '1–2 weeks'], ['3-4-weeks', '3–4 weeks'], ['over-month', 'Over a month'], ['no-answer', 'Never heard back']) },
  { id: 'process-take-home-task', theme: 'process', text: 'Have you been asked to do an unpaid task or assignment as part of an application?', options: FREQ },
  { id: 'process-task-time', theme: 'process', text: 'When set a task, how long did it usually take you?',
    options: opts(['under-1h', 'Under an hour'], ['1-3h', '1–3 hours'], ['3-8h', '3–8 hours'], ['over-8h', 'Over 8 hours'], ['never', 'Never had one']) },
  { id: 'process-panel', theme: 'process', text: 'Have you faced a panel interview (several interviewers at once)?', options: FREQ },
  { id: 'process-job-spec-match', theme: 'process', text: 'Did the interview questions match the job advert?',
    options: opts(['always', 'Usually'], ['sometimes', 'Sometimes'], ['rarely', 'Rarely'], ['never', 'Almost never']) },
  { id: 'process-feedback-given', theme: 'process', text: 'After an interview, do employers give you useful feedback?',
    options: opts(['always', 'Always'], ['sometimes', 'Sometimes'], ['rarely', 'Rarely'], ['never', 'Never']) },
  { id: 'process-applications-per-interview', theme: 'process', text: 'Roughly how many applications do you send per interview you get?',
    options: opts(['1-5', '1–5'], ['6-15', '6–15'], ['16-30', '16–30'], ['31-50', '31–50'], ['over-50', 'More than 50']) },
  { id: 'process-interviews-this-month', theme: 'process', text: 'How many real interviews have you had in the last month?',
    options: opts(['0', 'None'], ['1', 'One'], ['2-3', '2–3'], ['4-plus', '4 or more']) },
  { id: 'process-salary-disclosed', theme: 'process', text: 'Was the salary range clear before you applied for your last role?',
    options: opts(['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No'], ['dont-know', "Don't remember"]) },
  { id: 'process-notice-period', theme: 'process', text: 'Has a long notice period ever cost you an opportunity?', options: FREQ },
  { id: 'process-job-ad-honesty', theme: 'process', text: 'Has the real job turned out different from the advert?', options: FREQ },

  // ── Ghosting & communication ──
  { id: 'ghosted-after-interview', theme: 'ghosting', text: 'Have you ever been ghosted after an interview (no reply at all)?', options: FREQ },
  { id: 'ghosted-after-application', theme: 'ghosting', text: 'How often do you hear nothing back after applying?',
    options: opts(['almost-never', 'Almost never'], ['sometimes', 'Sometimes'], ['most-times', 'Most of the time'], ['always', 'Every time']) },
  { id: 'ghosted-how-long-wait', theme: 'ghosting', text: 'How long do you wait before deciding you\'ve been ghosted?',
    options: opts(['1-week', 'A week'], ['2-weeks', 'Two weeks'], ['1-month', 'A month'], ['never-decide', 'I never give up hope']) },
  { id: 'ghosted-emotional-impact', theme: 'ghosting', text: 'How much does not hearing back affect your motivation?',
    options: opts(['not-at-all', 'Not at all'], ['a-little', 'A little'], ['a-lot', 'A lot'], ['badly', 'It really hurts']) },
  { id: 'ghosted-offer-withdrawn', theme: 'ghosting', text: 'Has a job offer ever been withdrawn or gone silent after you accepted?', options: FREQ },
  { id: 'ghosted-you-withdrew', theme: 'ghosting', text: 'Have you ever withdrawn from a process because the employer was slow or unresponsive?', options: FREQ },
  { id: 'ghosted-rejection-preferred', theme: 'ghosting', text: 'Would you rather get a quick "no" than wait in silence?',
    options: opts(['yes-always', 'Yes, always'], ['yes-with-feedback', 'Yes, with feedback'], ['no', 'No']) },

  // ── Fairness & experience (behaviour, never demographics) ──
  { id: 'fairness-felt-fair', theme: 'fairness', text: 'Did your last interview feel fair?',
    options: opts(['very', 'Very fair'], ['mostly', 'Mostly'], ['not-really', 'Not really'], ['not-at-all', 'Not at all'], ['none-yet', 'No recent interview']) },
  { id: 'fairness-inappropriate-question', theme: 'fairness', text: 'Have you ever been asked a question in an interview that felt inappropriate?', options: FREQ },
  { id: 'fairness-judged-unfairly', theme: 'fairness', text: 'Have you felt judged on something other than your ability to do the job?', options: FREQ },
  { id: 'fairness-consistent-questions', theme: 'fairness', text: 'Do you believe every candidate gets asked the same questions?',
    options: opts(['yes', 'Yes'], ['sometimes', 'Sometimes'], ['no', 'No'], ['no-idea', 'No idea']) },
  { id: 'fairness-first-impression', theme: 'fairness', text: 'How much do you think first impressions decide the outcome?',
    options: opts(['little', 'Very little'], ['some', 'Some'], ['lot', 'A lot'], ['most', 'Almost everything']) },
  { id: 'fairness-referral-matters', theme: 'fairness', text: 'Do you think who you know matters more than what you know?',
    options: opts(['agree', 'Yes'], ['sometimes', 'Sometimes'], ['disagree', 'No']) },
  { id: 'fairness-respected', theme: 'fairness', text: 'Did your last interviewer make you feel respected?',
    options: opts(['yes', 'Yes'], ['mostly', 'Mostly'], ['no', 'No'], ['none-yet', 'No recent interview']) },

  // ── AI in hiring ──
  { id: 'ai-faced-ai-interview', theme: 'ai', text: 'Have you had an interview conducted or scored by AI?', options: opts(['yes', 'Yes'], ['no', 'No'], ['not-sure', 'Not sure']) },
  { id: 'ai-told-beforehand', theme: 'ai', text: 'If AI was involved in a hiring process, were you told beforehand?',
    options: opts(['always', 'Always'], ['sometimes', 'Sometimes'], ['never', 'Never'], ['na', "Hasn't happened"]) },
  { id: 'ai-comfortable-with-ai-interviewer', theme: 'ai', text: 'How comfortable are you being interviewed by an AI?',
    options: opts(['very', 'Very'], ['somewhat', 'Somewhat'], ['not-very', 'Not very'], ['not-at-all', 'Not at all']) },
  { id: 'ai-abandoned-process', theme: 'ai', text: 'Would you drop out of a hiring process because it used an AI interviewer?',
    options: opts(['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']) },
  { id: 'ai-use-for-cv', theme: 'ai', text: 'Do you use AI tools to help with your CV or applications?',
    options: opts(['always', 'Always'], ['sometimes', 'Sometimes'], ['rarely', 'Rarely'], ['never', 'Never']) },
  { id: 'ai-fairer-than-human', theme: 'ai', text: 'Do you think an AI interviewer could be fairer than a human one?',
    options: opts(['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']) },
  { id: 'ai-practice-helps', theme: 'ai', text: 'Is practising with an AI interviewer as useful as practising with a friend?',
    options: opts(['more', 'More useful'], ['same', 'About the same'], ['less', 'Less useful']) },

  // ── Preparation habits ──
  { id: 'prep-hours-before', theme: 'prep', text: 'How long do you usually prepare for a real interview?',
    options: opts(['none', 'Not at all'], ['under-1h', 'Under an hour'], ['1-3h', '1–3 hours'], ['3-8h', '3–8 hours'], ['over-8h', 'Over 8 hours']) },
  { id: 'prep-practised-aloud', theme: 'prep', text: 'Before a real interview, do you practise answers out loud?',
    options: opts(['always', 'Always'], ['sometimes', 'Sometimes'], ['rarely', 'Rarely'], ['never', 'Never']) },
  { id: 'prep-researched-company', theme: 'prep', text: 'Do you research the company before every interview?',
    options: opts(['always', 'Always'], ['usually', 'Usually'], ['rarely', 'Rarely'], ['never', 'Never']) },
  { id: 'prep-mock-with-person', theme: 'prep', text: 'Have you ever done a mock interview with another person?', options: YES_NO },
  { id: 'prep-hardest-part', theme: 'prep', text: 'What do you find hardest to prepare for?',
    options: opts(['behavioural', 'Behavioural questions'], ['technical', 'Technical questions'], ['salary', 'Salary talk'], ['tell-me-about-yourself', 'Tell me about yourself'], ['weaknesses', 'Weaknesses'], ['gaps', 'Career gaps']) },
  { id: 'prep-star-method', theme: 'prep', text: 'Do you use a structure like STAR when answering behavioural questions?',
    options: opts(['yes', 'Yes'], ['heard-of', 'Heard of it'], ['no', 'No']) },
  { id: 'prep-questions-to-ask', theme: 'prep', text: 'Do you go in with questions of your own to ask the employer?',
    options: opts(['always', 'Always'], ['sometimes', 'Sometimes'], ['rarely', 'Rarely'], ['never', 'Never']) },
  { id: 'prep-recorded-yourself', theme: 'prep', text: 'Have you ever watched a recording of yourself answering interview questions?', options: YES_NO },
  { id: 'prep-enough-time-given', theme: 'prep', text: 'Do employers usually give you enough notice to prepare?',
    options: opts(['yes', 'Yes'], ['sometimes', 'Sometimes'], ['no', 'No']) },
  { id: 'prep-source', theme: 'prep', text: 'Where do you usually get interview advice?',
    options: opts(['friends', 'Friends or family'], ['online', 'Online articles/videos'], ['ai', 'AI tools'], ['coach', 'A coach or course'], ['nowhere', 'Nowhere really']) },

  // ── Nerves & wellbeing (about the interview, not health) ──
  { id: 'nerves-physical', theme: 'nerves', text: 'How much do nerves affect you in interviews?',
    options: opts(['not-at-all', 'Not at all'], ['a-little', 'A little'], ['quite-a-bit', 'Quite a bit'], ['severely', 'They take over']) },
  { id: 'nerves-night-before', theme: 'nerves', text: 'Do you sleep badly the night before an interview?', options: opts(['always', 'Always'], ['sometimes', 'Sometimes'], ['rarely', 'Rarely'], ['never', 'Never']) },
  { id: 'nerves-blanked', theme: 'nerves', text: 'Have you ever completely blanked on an answer in an interview?', options: FREQ },
  { id: 'nerves-first-minutes', theme: 'nerves', text: 'When do nerves hit hardest?',
    options: opts(['before', 'Beforehand'], ['first-minutes', 'The first few minutes'], ['hard-question', 'On a hard question'], ['end', 'At the end'], ['never', "They don't"]) },
  { id: 'nerves-video-vs-person', theme: 'nerves', text: 'Which makes you more nervous?',
    options: opts(['video', 'Video call'], ['in-person', 'In person'], ['phone', 'Phone'], ['same', 'All the same']) },
  { id: 'nerves-after-rejection', theme: 'nerves', text: 'After a rejection, how long does it take you to feel ready to apply again?',
    options: opts(['same-day', 'Same day'], ['few-days', 'A few days'], ['week-plus', 'A week or more'], ['long', 'A long time']) },

  // ── Job search context ──
  { id: 'search-how-long', theme: 'search', text: 'How long have you been job hunting this time?',
    options: opts(['just-started', 'Just started'], ['under-3m', 'Under 3 months'], ['3-6m', '3–6 months'], ['6-12m', '6–12 months'], ['over-year', 'Over a year']) },
  { id: 'search-employed-now', theme: 'search', text: 'Are you currently employed?',
    options: opts(['yes-full', 'Yes, full time'], ['yes-part', 'Yes, part time'], ['no', 'No'], ['student', "I'm a student"]) },
  { id: 'search-reason', theme: 'search', text: "What's the main reason you're looking?",
    options: opts(['first-job', 'First job'], ['better-pay', 'Better pay'], ['progression', 'Career progression'], ['unhappy', 'Unhappy where I am'], ['redundancy', 'Redundancy / contract ended'], ['change', 'Career change']) },
  { id: 'search-channels', theme: 'search', text: 'Where do most of your interviews come from?',
    options: opts(['job-boards', 'Job boards'], ['linkedin', 'LinkedIn'], ['recruiters', 'Recruiters'], ['referrals', 'Referrals'], ['direct', 'Applying direct']) },
  { id: 'search-recruiter-experience', theme: 'search', text: 'How would you rate your experience with recruiters?',
    options: opts(['great', 'Great'], ['ok', 'OK'], ['poor', 'Poor'], ['never-used', "Haven't used one"]) },
  { id: 'search-applying-above-level', theme: 'search', text: 'Do you apply for roles slightly above your current level?',
    options: opts(['often', 'Often'], ['sometimes', 'Sometimes'], ['rarely', 'Rarely'], ['never', 'Never']) },
  { id: 'search-relocate', theme: 'search', text: 'Would you relocate for the right role?',
    options: opts(['yes', 'Yes'], ['within-country', 'Within my country'], ['no', 'No']) },
  { id: 'search-remote-preference', theme: 'search', text: "What's your ideal way of working?",
    options: opts(['remote', 'Fully remote'], ['hybrid', 'Hybrid'], ['office', 'In the office'], ['no-preference', 'No preference']) },
  { id: 'search-salary-negotiate', theme: 'search', text: 'Have you ever negotiated a salary offer?',
    options: opts(['always', 'Always'], ['sometimes', 'Sometimes'], ['tried', 'Tried, was refused'], ['never', 'Never']) },
  { id: 'search-multiple-offers', theme: 'search', text: 'Have you ever held more than one job offer at once?', options: FREQ },

  // ── Outcomes & value ──
  { id: 'outcome-got-job-after-practice', theme: 'outcome', text: 'Have you got a job offer after practising here before?',
    options: opts(['yes', 'Yes'], ['not-yet', 'Not yet'], ['first-time', "It's my first time here"]) },
  { id: 'outcome-practice-worthwhile', theme: 'outcome', text: 'Is practising interviews worth the time?', options: AGREE },
  { id: 'outcome-employers-should-offer-practice', theme: 'outcome', text: 'Should employers offer candidates a practice interview first?',
    options: opts(['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']) },
  { id: 'outcome-share-with-employer', theme: 'outcome', text: 'Would you share a practice interview with an employer to show what you can do?',
    options: opts(['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']) },
  { id: 'outcome-video-cv-helpful', theme: 'outcome', text: 'Would a short video introduction help you stand out?',
    options: opts(['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']) },
  { id: 'outcome-recommend-friend', theme: 'outcome', text: 'Would you recommend interview practice to a friend job hunting?', options: AGREE },
];

// ── Selection ──────────────────────────────────────────────────────────────────────────
// Prefer a question this browser hasn't answered; among unanswered ones pick at random so
// different candidates see different questions. If everything's been answered, re-ask the
// one answered longest ago (the backend overwrites, so a re-answer never double-counts).
const STORAGE_KEY = 'tic.survey.answered';

function readAnswered(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, number>; }
  catch { return {}; }
}

export function markSurveyAnswered(questionId: string): void {
  try {
    const all = readAnswered();
    all[questionId] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* storage blocked — worst case a question repeats */ }
}

export function pickSurveyQuestion(): SurveyQuestion {
  const answered = readAnswered();
  const fresh = SURVEY_QUESTIONS.filter(q => !(q.id in answered));
  if (fresh.length) return fresh[Math.floor(Math.random() * fresh.length)];
  return [...SURVEY_QUESTIONS].sort((a, b) => (answered[a.id] ?? 0) - (answered[b.id] ?? 0))[0];
}
