import type { DayItem, RoutineDay } from '../api/routinesApi';

// "Where am I?" for My Routines (Francis, 2026-10-13): a plain-English read of the open day, worked out on the device from what is ticked.
// Nothing is sent anywhere, so health items and readings never leave the browser to produce it.

export interface StatusItem { id: string; text: string }
export interface StatusBlock { label: string; items: StatusItem[]; more: number }
export interface RoutineStatus {
  headline: string;
  /** What is still to do, most important first. Empty when everything is done. */
  blocks: StatusBlock[];
  /** Sections whose time has not come yet, e.g. "Evening: 4 to do". */
  ahead: string[];
  /** Everything that counts is done. */
  complete: boolean;
}

const SHOWN = 5;
type Period = 0 | 1 | 2;   // morning, afternoon, evening

/** Which part of the day a section is for, judged from its name. Null when it could be any time. */
export function sectionPeriod(name: string): Period | null {
  if (/morning|\bfirst\b|wake|breakfast|sunrise/i.test(name)) return 0;
  if (/afternoon|lunch|midday|noon/i.test(name)) return 1;
  if (/evening|night|bed\b|bedtime|wind ?down|tonight/i.test(name)) return 2;
  return null;
}
export function currentPeriod(now: Date): Period {
  const h = now.getHours();
  return h < 12 ? 0 : h < 17 ? 1 : 2;
}

const PERIOD_WORD = ['morning', 'afternoon', 'evening'];

/** A passage to read aloud is named by its section, not by the whole passage. */
function shown(i: DayItem): StatusItem {
  return { id: i.id, text: i.kind === 'read' ? `Read aloud: ${i.section}` : i.text };
}

function cut(list: StatusItem[], n = SHOWN): { items: StatusItem[]; more: number } {
  return { items: list.slice(0, n), more: Math.max(0, list.length - n) };
}

function leadFor(p: { total: number; isToday: boolean; complete: boolean; essTotal: number; essLeft: number; ratio: number }): string {
  if (p.total === 0) return 'There is nothing to tick on this day, only notes to write.';
  if (!p.isToday) return 'Looking back on this day:';
  if (p.complete) return 'You are all done. Well done!';
  if (p.essTotal > 0 && p.essLeft === 0) return 'Your essentials are done.';
  if (p.ratio === 0) return 'You have not started yet.';
  if (p.ratio < 0.5) return 'You are underway.';
  return 'You have completed most of it.';
}

export function routineStatus(day: RoutineDay, now: Date, isToday: boolean): RoutineStatus {
  const done = (i: DayItem) => !!day.checked[i.id] || (i.kind === 'number' && !!day.values[i.id]?.trim());
  const counted = day.items.filter(i => i.kind !== 'text');
  const notes = day.items.filter(i => i.kind === 'text');

  if (counted.length === 0 && notes.length === 0) {
    return { headline: 'There is nothing on this day yet. Add an item, or paste your list.', blocks: [], ahead: [], complete: true };
  }

  const ess = counted.filter(i => i.essential);
  const essLeft = ess.filter(i => !done(i));
  const doneAll = counted.filter(done).length;
  const left = counted.filter(i => !done(i));
  const unwritten = notes.filter(i => !day.values[i.id]?.trim());

  const ratio = ess.length > 0 ? (ess.length - essLeft.length) / ess.length : counted.length > 0 ? doneAll / counted.length : 1;
  const complete = left.length === 0;
  const counts = ess.length > 0
    ? `${ess.length - essLeft.length} of ${ess.length} essentials done, ${doneAll} of ${counted.length} in all.`
    : `${doneAll} of ${counted.length} done.`;

  const lead = leadFor({ total: counted.length, isToday, complete, essTotal: ess.length, essLeft: essLeft.length, ratio });

  const headline = counted.length > 0 ? `${lead} ${counts}` : lead;

  const blocks: StatusBlock[] = [];
  const ahead: string[] = [];
  const listed = new Set<string>();

  if (essLeft.length > 0) {
    blocks.push({ label: 'Essentials still to do', ...cut(essLeft.map(shown)) });
    essLeft.forEach(i => listed.add(i.id));
  }

  const nowPeriod = isToday ? currentPeriod(now) : null;
  const sectionsLeft = day.sections
    .map(name => ({ name, period: sectionPeriod(name), all: counted.filter(i => i.section === name) }))
    .filter(s => s.all.length > 0);

  // Right now first, then earlier parts of the day that were missed, then anything with no time of day; later parts are only counted.
  const rank = (p: Period | null) => (nowPeriod === null ? 1 : p === null ? 1 : p === nowPeriod ? 0 : p < nowPeriod ? 2 : 3);
  const ordered = [...sectionsLeft].sort((a, b) => rank(a.period) - rank(b.period));

  for (const s of ordered) {
    const sLeft = s.all.filter(i => !done(i) && !listed.has(i.id));
    const sDone = s.all.filter(done).length;
    if (s.all.every(done)) continue;
    const r = rank(s.period);
    if (r === 3) {
      ahead.push(`${s.name}: ${s.all.length - sDone} to do`);
      continue;
    }
    if (sLeft.length === 0) continue;
    const label = r === 0 && s.period !== null
      ? `Right now, your ${PERIOD_WORD[s.period]}: ${s.name} (${sDone} of ${s.all.length} done)`
      : r === 2
        ? `Earlier, not done: ${s.name} (${sDone} of ${s.all.length} done)`
        : `${s.name} (${sDone} of ${s.all.length} done)`;
    blocks.push({ label, ...cut(sLeft.map(shown)) });
  }

  if (unwritten.length > 0 && isToday) {
    blocks.push({ label: 'Not written yet', ...cut(unwritten.map(shown)) });
  }

  return { headline, blocks, ahead, complete: complete && unwritten.length === 0 };
}

/**
 * What "Listen" says. DELIBERATELY GENERIC: counts and parts of the day only, never an item or section name, because speech goes through the text-to-speech provider
 * and a person's routine can name medication, readings or appointments. (Francis, 2026-10-13: "for now, speak just generic information".)
 */
export function spokenStatus(day: RoutineDay, now: Date, isToday: boolean): string {
  const done = (i: DayItem) => !!day.checked[i.id] || (i.kind === 'number' && !!day.values[i.id]?.trim());
  const counted = day.items.filter(i => i.kind !== 'text');
  const notes = day.items.filter(i => i.kind === 'text');
  if (counted.length === 0 && notes.length === 0) return 'There is nothing on your routine for this day yet.';
  if (counted.length === 0) return 'There is nothing to tick on this day, only notes to write.';

  const ess = counted.filter(i => i.essential);
  const essDone = ess.filter(done).length;
  const doneAll = counted.filter(done).length;
  const left = counted.filter(i => !done(i));
  const things = (n: number) => `${n} ${n === 1 ? 'thing' : 'things'}`;

  const countLine = ess.length > 0
    ? `${isToday ? 'You have done' : 'You finished'} ${essDone} of your ${ess.length} essentials, and ${doneAll} of ${counted.length} things in all.`
    : `${isToday ? 'You have done' : 'You finished'} ${doneAll} of ${counted.length} things.`;

  if (!isToday) return `Looking back on this day. ${countLine}`;

  const ratio = ess.length > 0 ? essDone / ess.length : doneAll / counted.length;
  const lead = leadFor({ total: counted.length, isToday, complete: left.length === 0, essTotal: ess.length, essLeft: ess.length - essDone, ratio });
  const out = [lead.replace('!', '.'), countLine];

  const nowP = currentPeriod(now);
  const inPeriod = (pred: (p: Period) => boolean) => left.filter(i => { const p = sectionPeriod(i.section); return p !== null && pred(p); });
  const nowLeft = inPeriod(p => p === nowP).length;
  const earlierLeft = inPeriod(p => p < nowP).length;
  const aheadWords = [...new Set(inPeriod(p => p > nowP).map(i => PERIOD_WORD[sectionPeriod(i.section) as Period]))];

  if (nowLeft > 0) out.push(`Right now it is your ${PERIOD_WORD[nowP]} routine, and you have ${things(nowLeft)} left in it.`);
  if (earlierLeft > 0) out.push(`You also have ${things(earlierLeft)} left from earlier in the day.`);
  if (aheadWords.length > 0) out.push(`Your ${aheadWords.join(' and ')} routine is still to come.`);
  const unwritten = notes.filter(i => !day.values[i.id]?.trim()).length;
  if (unwritten > 0) out.push(`You have ${unwritten} ${unwritten === 1 ? 'note' : 'notes'} still to write.`);
  return out.join(' ');
}

/**
 * Whose voice reads "Where am I?" aloud (Francis, 2026-10-14): Catherine, the warm and encouraging HR interviewer, through the day, and Malcolm, direct and composed,
 * from five in the evening. The seat has to be the interviewer's own seat (the voice service only accepts an id that belongs to the seat asked for).
 * Malcolm's registry id is spelled "malcom", with one "l".
 */
export function coachVoiceFor(now: Date): { seat: 'hr' | 'technical'; interviewerId: string; name: string } {
  return currentPeriod(now) === 2
    ? { seat: 'technical', interviewerId: 'malcom', name: 'Malcolm' }
    : { seat: 'hr', interviewerId: 'catherine', name: 'Catherine' };
}
