import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { DayMood } from './DayMood';

const calls: { url: string; method: string; body?: string }[] = [];
let saved: { date: string; rating: number }[] = [];

beforeEach(() => {
  calls.length = 0; saved = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: init?.body as string | undefined });
    if (url.includes('/api/moods/') && method === 'PUT') { const date = url.split('/').pop()!; const rating = JSON.parse(init!.body as string).rating; return new Response(JSON.stringify({ date, rating }), { status: 200 }); }
    if (url.includes('/api/moods')) return new Response(JSON.stringify(saved), { status: 200 });
    return new Response('{}', { status: 200 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('DayMood', () => {
  it('shows the mood already chosen for the day', async () => {
    saved = [{ date: '2026-10-18', rating: 4 }];
    render(<DayMood date="2026-10-18" />);
    await waitFor(() => expect(screen.getByText('Good').getAttribute('aria-pressed')).toBe('true'));
    expect(screen.getByText('Rough').getAttribute('aria-pressed')).toBe('false');
  });

  it('saves a tap under that day, and shows it at once', async () => {
    render(<DayMood date="2026-10-18" />);
    const great = await screen.findByText('Great');
    await waitFor(() => expect((great as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(great);
    expect(great.getAttribute('aria-pressed')).toBe('true');
    await waitFor(() => expect(calls.some(c => c.method === 'PUT' && c.url.endsWith('/api/moods/2026-10-18') && JSON.parse(c.body!).rating === 5)).toBe(true));
    await screen.findByText('Saved');
  });

  it('tapping the chosen mood again clears it', async () => {
    saved = [{ date: '2026-10-18', rating: 3 }];
    render(<DayMood date="2026-10-18" />);
    await waitFor(() => expect(screen.getByText('Okay').getAttribute('aria-pressed')).toBe('true'));
    fireEvent.click(screen.getByText('Okay'));
    await waitFor(() => expect(calls.some(c => c.method === 'PUT' && JSON.parse(c.body!).rating === 0)).toBe(true));
    expect(screen.getByText('Okay').getAttribute('aria-pressed')).toBe('false');
  });
});
