import { describe, it, expect } from 'vitest';
import { parseRoutineList } from './routineListParser';

// A made-up list in the same shape as a real Evernote export (emoji headings, plain declarations, bullets, readings glued to items, if-then lines).
const SAMPLE = `First:
Every good thing will come true today.
Great things are on their way to me right now.
Thoughts to Note from yesterday
A quiet weekend. Feeling rested.
🎯 Gratitude 1

* Thank you for my opportunities
* Thank you for my books

🎯Morning Routine
Win the first 40 Minutes

* 10 Minutes Silence (Be Present, Be Patient)
* Make Bed and Tidy my room
* Read at least one chapter - or do deep work on [Percentile.One](https://Percentile.One)
* Check Blood Pressure 150/90/70 -1 am, 1 tablet
* Check Sugar -9.9  - took 10 units
* Make Bed and Tidy my room
*
🎯 Plan for Today Including Training & Exercise
What are the top things you want to achieve today?

* Go to the gym or walk
🎯 Shopping List
What shopping do we need for today:

* Apples
* Lemons

🎯 IF DAY THEN DO

* If Dialysis day, then check date to send blood
* if last day of month, then plan my month
* If Sunday then do weekly self reflection
* if Sunday, go over my LinkedIn Re-posts

💡 Ideas, Inspiration & Things to Remember

* Remember: the best predictor is what you do every day

🎯Evening Routine

* Check Blood Pressure 160/85/68
* Early to Bed (without media)
`;

describe('parseRoutineList', () => {
  const r = parseRoutineList(SAMPLE);
  const by = (text: string) => r.items.find(i => i.text === text);

  it('turns plain declarations under "First:" into one read-aloud passage, stopping at the next subheading', () => {
    const first = r.items.find(i => i.kind === 'read')!;
    expect(first.section).toBe('First');
    expect(first.text).toBe('Every good thing will come true today.\nGreat things are on their way to me right now.');
    expect(first.priority).toBe('essential');
    expect(r.items.filter(i => i.kind === 'read')).toHaveLength(1);
  });

  it('makes bullets under a heading into tick items in that section, once each', () => {
    expect(r.sections).toContain('Morning Routine');
    const morning = r.items.filter(i => i.section === 'Morning Routine').map(i => i.text);
    expect(morning).toContain('Make Bed and Tidy my room');
    expect(morning.filter(t => t === 'Make Bed and Tidy my room')).toHaveLength(1);   // duplicate dropped
    expect(morning).not.toContain('');                                                  // empty bullet dropped
  });

  it('keeps a markdown link\'s label, not its address', () => {
    expect(r.items.some(i => i.text === 'Read at least one chapter - or do deep work on Percentile.One')).toBe(true);
  });

  it('turns readings into number items and does not copy the pasted figures', () => {
    const bp = r.items.filter(i => i.text === 'Check Blood Pressure');
    expect(bp).toHaveLength(2);                                     // morning and evening, in their own sections
    expect(bp.every(i => i.kind === 'number')).toBe(true);
    expect(by('Check Sugar')?.kind).toBe('number');
    expect(r.items.some(i => /150|9\.9|160/.test(i.text))).toBe(false);
  });

  it('turns write-in headings into one note each and leaves out what was written under them', () => {
    const notes = r.items.filter(i => i.kind === 'text').map(i => i.text);
    expect(notes).toEqual(expect.arrayContaining(['Gratitude 1', 'Shopping List', 'Thoughts to Note from yesterday']));
    expect(r.items.some(i => /Apples|Thank you|quiet weekend/i.test(i.text))).toBe(false);
    expect(r.leftOut).toBeGreaterThan(0);
    expect(r.sections).toContain('Check in');
  });

  it('does not treat the prompt line under a heading as a new heading', () => {
    expect(r.sections).not.toContain('What shopping do we need for today');
  });

  it('leaves ideas unticked', () => {
    expect(r.items.find(i => /Ideas/.test(i.text))?.include).toBe(false);
  });

  it('turns if-then lines into rule items under "Plan for today"', () => {
    const sundayReflection = by('Weekly self reflection')!;
    expect(sundayReflection.weekdays).toEqual([0]);
    expect(sundayReflection.section).toMatch(/^Plan for today/i);
    // with no "Plan for today" section they land with the tick items, never in the read-aloud passage's section
    const noPlan = parseRoutineList(['First:', 'Words to read.', '', 'Morning:', '* Pray', '* If Sunday, plan the week'].join('\n'));
    expect(noPlan.items.find(i => i.text === 'Plan the week')!.section).toBe('Morning');
    expect(by('Go over my LinkedIn Re-posts')?.weekdays).toEqual([0]);
    const month = by('Plan my month')!;
    expect(month.lastDay).toBe(true);
    expect(month.weekdays).toEqual([]);
  });

  it('flags an if-then it cannot place on the calendar so the person has to choose', () => {
    const dialysis = by('Check date to send blood')!;
    expect(dialysis.needsDays).toBe(true);
    expect(dialysis.label).toBe('Dialysis day');
    expect(by('Plan my month')!.needsDays).toBe(false);
  });

  it('puts a bare bullet list under one section when there are no headings at all', () => {
    const plain = parseRoutineList('* Stretch\n* Walk\n* Read');
    expect(plain.sections).toEqual(['My routine']);
    expect(plain.items.map(i => i.text)).toEqual(['Stretch', 'Walk', 'Read']);
  });

  it('copes with empty input', () => {
    expect(parseRoutineList('   \n\n')).toEqual({ sections: [], items: [], leftOut: 0 });
  });

  it('reads a checklist pasted with no markers as items, not as a passage', () => {
    const text = ['Morning Routine', 'Win the first 40 Minutes', 'Charge everything that needs charging', 'Clean all equipment', 'Make bed and tidy my room', 'Open the window'].join('\n');
    const r2 = parseRoutineList(text);
    expect(r2.items.every(i => i.kind === 'check')).toBe(true);
    expect(r2.items.map(i => i.text)).toContain('Clean all equipment');
    expect(r2.sections).toEqual(['Morning Routine']);
  });

  it('still treats declarations under "First:" as a passage to read aloud', () => {
    const r3 = parseRoutineList(['First:', 'Every good thing will come true today.', 'Great things are on their way.', 'May joy walk beside me.'].join('\n'));
    expect(r3.items).toHaveLength(1);
    expect(r3.items[0].kind).toBe('read');
  });

  it('understands checkbox characters and markdown tasks as list markers', () => {
    const r4 = parseRoutineList(['Evening', '\u2610 Check calendar', '[ ] Prepare clothes', '- [x] Night vitamins', '\u2611 Lights out'].join('\n'));
    expect(r4.items.map(i => i.text)).toEqual(['Check calendar', 'Prepare clothes', 'Night vitamins', 'Lights out']);
  });
  it('reads a short plain title above a list as a heading when nothing in the paste is marked as one', () => {
    const r5 = parseRoutineList(['Morning', 'Pray', 'Make the bed', 'Stretch', '', 'Evening', 'Check calendar', 'Prepare clothes'].join('\n'));
    expect(r5.sections).toEqual(['Morning', 'Evening']);
    expect(r5.items.filter(i => i.section === 'Evening').map(i => i.text)).toEqual(['Check calendar', 'Prepare clothes']);
  });

  it('does not turn a lone short item into a heading', () => {
    const r6 = parseRoutineList(['Pray', 'Stretch'].join('\n'));
    expect(r6.sections).toEqual(['My routine']);
    expect(r6.items).toHaveLength(2);
  });
});
