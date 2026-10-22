// Fetch the interview room's three faces while the candidate is still filling in the intake screen (2026-10-22). A face's 3D model is about 6.5 MB and is downloaded the
// first time that face is used on a computer; our first customer pressed Start on a first visit, the three downloads took longer than the 25 second limit and the room fell
// back to voice only (a second try worked because the browser had kept the models). Warming earlier means the press finds them already there. Computers only, since a phone
// only plays the voice; a failure changes nothing (the room loads the face as before). The public "hello" token path is used so this works whatever the paywall is doing.
import { fetchInterviewers, type PublicInterviewer } from '../api/interviewersApi';
import { preloadSpatiusAvatar, HELLO_TOKEN_PATH } from '../hooks/useSpatiusAvatarSession';
import { deviceCanUseSpatiusInRoom } from '../hooks/useSpatiusSeat';
import { readInterviewerChoice, type InterviewerChoice } from './interviewerChoice';

/** The avatar ids the room will draw: the chosen (or default) HR and technical interviewers, and the briefing one. Without repeats; empty entries dropped. */
export function roomAvatarIds(list: PublicInterviewer[], choice: InterviewerChoice): string[] {
  const pick = (seat: 'hr' | 'technical') =>
    list.find(i => i.id === choice[seat] && i.role === seat) ?? list.find(i => i.defaultFor === seat) ?? list.find(i => i.role === seat);
  const briefing = list.find(i => i.defaultFor === 'briefing') ?? list.find(i => i.role === 'briefing');
  const ids = [pick('hr')?.avatarId, pick('technical')?.avatarId, briefing?.avatarId].filter((x): x is string => !!x);
  return [...new Set(ids)];
}

/** Starts fetching the room's faces one after another (so they do not fight over a slow connection). Safe to call repeatedly: a face already fetched is skipped. */
export async function warmInterviewRoomFaces(choice: InterviewerChoice = readInterviewerChoice(), list?: PublicInterviewer[]): Promise<void> {
  if (!deviceCanUseSpatiusInRoom()) return;
  const roster = list ?? await fetchInterviewers();
  for (const id of roomAvatarIds(roster, choice)) await preloadSpatiusAvatar(id, '', HELLO_TOKEN_PATH);
}
