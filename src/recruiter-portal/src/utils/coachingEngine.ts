import type { ScoreResponse, InterviewQuestion } from '../api/explainApi';
import type { CVContext, JobSpecContext } from './contextBuilder';

export interface CoachingMessage {
  lines: string[];   // spoken sequentially
  fullText: string;  // joined for display
  tone: 'strong' | 'encourage' | 'delivery' | 'relevance';
}

export function generateCoachingMessage(
  score: ScoreResponse,
  _question: InterviewQuestion,
  answerText: string,
  cvCtx?: CVContext,
  jobCtx?: JobSpecContext,
): CoachingMessage {
  const lines: string[] = [];
  let tone: CoachingMessage['tone'] = 'strong';

  const overall = score.overallScore;
  const confidence = score.confidence ?? 0.55;
  const relevance = score.relevance ?? 0.55;
  const depth = score.depth ?? 0.55;

  const company = cvCtx?.companies?.[0] ?? 'your previous role';

  // Trim achievement to a short readable phrase — strip bullet chars, cap at 60 chars
  const rawAch = cvCtx?.achievements?.[0] ?? '';
  const achievement = rawAch
    ? rawAch.replace(/^[-•*]\s*/, '').split(/[.,]/)[0].trim().slice(0, 60)
    : 'that example';

  // Distil the job spec into a short role label, not raw sentence text
  const jobTitle = jobCtx?.title
    ? jobCtx.title.replace(/^(we are|we're|seeking|looking for)\s+/i, '').trim().slice(0, 50)
    : 'this role';
  const topSkill = jobCtx?.requiredSkills?.[0] ?? jobCtx?.techStack?.[0] ?? null;

  if (overall >= 0.70) {
    // Strong answer
    tone = 'strong';
    lines.push(`That was a really strong answer — especially the part about ${achievement}.`);
    if (depth < 0.65) {
      lines.push(`Next time, you can make it even sharper by adding a measurable outcome — a number, a percentage, or a named result.`);
    } else {
      lines.push(`The depth and specificity you showed there is exactly what interviewers are looking for.`);
    }
  } else if (confidence < 0.45) {
    // Weak delivery
    tone = 'delivery';
    lines.push(`Your content was actually solid — but your delivery felt a little hesitant.`);
    lines.push(`Try speaking a little slower, and put more weight on your key points. Confidence is contagious — own what you know.`);
  } else if (relevance < 0.45) {
    // Off-topic
    tone = 'relevance';
    lines.push(`This one didn't quite land as well as it could.`);
    const answerLower = answerText.toLowerCase();
    const mentionedCompany = company !== 'your previous role' && answerLower.includes(company.toLowerCase());
    if (topSkill && mentionedCompany) {
      lines.push(`You touched on ${company}, but the role is looking for strong ${topSkill} experience. Try making that bridge explicit — show how your work there maps to what they need.`);
    } else if (topSkill) {
      lines.push(`The role is looking for strong ${topSkill} experience. In your next answer, try connecting your background directly to that requirement.`);
    } else {
      lines.push(`Try connecting your experience more directly to the ${jobTitle} requirements — show the interviewer exactly how what you've done maps to what they need.`);
    }
  } else {
    // Moderate — needs more depth
    tone = 'encourage';
    lines.push(`Good start — you covered the basics, but there's room to go deeper.`);
    const answerLower = answerText.toLowerCase();
    const achPhrase = achievement !== 'that example'
      ? achievement.toLowerCase().split(' ').slice(0, 4).join(' ')
      : null;
    const mentionedAch = achPhrase && answerLower.includes(achPhrase);
    if (mentionedAch) {
      lines.push(`You mentioned ${achievement.slice(0, 40)} — but didn't tell us the impact. What changed because of your actions? That's the part that sticks with interviewers.`);
    } else {
      lines.push(`Try adding a concrete outcome to your answer — a number, a percentage, or a named result. That's the detail interviewers remember.`);
    }
  }

  // Closing line — always the same warm sign-off
  lines.push(`Okay… back to your interview. You're doing great.`);

  return { lines, fullText: lines.join(' '), tone };
}
