import type { InterviewQuestion } from '../../api/explainApi';
import type { Company } from '../../data/companyBank';

// ── Demo fallback questions ───────────────────────────────────────────────────
// Used by InterviewRoomPage whenever the real AI-generated session (sessionPrepareClient)
// hasn't resolved yet or failed outright — see InterviewRoomPage.tsx's `questions` derivation
// (`bgQuestions ?? buildDemoQuestions(...)`).
//
// questionCount here mirrors sessionPrepareClient's own totalQuestions logic in aiScoring.ts
// (same allowed values, same ~4:1 role:HR ratio, company-knowledge question always last) —
// this static bank only has 10 questions, so 15/20 just returns all 10 rather than fabricating
// more; the point is that 5 stops silently becoming 10, not that every count is fully covered.
export function buildDemoQuestions(company: Company, questionCount?: number): InterviewQuestion[] {
  const all: InterviewQuestion[] = [
    {
      questionId: 'q1',
      questionText: 'Walk me through the most complex challenge you have faced in this type of role. What did you do and what was the outcome?',
      modelAnswer: 'Cover: context, your specific actions, trade-offs made, and the measurable result.',
      questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['problem-solving'],
    },
    {
      questionId: 'q2',
      questionText: 'Tell me about a time you had to deliver under significant pressure. How did you manage it?',
      modelAnswer: 'Cover: the pressures involved, your approach, how you prioritised, and the outcome.',
      questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['delivery', 'resilience'],
    },
    {
      questionId: 'q3',
      questionText: 'Describe a situation where you had to work closely with a team to achieve something difficult. What role did you play?',
      modelAnswer: 'Cover: the team dynamic, your specific contribution, any conflict or challenge, and the result.',
      questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['teamwork', 'collaboration'],
    },
    {
      questionId: 'q4',
      questionText: 'Tell me about a time you disagreed with a decision made by your manager or leadership. How did you handle it?',
      modelAnswer: 'Cover: the nature of the disagreement, how you raised it professionally, whether you escalated or accepted the outcome, and what you learned.',
      questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['communication', 'professional judgement'],
    },
    {
      questionId: 'q5',
      questionText: 'Give me an example of when you had to adapt quickly to a significant change at work. What did you do?',
      modelAnswer: 'Cover: what changed, how you responded, what you prioritised, and how you helped others if relevant.',
      questionType: 'Competency', difficulty: 'Medium', source: 'Role', competencyTags: ['adaptability', 'change management'],
    },
    {
      questionId: 'q6',
      questionText: 'Describe a time you identified a problem that others had missed. How did you spot it and what did you do?',
      modelAnswer: 'Cover: what the problem was, how you identified it, the action you took, and the impact of catching it early.',
      questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['initiative', 'analytical thinking'],
    },
    {
      questionId: 'q7',
      questionText: 'Tell me about a time you had to manage competing priorities with limited resources. How did you decide what to focus on?',
      modelAnswer: 'Cover: the competing demands, your prioritisation framework, trade-offs you made, and the outcome.',
      questionType: 'Competency', difficulty: 'Hard', source: 'Role', competencyTags: ['prioritisation', 'decision-making'],
    },
    {
      questionId: 'q8',
      questionText: 'Describe an achievement you are genuinely proud of from your career so far. What made it significant?',
      modelAnswer: 'Cover: what you did, the scale or difficulty involved, your personal contribution, and why it matters to you.',
      questionType: 'Competency', difficulty: 'Easy', source: 'Role', competencyTags: ['achievement', 'motivation'],
    },
    {
      questionId: 'q9',
      questionText: 'Describe a time you delivered difficult feedback to someone. How did you approach it?',
      modelAnswer: 'Use STAR. Emphasise empathy, specificity, listening to the response, and the relationship outcome.',
      questionType: 'Behavioural', difficulty: 'Medium', source: 'HR', competencyTags: ['communication', 'stakeholder management'],
    },
    {
      questionId: 'q10',
      questionText: `What do you know about ${company.name} and why does this role specifically appeal to you?`,
      modelAnswer: `Show genuine research into ${company.name}. Connect their mission to your own motivations and experience.`,
      questionType: 'Behavioural', difficulty: 'Easy', source: 'HR', competencyTags: ['company knowledge', 'motivation'],
    },
  ];

  const total = questionCount && [5, 10, 15, 20].includes(questionCount) ? questionCount : 10;
  if (total >= all.length) return all;
  const hrCount = Math.max(1, Math.round(total / 5));
  const roleCount = total - hrCount;
  const roleQs = all.filter(q => q.source === 'Role');
  const hrQs = all.filter(q => q.source === 'HR');
  // hrQs.slice(-hrCount) keeps the company-knowledge closer (always last) regardless of hrCount
  return [...roleQs.slice(0, roleCount), ...hrQs.slice(-hrCount)];
}
