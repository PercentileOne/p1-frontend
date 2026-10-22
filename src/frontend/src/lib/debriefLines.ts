// The lines of Michelle's spoken debrief that name the two interviewers (2026-10-22). They used to say "Sarah and James" whoever the candidate had
// chosen at intake (a first customer noticed it): the names now come from the interviewers actually in the seats. Kept apart from the results page so a
// test can pin it.

/** "Hi Sam, it's Michelle here — I've just had a word with Haruto and Wayne, and they wanted me to share some feedback with you." */
export function debriefOpening(candidateName: string, hrName: string, technicalName: string): string {
  return `Hi ${candidateName}, it's Michelle here — I've just had a word with ${hrName} and ${technicalName}, and they wanted me to share some feedback with you.`;
}

/** The HR interviewer's note on the candidate's strongest area. Gender-neutral: the interviewers are whoever the candidate chose. */
export function debriefStrength(hrName: string, strongLabel: string | null): string {
  return strongLabel ? `${hrName} particularly noticed your ${strongLabel} — it came across really well.` : '';
}
