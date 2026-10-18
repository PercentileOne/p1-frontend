import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ReviewsTab from './ReviewsTab';
import { periodOf } from '../api/planningApi';

const pad = (n: number) => String(n).padStart(2, '0');
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
const week = periodOf('weekly', today);
const inWeek = week.start;                                   // a Monday inside the current week

const calls: { url: string; method: string; body?: string }[] = [];
let savedReviews: unknown[] = [];

beforeEach(() => {
  calls.length = 0; savedReviews = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: init?.body as string | undefined });
    if (url.includes('/api/reviews/period')) {
      const cadence = new URL(url).searchParams.get('cadence') as 'weekly' | 'monthly' | 'yearly';
      const p = periodOf(cadence, new URL(url).searchParams.get('date')!);
      return new Response(JSON.stringify({ cadence, periodStart: p.start, periodEnd: p.end, review: null }), { status: 200 });
    }
    if (url.includes('/api/reviews?cadence=')) return new Response(JSON.stringify(savedReviews), { status: 200 });
    if (url.includes('/api/reviews/') && method === 'PUT') return new Response(JSON.stringify({ ...JSON.parse(init!.body as string), updatedAt: 'now' }), { status: 200 });
    if (url.includes('/api/routines/month/')) {
      return new Response(JSON.stringify([
        { date: inWeek, essentialsDone: 3, essentialsTotal: 3, done: 4, total: 5 },
        { date: '2000-01-01', essentialsDone: 1, essentialsTotal: 3, done: 1, total: 5 },   // outside the week: not counted
      ]), { status: 200 });
    }
    if (url.endsWith('/api/interviews')) return new Response(JSON.stringify([{ createdAt: `${inWeek}T10:00:00Z` }, { createdAt: '2000-01-01T10:00:00Z' }]), { status: 200 });
    return new Response('{}', { status: 200 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('ReviewsTab', () => {
  it('works out the look-back from real routine days and interviews', async () => {
    render(<ReviewsTab />);
    await screen.findByText('3 of 3');                       // essentials done in the week
    expect(screen.getByText('1 of 1')).toBeTruthy();         // days with every essential done
    expect(screen.getByText('practice interviews')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('asks the three weekly questions and a free-text note', async () => {
    render(<ReviewsTab />);
    await screen.findByLabelText('What went well this week?');
    expect(screen.getByLabelText("What didn't go well?")).toBeTruthy();
    expect(screen.getByLabelText('What did I learn?')).toBeTruthy();
    expect(screen.getByLabelText('In your own words')).toBeTruthy();
  });

  it('saves what is typed by itself, under the Monday of the week', async () => {
    render(<ReviewsTab />);
    const notes = await screen.findByLabelText('In your own words');
    await waitFor(() => expect((notes as HTMLTextAreaElement).disabled).toBe(false));
    fireEvent.change(notes, { target: { value: 'I must study more on marketing.' } });
    fireEvent.click(screen.getByText('Good'));
    fireEvent.change(screen.getByLabelText('Priority 1'), { target: { value: 'Study marketing' } });
    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true), { timeout: 4000 });
    const put = calls.filter(c => c.method === 'PUT').pop()!;
    expect(put.url.endsWith(`/api/reviews/weekly/${week.start}`)).toBe(true);
    const sent = JSON.parse(put.body!);
    expect(sent.notes).toBe('I must study more on marketing.');
    expect(sent.rating).toBe(4);
    expect(sent.priorities).toEqual(['Study marketing']);
    await screen.findByText('Saved');
  });

  it('switches to a monthly review with its own questions', async () => {
    render(<ReviewsTab />);
    fireEvent.click(await screen.findByText('Monthly'));
    await screen.findByLabelText('What moved forward this month?');
    expect(calls.some(c => c.url.includes('cadence=monthly'))).toBe(true);
  });

  it('jumps to the week of a picked date, and This week brings you back', async () => {
    render(<ReviewsTab />);
    const back = await screen.findByLabelText('Back to this week');
    expect((back as HTMLButtonElement).disabled).toBe(true);          // already on this week
    fireEvent.change(screen.getByLabelText('Jump to a date'), { target: { value: '2025-03-12' } });
    await waitFor(() => expect(calls.some(c => c.url.includes('/api/reviews/period') && c.url.includes('date=2025-03-10'))).toBe(true));
    await waitFor(() => expect((screen.getByLabelText('Back to this week') as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByLabelText('Back to this week'));
    await waitFor(() => expect((screen.getByLabelText('Back to this week') as HTMLButtonElement).disabled).toBe(true));
  });

  it('draws the mood over time once two reviews are rated, and a click opens that week', async () => {
    savedReviews = [
      { cadence: 'weekly', periodStart: '2026-09-28', periodEnd: '2026-10-04', rating: 2, wentWell: '', didntGoWell: '', learned: '', notes: '', priorities: [], updatedAt: 'x' },
      { cadence: 'weekly', periodStart: '2026-10-05', periodEnd: '2026-10-11', rating: 5, wentWell: '', didntGoWell: '', learned: '', notes: '', priorities: [], updatedAt: 'x' },
    ];
    render(<ReviewsTab />);
    fireEvent.click(await screen.findByText(/Mood by week/));
    await screen.findByText('MOOD OVER TIME');
    await screen.findByText('average over 2 weeks');
    calls.length = 0;
    fireEvent.click(screen.getByRole('button', { name: /week of 28 Sep\w* 2026: Hard/ }));
    await waitFor(() => expect(calls.some(c => c.url.includes('/api/reviews/period') && c.url.includes('date=2026-09-28'))).toBe(true));
  });

  it('shows the mood by day first', async () => {
    render(<ReviewsTab />);
    await screen.findByText('MOOD BY DAY');
    expect(screen.getByLabelText('Mood view')).toBeTruthy();
  });

  it('cannot move forward past the current period', async () => {
    render(<ReviewsTab />);
    const next = await screen.findByLabelText('Next week');
    expect((next as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Previous week') as HTMLButtonElement).disabled).toBe(false);
  });
});
