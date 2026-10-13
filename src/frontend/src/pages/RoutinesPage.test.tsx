import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import RoutinesPage from './RoutinesPage';
import type { RoutineDay } from '../api/routinesApi';

const today = (() => {
  const d = new Date(); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();

const day = (): RoutineDay => ({
  id: `day:${today}`, date: today, sections: ['Morning', 'Check in'],
  items: [
    { id: 'a', text: 'A few minutes of quiet', section: 'Morning', kind: 'check', essential: true, source: 'template' },
    { id: 'b', text: 'Make the bed', section: 'Morning', kind: 'check', essential: true, source: 'template' },
    { id: 'c', text: 'Read something', section: 'Morning', kind: 'check', essential: false, source: 'template' },
    { id: 'd', text: 'How do I feel right now?', section: 'Check in', kind: 'text', essential: false, source: 'template' },
  ],
  checked: {}, values: {},
});

const calls: { url: string; method: string; body?: string }[] = [];

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined });
    if (url.includes('/month/')) return new Response('[]', { status: 200 });
    if (url.includes('/state')) return new Response(JSON.stringify({ date: today, essentialsDone: 1, essentialsTotal: 2, done: 1, total: 3 }), { status: 200 });
    if (url.includes('/items') && init?.method === 'POST') return new Response(JSON.stringify({ error: 'That is the most items one day can hold.' }), { status: 400 });
    return new Response(JSON.stringify(day()), { status: 200 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('RoutinesPage', () => {
  it('shows the day with essentials counted first and notes not counted', async () => {
    render(<RoutinesPage />);
    await screen.findByText('A few minutes of quiet');
    expect(screen.getByText('0 of 2')).toBeTruthy();          // essentials
    expect(screen.getByText('0 of 3 in all')).toBeTruthy();    // the note is not counted
  });

  it('ticking an essential updates the count at once and saves shortly afterwards', async () => {
    render(<RoutinesPage />);
    const box = await screen.findByLabelText('A few minutes of quiet');
    fireEvent.click(box);
    expect(screen.getByText('1 of 2')).toBeTruthy();
    await waitFor(() => expect(calls.some(c => c.url.includes('/state') && c.method === 'PUT')).toBe(true), { timeout: 3000 });
    const save = calls.find(c => c.url.includes('/state'))!;
    expect(JSON.parse(save.body!).checked).toEqual({ a: true });
  });

  it('asks which days before adding a rule item, and asks for text first', async () => {
    render(<RoutinesPage />);
    await screen.findByText('A few minutes of quiet');
    fireEvent.click(screen.getByText('Add an item'));
    fireEvent.click(screen.getByText('Add item'));
    expect(screen.getByText('Type what the item is.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('What is the item'), { target: { value: 'Plan the week' } });
    fireEvent.click(screen.getByLabelText(/On certain days/));
    fireEvent.click(screen.getByText('Add item'));
    expect(screen.getByText('Choose which days.')).toBeTruthy();
    expect(calls.some(c => c.url.includes('/items') && c.method === 'POST')).toBe(false);
  });

  it('shows the server’s message when an item cannot be added', async () => {
    render(<RoutinesPage />);
    await screen.findByText('A few minutes of quiet');
    fireEvent.click(screen.getByText('Add an item'));
    fireEvent.change(screen.getByLabelText('What is the item'), { target: { value: 'Walk' } });
    fireEvent.click(screen.getByText('Add item'));
    await screen.findByText('That is the most items one day can hold.');
  });
});
