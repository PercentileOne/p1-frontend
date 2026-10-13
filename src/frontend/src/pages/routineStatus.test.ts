import { describe, it, expect } from 'vitest';
import { routineStatus, sectionPeriod } from './routineStatus';
import type { DayItem, RoutineDay } from '../api/routinesApi';

const item = (id: string, text: string, section: string, over: Partial<DayItem> = {}): DayItem =>
  ({ id, text, section, kind: 'check', essential: false, source: 'template', ...over });

const at = (h: number) => new Date(2026, 9, 13, h, 0, 0);

function makeDay(checkedIds: string[] = [], values: Record<string, string> = {}): RoutineDay {
  const checked: Record<string, boolean> = {};
  checkedIds.forEach(id => { checked[id] = true; });
  return {
    id: 'day:2026-10-13', date: '2026-10-13', sections: ['Morning', 'Evening', 'Check in'],
    items: [
      item('m1', 'Quiet time', 'Morning', { essential: true }),
      item('m2', 'Make the bed', 'Morning', { essential: true }),
      item('m3', 'Read something', 'Morning'),
      item('m4', 'Stretch', 'Morning'),
      item('e1', 'Check tomorrow\'s calendar', 'Evening', { essential: true }),
      item('e2', 'Prepare clothes', 'Evening'),
      item('n1', 'Evening gratitude', 'Evening', { kind: 'text' }),
    ],
    checked, values,
  };
}

describe('sectionPeriod', () => {
  it('reads the time of day from a section name', () => {
    expect(sectionPeriod('Morning Routine')).toBe(0);
    expect(sectionPeriod('First')).toBe(0);
    expect(sectionPeriod('Afternoon')).toBe(1);
    expect(sectionPeriod('Evening Routine')).toBe(2);
    expect(sectionPeriod('Plan for today')).toBeNull();
  });
});

describe('routineStatus', () => {
  it('says not started and lists the essentials first', () => {
    const s = routineStatus(makeDay(), at(8), true);
    expect(s.headline).toContain('You have not started yet.');
    expect(s.headline).toContain('0 of 3 essentials done, 0 of 6 in all.');
    expect(s.blocks[0].label).toBe('Essentials still to do');
    expect(s.blocks[0].items.map(i => i.text)).toEqual(['Quiet time', 'Make the bed', 'Check tomorrow\'s calendar']);
  });

  it('in the morning, puts the morning section first and only counts the evening as ahead', () => {
    const s = routineStatus(makeDay(['m1', 'm2']), at(9), true);
    const morning = s.blocks.find(b => b.label.startsWith('Right now, your morning'))!;
    expect(morning.label).toContain('2 of 4 done');
    expect(morning.items.map(i => i.text)).toEqual(['Read something', 'Stretch']);
    expect(s.ahead).toEqual(['Evening: 2 to do']);
    expect(s.blocks.some(b => b.items.some(i => i.id === 'e2'))).toBe(false);   // evening items are not listed in the morning
  });

  it('says most is done once more than half the essentials are', () => {
    const s = routineStatus(makeDay(['m1', 'm2']), at(9), true);
    expect(s.headline.startsWith('You have completed most of it.')).toBe(true);
  });

  it('in the evening, lists what was missed from the morning and what is on now', () => {
    const s = routineStatus(makeDay(['m1', 'm2', 'm3']), at(19), true);
    const labels = s.blocks.map(b => b.label);
    expect(labels[0]).toBe('Essentials still to do');
    expect(labels.some(l => l.startsWith('Right now, your evening: Evening'))).toBe(true);
    expect(labels.some(l => l.startsWith('Earlier, not done: Morning'))).toBe(true);
    expect(s.ahead).toEqual([]);
  });

  it('lists unwritten notes, and stops listing one once it has text', () => {
    const before = routineStatus(makeDay(), at(20), true).blocks.find(b => b.label === 'Not written yet')!;
    expect(before.items.map(i => i.text)).toEqual(['Evening gratitude']);
    const after = routineStatus(makeDay([], { n1: 'thankful for today' }), at(20), true);
    expect(after.blocks.some(b => b.label === 'Not written yet')).toBe(false);
  });

  it('counts a number item as done once it has a value', () => {
    const day = makeDay();
    day.items.push(item('bp', 'Check Blood Pressure', 'Morning', { kind: 'number', essential: true }));
    const s = routineStatus({ ...day, values: { bp: '130/80' } }, at(8), true);
    expect(s.headline).toContain('1 of 4 essentials done');
  });

  it('celebrates when everything is done', () => {
    const day = makeDay(['m1', 'm2', 'm3', 'm4', 'e1', 'e2'], { n1: 'grateful' });
    const s = routineStatus(day, at(21), true);
    expect(s.complete).toBe(true);
    expect(s.headline).toContain('You are all done. Well done!');
    expect(s.blocks).toEqual([]);
  });

  it('names a read-aloud passage by its section rather than quoting it', () => {
    const day = makeDay();
    day.sections = ['First', ...day.sections];
    day.items.push(item('r', 'Every good thing will come true today. Great things are on their way to me.', 'First', { kind: 'read', essential: true }));
    const s = routineStatus(day, at(8), true);
    expect(s.blocks[0].items.map(i => i.text)).toContain('Read aloud: First');
    expect(JSON.stringify(s)).not.toContain('Every good thing');
  });

  it('shortens long lists and says how many more', () => {
    const day = makeDay();
    for (let n = 0; n < 8; n++) day.items.push(item('x' + n, 'Extra ' + n, 'Morning'));
    const s = routineStatus(day, at(8), true);
    const morning = s.blocks.find(b => b.label.startsWith('Right now'))!;
    expect(morning.items).toHaveLength(5);
    expect(morning.more).toBe(5);   // m3, m4 and eight extras are 10 left; five are shown
  });

  it('looks back plainly on a past day', () => {
    const s = routineStatus(makeDay(['m1']), at(9), false);
    expect(s.headline.startsWith('Looking back on this day:')).toBe(true);
    expect(s.ahead).toEqual([]);
    expect(s.blocks.some(b => b.label === 'Not written yet')).toBe(false);
  });

  it('handles an empty day and a day of only notes', () => {
    expect(routineStatus({ ...makeDay(), items: [] }, at(8), true).headline).toContain('nothing on this day yet');
    const notesOnly = { ...makeDay(), items: [item('n', 'Gratitude', 'Check in', { kind: 'text' })] };
    expect(routineStatus(notesOnly, at(8), true).headline).toContain('only notes to write');
  });
});
