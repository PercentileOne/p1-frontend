import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import RoutinesPage from './RoutinesPage';
import type { RoutineDay } from '../api/routinesApi';

const today = (() => {
  const d = new Date(); const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();

const day = (): RoutineDay => ({
  id: `day:${today}`, date: today, sections: ['First', 'Morning', 'Check in'],
  items: [
    { id: 'a', text: 'A few minutes of quiet', section: 'Morning', kind: 'check', essential: true, source: 'template' },
    { id: 'b', text: 'Make the bed', section: 'Morning', kind: 'check', essential: true, source: 'template' },
    { id: 'c', text: 'Read something', section: 'Morning', kind: 'check', essential: false, source: 'template' },
    { id: 'd', text: 'How do I feel right now?', section: 'Check in', kind: 'text', essential: false, source: 'template' },
    { id: 'r', text: 'Every good thing will come true today.\nGreat things are on their way.', section: 'First', kind: 'read', essential: true, source: 'template' },
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
    if (url.endsWith('/api/routines/import')) return new Response(JSON.stringify(day()), { status: 200 });
    if (url.includes('/items') && init?.method === 'POST') return new Response(JSON.stringify({ error: 'That is the most items one day can hold.' }), { status: 400 });
    return new Response(JSON.stringify(day()), { status: 200 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('RoutinesPage', () => {
  it('shows the day with essentials counted first and notes not counted', async () => {
    render(<RoutinesPage />);
    await screen.findByText('A few minutes of quiet');
    expect(screen.getByText('0 of 3')).toBeTruthy();          // essentials: two ticks and the passage
    expect(screen.getByText('0 of 4 in all')).toBeTruthy();    // the note is not counted
  });

  it('ticking an essential updates the count at once and saves shortly afterwards', async () => {
    render(<RoutinesPage />);
    const box = await screen.findByLabelText('A few minutes of quiet');
    fireEvent.click(box);
    expect(screen.getByText('1 of 3')).toBeTruthy();
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

  it('shows a read-aloud passage whole, with one tick that counts as an essential', async () => {
    render(<RoutinesPage />);
    const passage = await screen.findByText(/Every good thing will come true today\./);
    expect(passage.textContent).toContain('Great things are on their way.');   // both lines, kept together
    fireEvent.click(screen.getByLabelText(/I've read it/));
    expect(screen.getByText('1 of 3')).toBeTruthy();
    await waitFor(() => expect(calls.some(c => c.url.includes('/state') && c.method === 'PUT')).toBe(true), { timeout: 3000 });
    expect(JSON.parse(calls.find(c => c.url.includes('/state'))!.body!).checked).toEqual({ r: true });
  });

  it('lets the wording of an item be edited, and saves it', async () => {
    render(<RoutinesPage />);
    await screen.findByText('Make the bed');
    fireEvent.click(screen.getByLabelText('Options for Make the bed'));
    fireEvent.click(screen.getByText('Edit wording'));
    fireEvent.change(screen.getByLabelText('Edit wording'), { target: { value: 'Make the bed and open the window' } });
    fireEvent.click(screen.getByText('Save wording'));
    await waitFor(() => expect(calls.some(c => c.url.includes('/items/b') && c.method === 'PUT')).toBe(true));
    expect(JSON.parse(calls.find(c => c.url.includes('/items/b'))!.body!)).toEqual({ text: 'Make the bed and open the window' });
  });

  it('pastes a list, shows a preview, and saves only what is ticked', async () => {
    render(<RoutinesPage />);
    await screen.findByText('Make the bed');
    fireEvent.click(screen.getByText('Paste your list'));
    const pasted = ['Morning:', '* Pray', '* Check Blood Pressure 150/90', '', 'IF DAY THEN DO', '* If Sunday, plan the week', '* If Dialysis day, then send blood'].join('\n');
    fireEvent.change(screen.getByLabelText('Your list'), { target: { value: pasted } });
    fireEvent.click(screen.getByText('Read my list'));
    await screen.findByDisplayValue('Pray');
    expect(screen.getByDisplayValue('Check Blood Pressure')).toBeTruthy();       // the pasted reading is not copied
    // the dialysis item needs its days chosen first
    expect((screen.getByText(/^Add \d+ items$/) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('Dialysis day');
    fireEvent.click(screen.getByLabelText('Keep: Send blood'));                   // untick it instead
    const add = screen.getByText('Add 3 items') as HTMLButtonElement;
    expect(add.disabled).toBe(false);
    fireEvent.click(add);
    await waitFor(() => expect(calls.some(c => c.url.endsWith('/api/routines/import') && c.method === 'POST')).toBe(true));
    const body = JSON.parse(calls.find(c => c.url.endsWith('/import'))!.body!);
    expect(body.mode).toBe('replace');
    expect(body.date).toBe(today);
    expect(body.items.map((i: { text: string }) => i.text)).toEqual(['Pray', 'Check Blood Pressure', 'Plan the week']);
    expect(body.items[2].rule).toEqual({ weekdays: [0], lastDayOfMonth: null, label: 'Sunday' });
    expect(body.items[1].kind).toBe('number');
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
