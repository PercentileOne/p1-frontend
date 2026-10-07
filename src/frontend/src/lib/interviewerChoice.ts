// The candidate's choice of interviewers (2026-10-07), remembered between interviews. It is read when the interview room opens, because the room prepares the whole
// interview (Michelle's briefing, the questions, the intros) straight away, so it has to know who the interviewers are before the candidate presses Begin.
// An interviewer who has since been hidden or removed is simply ignored (the seat's default is used), so a stale value can never break an interview.

import type { PublicInterviewer } from '../api/interviewersApi';
import { setSeatInterviewers, type SeatInterviewer } from './seatInterviewers';

export interface InterviewerChoice { hr?: string; technical?: string }

export interface ResolvedSeats { hr?: PublicInterviewer; technical?: PublicInterviewer; michelle?: PublicInterviewer }

/** Who sits in each seat: the candidate's choice if that interviewer is still active and fits the seat, otherwise the seat's default interviewer. */
export function resolveSeatInterviewers(list: PublicInterviewer[], choice: InterviewerChoice): ResolvedSeats {
  const pick = (seat: 'hr' | 'technical') => list.find(i => i.id === choice[seat] && i.role === seat) ?? list.find(i => i.defaultFor === seat);
  return { hr: pick('hr'), technical: pick('technical'), michelle: list.find(i => i.defaultFor === 'briefing') };
}

const toSeat = (i: PublicInterviewer | undefined): SeatInterviewer | undefined =>
  i ? { id: i.id, name: i.displayName, description: i.description, traits: i.traits } : undefined;

/** Resolves the seats and records them where the voice requests, AI prompts and spoken scripts can see them. */
export function applyResolvedSeats(list: PublicInterviewer[], choice: InterviewerChoice): ResolvedSeats {
  const seats = resolveSeatInterviewers(list, choice);
  setSeatInterviewers({ hr: toSeat(seats.hr), technical: toSeat(seats.technical), michelle: toSeat(seats.michelle) });
  return seats;
}

const KEY = 'tic.interviewers.v1';

export function readInterviewerChoice(): InterviewerChoice {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object') return {};
    const o = v as Record<string, unknown>;
    const ok = (x: unknown): x is string => typeof x === 'string' && /^[a-z0-9][a-z0-9-]{1,31}$/.test(x);
    return { hr: ok(o.hr) ? o.hr : undefined, technical: ok(o.technical) ? o.technical : undefined };
  } catch { return {}; }
}

export function writeInterviewerChoice(choice: InterviewerChoice): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(choice)); } catch { /* storage blocked: the choice just isn't remembered */ }
}
