// Pass / Keep on file / Fail for a finished interview (Francis, 2026-09-19). The mark scales with the difficulty
// the candidate chose — a company-specific interview defaults its difficulty to that company's bar, so a Google-style
// interview is harder to pass than a Beginner practice run. To change the marks, change them HERE and in
// src/backend/Explain.Api/Features/Interviews/InterviewVerdict.cs (the server copy is what a certificate is checked
// against) — the test below pins the two together.

export type Verdict = 'pass' | 'keep-on-file' | 'fail';

export const VERDICT_MARKS: Record<string, { pass: number; keep: number }> = {
  Beginner: { pass: 60, keep: 45 },
  Standard: { pass: 65, keep: 50 },
  Pro: { pass: 70, keep: 55 },
  Expert: { pass: 75, keep: 60 },
};

export interface VerdictResult {
  verdict: Verdict;
  passMark: number;
  keepMark: number;
}

export function evaluateVerdict(scorePct: number, difficulty?: string): VerdictResult {
  const m = (difficulty && VERDICT_MARKS[difficulty]) || VERDICT_MARKS.Standard;
  const verdict: Verdict = scorePct >= m.pass ? 'pass' : scorePct >= m.keep ? 'keep-on-file' : 'fail';
  return { verdict, passMark: m.pass, keepMark: m.keep };
}

// The one-sentence outcome shown on the results page and spoken by Michelle. `employer` is the company the candidate
// chose (a company-specific mock) — without one the wording stays generic. `hasCv` decides "CV" vs "name" on file.
export function verdictSentence(r: VerdictResult, scorePct: number, opts: { employer?: string; mock?: boolean; hasCv?: boolean }): string {
  const { employer, mock, hasCv } = opts;
  const thing = employer && mock ? `your mock ${employer} interview` : employer ? `your ${employer} interview` : 'this interview';
  const onFile = hasCv ? 'your CV' : 'your name';
  switch (r.verdict) {
    case 'pass':
      return `Congratulations — you passed ${thing}! You scored ${scorePct}%, above the ${r.passMark}% pass mark.`;
    case 'keep-on-file':
      return `You scored ${scorePct}%, just short of the ${r.passMark}% pass mark — so the outcome is Keep on File: ${employer && mock ? `in a real process, ${employer} would keep` : 'an employer would keep'} ${onFile} on file for future roles.`;
    default:
      return `You scored ${scorePct}% — below the ${r.keepMark}% needed to be kept on file, and the ${r.passMark}% pass mark. Not this time, but this is exactly what practice is for.`;
  }
}
