import { describe, it, expect } from 'vitest';
import { daysUntil, periodOf, shiftPeriod } from './planningApi';

describe('periodOf', () => {
  it('a week runs Monday to Sunday', () => {
    expect(periodOf('weekly', '2026-10-18')).toEqual({ start: '2026-10-12', end: '2026-10-18' });   // a Sunday
    expect(periodOf('weekly', '2026-10-12')).toEqual({ start: '2026-10-12', end: '2026-10-18' });   // the Monday
    expect(periodOf('weekly', '2026-10-14')).toEqual({ start: '2026-10-12', end: '2026-10-18' });
  });
  it('a week can cross a month and a year', () => {
    expect(periodOf('weekly', '2026-12-31')).toEqual({ start: '2026-12-28', end: '2027-01-03' });
  });
  it('a month is the calendar month, including February in a leap year', () => {
    expect(periodOf('monthly', '2026-10-18')).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(periodOf('monthly', '2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });
  it('a year is the calendar year', () => {
    expect(periodOf('yearly', '2026-10-18')).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
});

describe('shiftPeriod', () => {
  it('moves a week, a month and a year', () => {
    expect(shiftPeriod('weekly', '2026-10-12', -1)).toBe('2026-10-05');
    expect(shiftPeriod('weekly', '2026-12-28', 1)).toBe('2027-01-04');
    expect(shiftPeriod('monthly', '2026-01-01', -1)).toBe('2025-12-01');
    expect(shiftPeriod('monthly', '2026-12-01', 1)).toBe('2027-01-01');
    expect(shiftPeriod('yearly', '2026-01-01', 1)).toBe('2027-01-01');
  });
});

describe('daysUntil', () => {
  it('counts whole days, negative once passed', () => {
    expect(daysUntil('2026-10-25', '2026-10-18')).toBe(7);
    expect(daysUntil('2026-10-18', '2026-10-18')).toBe(0);
    expect(daysUntil('2026-10-17', '2026-10-18')).toBe(-1);
  });
});
