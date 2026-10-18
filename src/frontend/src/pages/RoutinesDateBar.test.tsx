import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import RoutinesPage from './RoutinesPage';
import type { RoutineDay } from '../api/routinesApi';

vi.mock('../api/ttsApi', () => ({ speak: vi.fn(() => () => {}), unlockTTSAudio: vi.fn() }));

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = iso(new Date());
const daysFromToday = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

const dayFor = (date: string): RoutineDay => ({
  id: `day:${date}`, date, sections: ['Morning'],
  items: [{ id: 'a', text: 'A few minutes of quiet', section: 'Morning', kind: 'check', essential: true, source: 'template' }],
  checked: {}, values: {},
});

const dayCalls: string[] = [];
const favCalls: { url: string; method: string; body?: string }[] = [];
let favList: { date: string; note: string }[] = [];
const noteCalls: { url: string; method: string; body?: string }[] = [];
let notes: Record<string, string> = {};
beforeEach(() => {
  dayCalls.length = 0; favCalls.length = 0; favList = []; noteCalls.length = 0; notes = {};
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/api/day-notes/')) {
      const method = init?.method ?? 'GET';
      const date = url.split('/').pop()!;
      noteCalls.push({ url, method, body: init?.body as string | undefined });
      if (method === 'PUT') { const text = JSON.parse(init!.body as string).text as string; notes[date] = text; return new Response(JSON.stringify({ date, text }), { status: 200 }); }
      return new Response(JSON.stringify({ date, text: notes[date] ?? '' }), { status: 200 });
    }
    if (url.includes('/api/favourite-days')) {
      const method = init?.method ?? 'GET';
      favCalls.push({ url, method, body: init?.body as string | undefined });
      if (method === 'GET') return new Response(JSON.stringify(favList), { status: 200 });
      const date = url.split('/').pop()!;
      if (method === 'PUT') { const note = JSON.parse(init!.body as string).note as string; favList = [...favList.filter(f => f.date !== date), { date, note }]; return new Response(JSON.stringify({ date, note }), { status: 200 }); }
      favList = favList.filter(f => f.date !== date);
      return new Response('{"ok":true}', { status: 200 });
    }
    const m = url.match(/\/api\/routines\/day\/(\d{4}-\d{2}-\d{2})$/);
    if (m) { dayCalls.push(m[1]); return new Response(JSON.stringify(dayFor(m[1])), { status: 200 }); }
    if (url.endsWith('/api/routines/months')) return new Response('[]', { status: 200 });
    if (url.includes('/month/')) return new Response('[]', { status: 200 });
    return new Response('{}', { status: 200 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Routines date bar', () => {
  it('opens a date picked from the date picker, even a year ago', async () => {
    render(<RoutinesPage />);
    await screen.findByText('A few minutes of quiet');
    const lastYear = `${new Date().getFullYear() - 1}-06-15`;
    fireEvent.change(screen.getByLabelText('Go to a date'), { target: { value: lastYear } });
    await waitFor(() => expect(dayCalls).toContain(lastYear));
    await screen.findByText('Looking back on this day.');
  });

  it('the Today button brings you back to today from anywhere', async () => {
    render(<RoutinesPage />);
    await screen.findByText('A few minutes of quiet');
    fireEvent.change(screen.getByLabelText('Go to a date'), { target: { value: '2025-01-10' } });
    await screen.findByText('Looking back on this day.');
    dayCalls.length = 0;
    fireEvent.click(screen.getByLabelText('Back to today'));
    await waitFor(() => expect(dayCalls).toContain(today));
    await waitFor(() => expect(screen.queryByText('Looking back on this day.')).toBeNull());
  });

  it('the arrows move one day back and forward', async () => {
    render(<RoutinesPage />);
    await screen.findByText('A few minutes of quiet');
    fireEvent.click(screen.getByLabelText('Previous day'));
    await waitFor(() => expect(dayCalls).toContain(daysFromToday(-1)));
    fireEvent.click(screen.getByLabelText('Next day'));
    await waitFor(() => expect(dayCalls.filter(d => d === today).length).toBeGreaterThanOrEqual(2));
  });

  it('cannot go more than a month into the future', async () => {
    render(<RoutinesPage />);
    await screen.findByText('A few minutes of quiet');
    fireEvent.change(screen.getByLabelText('Go to a date'), { target: { value: daysFromToday(60) } });
    await new Promise(r => setTimeout(r, 100));
    expect(dayCalls).not.toContain(daysFromToday(60));
    fireEvent.change(screen.getByLabelText('Go to a date'), { target: { value: daysFromToday(30) } });
    await waitFor(() => expect(dayCalls).toContain(daysFromToday(30)));
    expect((screen.getByLabelText('Next day') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('Favourite days', () => {
  it('stars a day, then lets you say why it matters', async () => {
    render(<RoutinesPage />);
    await screen.findByText('A few minutes of quiet');
    fireEvent.click(screen.getByLabelText('Mark this day as a favourite'));
    await screen.findByLabelText('Remove this day from your favourites');
    expect(favCalls.some(c => c.method === 'PUT' && c.url.endsWith(`/api/favourite-days/${today}`) && JSON.parse(c.body!).note === '')).toBe(true);
    const note = screen.getByLabelText('WHY IS THIS DAY SPECIAL? (OPTIONAL)');
    fireEvent.change(note, { target: { value: 'Got the job' } });
    fireEvent.blur(note);
    await waitFor(() => expect(favCalls.some(c => c.method === 'PUT' && JSON.parse(c.body!).note === 'Got the job')).toBe(true));
  });

  it('lists favourite days in a dropdown and opens the one you choose', async () => {
    favList = [{ date: '2025-03-14', note: 'Met a dear friend' }, { date: '2024-06-01', note: '' }];
    render(<RoutinesPage />);
    const select = await screen.findByLabelText('Favourite days');
    await screen.findByText(/Met a dear friend/);
    fireEvent.change(select, { target: { value: '2025-03-14' } });
    await waitFor(() => expect(dayCalls).toContain('2025-03-14'));
  });

  it('removes a favourite with the star', async () => {
    favList = [{ date: today, note: 'Today matters' }];
    render(<RoutinesPage />);
    fireEvent.click(await screen.findByLabelText('Remove this day from your favourites'));
    await waitFor(() => expect(favCalls.some(c => c.method === 'DELETE' && c.url.endsWith(`/api/favourite-days/${today}`))).toBe(true));
    await screen.findByLabelText('Mark this day as a favourite');
  });

  it('shows no favourites dropdown until there is one', async () => {
    render(<RoutinesPage />);
    await screen.findByText('A few minutes of quiet');
    expect(screen.queryByLabelText('Favourite days')).toBeNull();
  });
});

describe('Notes for this day', () => {
  it('shows the saved note for the day', async () => {
    notes[today] = 'Met Mukesh in London';
    render(<RoutinesPage />);
    const box = await screen.findByLabelText('NOTES FOR THIS DAY');
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe('Met Mukesh in London'));
  });

  it('saves typed words by itself under that day', async () => {
    render(<RoutinesPage />);
    const box = await screen.findByLabelText('NOTES FOR THIS DAY');
    await waitFor(() => expect((box as HTMLTextAreaElement).disabled).toBe(false));
    fireEvent.change(box, { target: { value: 'A great day. I must study more on marketing.' } });
    await waitFor(() => expect(noteCalls.some(c => c.method === 'PUT' && c.url.endsWith(`/api/day-notes/${today}`))).toBe(true), { timeout: 3000 });
    expect(JSON.parse(noteCalls.find(c => c.method === 'PUT')!.body!).text).toBe('A great day. I must study more on marketing.');
    await screen.findByText('Saved');
  });

  it('each day has its own note', async () => {
    notes['2025-03-14'] = 'Met a dear friend';
    render(<RoutinesPage />);
    await screen.findByLabelText('NOTES FOR THIS DAY');
    fireEvent.change(screen.getByLabelText('Go to a date'), { target: { value: '2025-03-14' } });
    await waitFor(() => expect((screen.getByLabelText('NOTES FOR THIS DAY') as HTMLTextAreaElement).value).toBe('Met a dear friend'));
  });
});
