// Who is sitting in each of the interview room's three seats right now (2026-10-07): the candidate's choice at intake, or the defaults set in Admin > Interviewers.
// A small module-level store, because the answer is needed in places far from the room component (the voice requests, the AI prompts, the spoken fallback scripts).
// Until the room sets it, everything behaves exactly as before: the server picks each seat's default interviewer, and the old names Amina and Wayne are used.

export type Seat = 'hr' | 'technical' | 'michelle';

export interface SeatInterviewer {
  id: string;
  name: string;          // display name, e.g. "Haruto"
  description: string;
  traits: { depth: number; strictness: number; warmth: number; humour: number; pace: number };
}

const DEFAULT_NAMES: Record<Seat, string> = { hr: 'Amina', technical: 'Wayne', michelle: 'Michelle' };
let current: Partial<Record<Seat, SeatInterviewer>> = {};

export function setSeatInterviewers(next: Partial<Record<Seat, SeatInterviewer | null | undefined>>): void {
  current = {};
  (Object.keys(next) as Seat[]).forEach(seat => { const v = next[seat]; if (v) current[seat] = v; });
}

export function getSeatInterviewer(seat: Seat): SeatInterviewer | undefined { return current[seat]; }

/** The interviewer's id for this seat, sent with voice requests so the server uses their voice and pace; undefined = the seat's default. */
export function seatInterviewerId(seat: string): string | undefined {
  return seat === 'hr' || seat === 'technical' || seat === 'michelle' ? current[seat]?.id : undefined;
}

/** First name for a seat ("Haruto"); falls back to the original name. */
export function seatName(seat: Seat): string { return current[seat]?.name ?? DEFAULT_NAMES[seat]; }

/**
 * Swaps the original names in a piece of text (prompts, spoken fallback scripts, hand-off lines) for the interviewers actually in the seats.
 * "Wayne Liang" is treated as Wayne's full name, so it becomes the new name too. Does nothing when the original interviewers are still in the seats.
 */
export function applyNames(text: string): string {
  const hr = current.hr?.name, tech = current.technical?.name;
  let out = text;
  if (tech) out = out.replace(/\bWayne Liang\b/g, tech).replace(/\bWayne\b/g, tech);
  if (hr) out = out.replace(/\bAmina\b/g, hr);
  return out;
}
