import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { reportPrepProgress } from './prepProgress';
import { useAuthStore } from '../auth/authStore';

const calls: { url: string; init: RequestInit }[] = [];

beforeEach(() => {
  calls.length = 0;
  useAuthStore.setState({ token: 'tok' });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response('{"ok":true}', { status: 200 }); }));
});
afterEach(() => { vi.unstubAllGlobals(); useAuthStore.setState({ token: null }); });

describe('reportPrepProgress', () => {
  it('tells the server which step the candidate has reached on which prep', () => {
    reportPrepProgress({ id: 'p1', recruiterId: 'r1' }, 'answered', { answered: 3, total: 10 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/api\/interview-preps\/p1\/progress$/);
    expect(calls[0].init.method).toBe('POST');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ recruiterId: 'r1', step: 'answered', answered: 3, total: 10 });
    expect(calls[0].init.keepalive).toBe(true);
  });

  it('sends only counts: nothing about answers or scores can be in the report', () => {
    reportPrepProgress({ id: 'p1', recruiterId: 'r1' }, 'finished', { answered: 10, total: 10 });
    const sent = Object.keys(JSON.parse(String(calls[0].init.body))).sort();
    expect(sent).toEqual(['answered', 'recruiterId', 'step', 'total']);
  });

  it('does nothing for a practice that did not come from a recruiter prep, or when signed out', () => {
    reportPrepProgress(null, 'started');
    reportPrepProgress(undefined, 'started');
    reportPrepProgress({ id: '', recruiterId: 'r1' }, 'started');
    useAuthStore.setState({ token: null });
    reportPrepProgress({ id: 'p1', recruiterId: 'r1' }, 'started');
    expect(calls).toHaveLength(0);
  });

  it('never throws or blocks the practice when the report fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(() => reportPrepProgress({ id: 'p1', recruiterId: 'r1' }, 'opened')).not.toThrow();
    await new Promise(r => setTimeout(r, 10));
  });
});
