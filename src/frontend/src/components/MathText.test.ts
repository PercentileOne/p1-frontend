import { describe, it, expect } from 'vitest';
import { splitMath, hasMath } from './MathText';

describe('splitMath', () => {
  it('leaves plain text alone', () => {
    expect(hasMath('What does RBAC stand for?')).toBe(false);
    expect(splitMath('plain')).toEqual([{ kind: 'text', value: 'plain' }]);
  });

  it('splits a question with inline maths (the exact case Francis hit)', () => {
    const q = 'What is the value of \\(\\frac{3}{4}-\\frac{2}{5}\\)?';
    expect(hasMath(q)).toBe(true);
    expect(splitMath(q)).toEqual([
      { kind: 'text', value: 'What is the value of ' },
      { kind: 'math', value: '\\frac{3}{4}-\\frac{2}{5}', display: false },
      { kind: 'text', value: '?' },
    ]);
  });

  it('handles an option that is only a formula, and formulae at the very start', () => {
    expect(splitMath('\\(\\frac{7}{20}\\)')).toEqual([{ kind: 'math', value: '\\frac{7}{20}', display: false }]);
    // repeated calls must not skip a leading formula (global-regex lastIndex bug)
    hasMath('\\(x^2\\)'); hasMath('\\(x^2\\)');
    expect(splitMath('\\(x^2\\) plus \\(y\\)').map(s => s.kind)).toEqual(['math', 'text', 'math']);
  });

  it('treats \\[ ... \\] as display maths', () => {
    expect(splitMath('\\[x=1\\]')[0]).toEqual({ kind: 'math', value: 'x=1', display: true });
  });

  it('does not treat currency or dollars as maths', () => {
    expect(hasMath('The budget is $400M and $5')).toBe(false);
  });
});
