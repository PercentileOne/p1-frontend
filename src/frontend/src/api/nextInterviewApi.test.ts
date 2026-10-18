import { describe, it, expect, vi, afterEach } from 'vitest';
import { inNextWeek, nextInterviewApi, upcoming, whenText } from './nextInterviewApi';
import type { NextInterview } from './nextInterviewApi';

const iv = (id: string, date: string, over: Partial<NextInterview> = {}): NextInterview => ({ id, date, role: 'Engineer', company: '', source: 'self', ...over });

describe('upcoming', () => {
  it('keeps today and later, soonest first, and drops the past', () => {
    const list = [iv('a', '2026-10-25'), iv('b', '2026-10-17'), iv('c', '2026-10-18'), iv('d', '2026-10-20')];
    expect(upcoming(list, '2026-10-18').map(i => i.id)).toEqual(['c', 'd', 'a']);
  });
});

describe('inNextWeek', () => {
  it('counts today up to six days ahead', () => {
    const list = [iv('a', '2026-10-18'), iv('b', '2026-10-24'), iv('c', '2026-10-25'), iv('d', '2026-10-10')];
    expect(inNextWeek(list, '2026-10-18')).toBe(2);
    expect(inNextWeek([], '2026-10-18')).toBe(0);
  });
});

describe('whenText', () => {
  it('says today, tomorrow, or in N days', () => {
    expect(whenText('2026-10-18', '2026-10-18')).toBe('today');
    expect(whenText('2026-10-19', '2026-10-18')).toBe('tomorrow');
    expect(whenText('2026-10-23', '2026-10-18')).toBe('in 5 days');
  });
});

describe('nextInterviewApi.all', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('merges the person\'s own interviews with recruiter-sent preps', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/api/next-interviews')) return new Response(JSON.stringify([{ id: 'x1', date: '2026-10-30', role: 'Analyst', company: 'Acme' }]), { status: 200 });
      if (url.endsWith('/api/interview-preps/received')) return new Response(JSON.stringify([{ id: 'p1', role: 'Developer', recruiterName: 'Sam', interviewDate: '2026-10-22T09:00:00Z' }]), { status: 200 });
      return new Response('{}', { status: 404 });
    }));
    const all = await nextInterviewApi.all();
    expect(all).toHaveLength(2);
    expect(all.find(i => i.source === 'recruiter')).toMatchObject({ id: 'prep:p1', date: '2026-10-22', role: 'Developer', from: 'Sam' });
    expect(all.find(i => i.source === 'self')).toMatchObject({ id: 'x1', company: 'Acme' });
  });

  it('still returns the preps when the person\'s own list cannot load', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/api/next-interviews')) return new Response('{}', { status: 500 });
      return new Response(JSON.stringify([{ id: 'p1', role: 'Developer', recruiterName: 'Sam', interviewDate: '2026-10-22' }]), { status: 200 });
    }));
    expect(await nextInterviewApi.all()).toHaveLength(1);
  });
});
