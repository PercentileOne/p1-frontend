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

  let lead: string;
  if (counted.length === 0) lead = 'There is nothing to tick on this day, only notes to write.';
  else if (!isToday) lead = 'Looking back on this day:';
  else if (complete) lead = 'You are all done. Well done!';
  else if (ess.length > 0 && essLeft.length === 0) lead = 'Your essentials are done.';
  else if (ratio === 0) lead = 'You have not started yet.';
  else if (ratio < 0.5) lead = 'You are underway.';
  else lead = 'You have completed most of it.';

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
