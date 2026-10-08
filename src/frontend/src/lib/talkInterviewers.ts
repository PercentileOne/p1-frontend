// The interviewers in My Talks (2026-10-08): Catherine (the encouraging one) and Malcolm (who knows the subject), Francis's choice for talks. They come from the same registry as the
// interviews (Admin > Interviewers), so their faces, rooms, voices, pace and names are whatever is set there. If one of them has been hidden or removed, the seat's default is used.

import { fetchInterviewers, type PublicInterviewer } from '../api/interviewersApi';
import { applyResolvedSeats, resolveSeatInterviewers, type InterviewerChoice, type ResolvedSeats } from './interviewerChoice';

export const TALK_CHOICE: InterviewerChoice = { hr: 'catherine', technical: 'malcom' };

/** Loads the registry and records the talk's interviewers where the voice requests and spoken scripts can see them (names, voices, pace). */
export async function loadTalkInterviewers(): Promise<{ list: PublicInterviewer[]; seats: ResolvedSeats }> {
  const list = await fetchInterviewers();
  const seats = applyResolvedSeats(list, TALK_CHOICE);
  return { list, seats };
}

export const talkSeatsFrom = (list: PublicInterviewer[]): ResolvedSeats => resolveSeatInterviewers(list, TALK_CHOICE);
