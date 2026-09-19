import { describe, it, expect } from 'vitest';
import { evaluateVerdict, verdictSentence, VERDICT_MARKS } from './interviewVerdict';

describe('evaluateVerdict', () => {
  it('passes at or above the pass mark, keeps on file between the marks, fails below', () => {
    expect(evaluateVerdict(70, 'Pro').verdict).toBe('pass');
    expect(evaluateVerdict(69, 'Pro').verdict).toBe('keep-on-file');
    expect(evaluateVerdict(55, 'Pro').verdict).toBe('keep-on-file');
    expect(evaluateVerdict(54, 'Pro').verdict).toBe('fail');
  });
  it('gets harder as the difficulty rises', () => {
    expect(evaluateVerdict(68, 'Beginner').verdict).toBe('pass');
    expect(evaluateVerdict(68, 'Standard').verdict).toBe('pass');
    expect(evaluateVerdict(68, 'Pro').verdict).toBe('keep-on-file');
    expect(evaluateVerdict(68, 'Expert').verdict).toBe('keep-on-file');
    expect(evaluateVerdict(58, 'Expert').verdict).toBe('fail');
  });
  it('judges an unknown or missing difficulty as Standard', () => {
    expect(evaluateVerdict(65).verdict).toBe('pass');
    expect(evaluateVerdict(64, 'Nonsense').verdict).toBe('keep-on-file');
  });
  it('keeps the marks in step with the server copy (InterviewVerdict.cs)', () => {
    expect(VERDICT_MARKS).toEqual({
      Beginner: { pass: 60, keep: 45 }, Standard: { pass: 65, keep: 50 }, Pro: { pass: 70, keep: 55 }, Expert: { pass: 75, keep: 60 },
    });
  });
});

describe('verdictSentence', () => {
  it('congratulates a pass and names the company mock', () => {
    const s = verdictSentence(evaluateVerdict(82, 'Expert'), 82, { employer: 'Google', mock: true, hasCv: true });
    expect(s).toContain('Congratulations');
    expect(s).toContain('mock Google interview');
  });
  it('says CV when there is one and name when there is not', () => {
    const r = evaluateVerdict(60, 'Pro');
    expect(verdictSentence(r, 60, { hasCv: true })).toContain('your CV');
    expect(verdictSentence(r, 60, { hasCv: false })).toContain('your name');
  });
  it('keeps a fail encouraging and factual', () => {
    const s = verdictSentence(evaluateVerdict(40, 'Standard'), 40, {});
    expect(s).toContain('Not this time');
    expect(s).toContain('65%');
  });
});
