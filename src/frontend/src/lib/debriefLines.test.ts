import { describe, expect, it } from 'vitest';
import { debriefOpening, debriefStrength } from './debriefLines';

describe('debriefLines', () => {
  it('names the interviewers who were actually in the room', () => {
    const line = debriefOpening('Sam', 'Haruto', 'Luca');
    expect(line).toContain('Haruto and Luca');
    expect(line).not.toMatch(/Sarah|James/);
  });

  it('gives the strength note to the HR interviewer by name, without guessing a gender', () => {
    const line = debriefStrength('Haruto', 'clarity');
    expect(line).toBe('Haruto particularly noticed your clarity — it came across really well.');
    expect(line).not.toMatch(/\b(she|he|her|his)\b/i);
  });

  it('says nothing when there is no strongest area', () => {
    expect(debriefStrength('Haruto', null)).toBe('');
  });
});
