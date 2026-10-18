import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import GoalsTab from './GoalsTab';
import type { Goal } from '../api/planningApi';

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g1', title: 'Pass my next interview', description: 'It matters.', category: 'Career', startDate: '2026-10-01', targetDate: '2099-12-31',
  status: 'active', track: 'milestones', milestones: [{ id: 'm1', text: 'Do three practice interviews', done: false }, { id: 'm2', text: 'Learn Azure basics', done: true }],
  targetValue: null, currentValue: null, unit: null, updates: [], progress: 50, createdAt: '2026-10-01T00:00:00Z', completedAt: null, ...over,
});

const calls: { url: string; method: string; body?: string }[] = [];
let list: Goal[] = [];

beforeEach(() => {
  calls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: init?.body as string | undefined });
    if (url.endsWith('/api/goals') && method === 'GET') return new Response(JSON.stringify(list), { status: 200 });
    if (url.endsWith('/api/goals') && method === 'POST') {
      const b = JSON.parse(init!.body as string);
      return new Response(JSON.stringify(goal({ id: 'new', title: b.title, track: b.track, milestones: b.milestones ?? [], targetValue: b.targetValue, progress: 0 })), { status: 200 });
    }
    if (/\/api\/goals\/[^/]+\/updates$/.test(url)) return new Response(JSON.stringify(goal({ track: 'number', targetValue: 24, currentValue: 12, unit: 'books', progress: 50, milestones: [] })), { status: 200 });
    if (/\/api\/goals\/[^/]+$/.test(url) && method === 'PUT') return new Response(JSON.stringify(goal({ milestones: JSON.parse(init!.body as string).milestones ?? goal().milestones })), { status: 200 });
    return new Response('{}', { status: 200 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); list = []; });

describe('GoalsTab', () => {
  it('shows a friendly empty state with no goals', async () => {
    render(<GoalsTab />);
    await screen.findByText('No goals yet');
  });

  it('shows a goal card with progress, dates and its steps', async () => {
    list = [goal()];
    render(<GoalsTab />);
    await screen.findByText('Pass my next interview');
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByLabelText('Do three practice interviews')).toBeTruthy();
    expect((screen.getByLabelText('Learn Azure basics') as HTMLInputElement).checked).toBe(true);
  });

  it('ticking a step saves the new checklist', async () => {
    list = [goal()];
    render(<GoalsTab />);
    fireEvent.click(await screen.findByLabelText('Do three practice interviews'));
    await waitFor(() => expect(calls.some(c => c.method === 'PUT')).toBe(true));
    const put = calls.find(c => c.method === 'PUT')!;
    const sent = JSON.parse(put.body!);
    expect(sent.milestones.map((m: { done: boolean }) => m.done)).toEqual([true, true]);
  });

  it('adds a goal with a checklist, including a step typed but not yet added', async () => {
    render(<GoalsTab />);
    await screen.findByText('No goals yet');
    fireEvent.click(screen.getByText('Add a goal'));
    fireEvent.change(await screen.findByLabelText('WHAT IS THE GOAL?'), { target: { value: 'Learn Azure fundamentals' } });
    fireEvent.change(screen.getByLabelText('Add a step'), { target: { value: 'Finish the Microsoft Learn path' } });
    fireEvent.click(screen.getByText('Save goal'));
    await waitFor(() => expect(calls.some(c => c.method === 'POST')).toBe(true));
    const body = JSON.parse(calls.find(c => c.method === 'POST')!.body!);
    expect(body.title).toBe('Learn Azure fundamentals');
    expect(body.track).toBe('milestones');
    expect(body.milestones).toEqual([{ text: 'Finish the Microsoft Learn path', done: false }]);
    await screen.findByText('Learn Azure fundamentals');
  });

  it('asks for a title and a number before saving', async () => {
    render(<GoalsTab />);
    await screen.findByText('No goals yet');
    fireEvent.click(screen.getByText('Add a goal'));
    fireEvent.click(await screen.findByText('Save goal'));
    expect(screen.getByText('Give the goal a title.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('WHAT IS THE GOAL?'), { target: { value: 'Read 24 books' } });
    fireEvent.click(screen.getByText('A number'));
    fireEvent.click(screen.getByText('Save goal'));
    expect(screen.getByText('Enter the number you are aiming for.')).toBeTruthy();
    expect(calls.some(c => c.method === 'POST')).toBe(false);
  });

  it('updates a number goal from the card', async () => {
    list = [goal({ track: 'number', milestones: [], targetValue: 24, currentValue: 10, unit: 'books', progress: 42 })];
    render(<GoalsTab />);
    const input = await screen.findByLabelText('New value for Pass my next interview');
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.click(screen.getByText('Update'));
    await waitFor(() => expect(calls.some(c => c.url.endsWith('/updates'))).toBe(true));
    expect(JSON.parse(calls.find(c => c.url.endsWith('/updates'))!.body!)).toEqual({ value: 12 });
  });

  it('deleting asks first', async () => {
    list = [goal()];
    render(<GoalsTab />);
    fireEvent.click(await screen.findByText('Delete'));
    expect(calls.some(c => c.method === 'DELETE')).toBe(false);
    fireEvent.click(screen.getByText('Yes, delete it'));
    await waitFor(() => expect(calls.some(c => c.method === 'DELETE')).toBe(true));
  });
});
