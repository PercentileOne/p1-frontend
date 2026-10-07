import { describe, expect, it, beforeEach } from 'vitest';
import { applyNames, describePersona, personaGuidance, seatInterviewerId, seatName, setSeatInterviewers } from './seatInterviewers';

const traits = (over: Partial<{ depth: number; strictness: number; warmth: number; humour: number; pace: number }> = {}) => ({ depth: 3, strictness: 3, warmth: 3, humour: 3, pace: 3, ...over });

describe('seatInterviewers', () => {
  beforeEach(() => setSeatInterviewers({}));

  it('does nothing until interviewers are set (the original names stay)', () => {
    expect(applyNames('Thanks Amina. Wayne will take the next questions.')).toBe('Thanks Amina. Wayne will take the next questions.');
    expect(seatName('hr')).toBe('Amina');
    expect(seatName('technical')).toBe('Wayne');
    expect(seatInterviewerId('hr')).toBeUndefined();
    expect(personaGuidance()).toBe('');
  });

  it('swaps the original names for the chosen interviewers, including the full name', () => {
    setSeatInterviewers({
      hr: { id: 'catherine', name: 'Catherine', description: '', traits: traits() },
      technical: { id: 'malcom', name: 'Malcolm', description: '', traits: traits() },
    });
    expect(applyNames('Thanks Amina. Wayne Liang will take over; Wayne has the technical questions.')).toBe('Thanks Catherine. Malcolm will take over; Malcolm has the technical questions.');
    expect(seatName('hr')).toBe('Catherine');
    expect(seatInterviewerId('technical')).toBe('malcom');
  });

  it('does not touch words that only contain the names', () => {
    setSeatInterviewers({ hr: { id: 'c', name: 'Catherine', description: '', traits: traits() } });
    expect(applyNames('Aminata and Wayne Gretzky')).toBe('Aminata and Wayne Gretzky');
  });

  it('describes a strict, deep, serious interviewer differently from a warm, light one', () => {
    const strict = describePersona('Malcolm', traits({ depth: 5, strictness: 5, warmth: 1, humour: 1, pace: 4 }));
    const warm = describePersona('Catherine', traits({ depth: 3, strictness: 2, warmth: 5, humour: 4, pace: 2 }));
    expect(strict).toContain('goes deep');
    expect(strict).toContain('exacting');
    expect(strict).toContain('serious, with no jokes');
    expect(warm).toContain('warm, encouraging');
    expect(warm).toContain('light touches of humour');
    expect(warm).toContain('patient and unhurried');
    expect(strict).not.toContain('warm, encouraging');
  });

  it('builds the prompt block for the two interviewers and never mentions scoring changes', () => {
    setSeatInterviewers({
      hr: { id: 'catherine', name: 'Catherine', description: '', traits: traits({ warmth: 5 }) },
      technical: { id: 'malcom', name: 'Malcolm', description: '', traits: traits({ strictness: 5 }) },
    });
    const block = personaGuidance();
    expect(block).toContain('Catherine');
    expect(block).toContain('Malcolm');
    expect(block).toContain('never the fairness, accuracy or difficulty');
  });
});
