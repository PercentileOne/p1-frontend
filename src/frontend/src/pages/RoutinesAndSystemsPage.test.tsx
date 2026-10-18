import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import RoutinesAndSystemsPage from './RoutinesAndSystemsPage';
import type { RoutineDay } from '../api/routinesApi';

vi.mock('../api/ttsApi', () => ({ speak: vi.fn(() => () => {}), unlockTTSAudio: vi.fn() }));

const dayFor = (date: string): RoutineDay => ({
  id: `day:${date}`, date, sections: ['Morning'],
  items: [{ id: 'a', text: 'A few minutes of quiet', section: 'Morning', kind: 'check', essential: true, source: 'template' }],
  checked: {}, values: {},
});

const dayCalls: string[] = [];
const periodCalls: string[] = [];
beforeEach(() => {
  dayCalls.length = 0; periodCalls.length = 0;
  try { localStorage.clear(); } catch { /* fine */ }
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/api/notes-search')) {
      return new Response(JSON.stringify([
        { kind: 'day', date: '2025-03-14', endDate: '', cadence: '', id: '', title: 'Notes for this day', snippet: 'Met a dear friend and talked about marketing', field: 'Notes for this day' },
        { kind: 'review', date: '2025-03-10', endDate: '2025-03-16', cadence: 'weekly', id: '', title: 'Review', snippet: 'Study marketing', field: 'Priorities' },
        { kind: 'goal', date: '2026-10-10', endDate: '', cadence: '', id: 'g1', title: 'Learn marketing', snippet: 'Finish the course', field: 'Goal' },
      ]), { status: 200 });
    }
    const m = url.match(/\/api\/routines\/day\/(\d{4}-\d{2}-\d{2})$/);
    if (m) { dayCalls.push(m[1]); return new Response(JSON.stringify(dayFor(m[1])), { status: 200 }); }
    if (url.includes('/api/reviews/period')) { periodCalls.push(url); const sp = new URL(url).searchParams; return new Response(JSON.stringify({ cadence: sp.get('cadence'), periodStart: sp.get('date'), periodEnd: sp.get('date'), review: null }), { status: 200 }); }
    if (url.includes('/api/goals')) return new Response('[]', { status: 200 });
    if (url.includes('/api/reviews?cadence=')) return new Response('[]', { status: 200 });
    if (url.includes('/api/routines/month/') || url.endsWith('/api/routines/months')) return new Response('[]', { status: 200 });
    if (url.includes('/api/favourite-days')) return new Response('[]', { status: 200 });
    if (url.includes('/api/day-notes/')) return new Response(JSON.stringify({ date: '', text: '' }), { status: 200 });
    return new Response('{}', { status: 200 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const searchFor = async (q: string) => {
  fireEvent.change(screen.getByLabelText('Search your notes, reviews and goals'), { target: { value: q } });
  await screen.findByText('3 results, newest first');
};

describe('Routines & Systems search', () => {
  it('replaces the tabs with results while searching, and brings them back when cleared', async () => {
    render(<RoutinesAndSystemsPage />);
    await screen.findByText('A few minutes of quiet');
    await searchFor('marketing');
    expect(screen.queryByRole('tablist')).toBeNull();
    fireEvent.click(screen.getByLabelText('Clear search'));
    await screen.findByRole('tablist');
  });

  it('a day result opens that day in Routines', async () => {
    render(<RoutinesAndSystemsPage />);
    await screen.findByText('A few minutes of quiet');
    await searchFor('marketing');
    dayCalls.length = 0;
    fireEvent.click(screen.getByText(/Met a dear friend/));
    await waitFor(() => expect(dayCalls).toContain('2025-03-14'));
    await screen.findByText('Looking back on this day.');
  });

  it('a review result opens that week in Systems', async () => {
    render(<RoutinesAndSystemsPage />);
    await screen.findByText('A few minutes of quiet');
    await searchFor('marketing');
    periodCalls.length = 0;
    fireEvent.click(screen.getByText(/Weekly review · 10 Mar 2025/));   // the snippet itself is split by the highlighting
    await waitFor(() => expect(periodCalls.some(u => u.includes('cadence=weekly') && u.includes('date=2025-03-10'))).toBe(true));
    expect(screen.getByRole('tab', { name: 'Systems' }).getAttribute('aria-selected')).toBe('true');
  });

  it('a goal result opens the Goals tab', async () => {
    render(<RoutinesAndSystemsPage />);
    await screen.findByText('A few minutes of quiet');
    await searchFor('marketing');
    fireEvent.click(screen.getByText(/Finish the course/));
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Goals' }).getAttribute('aria-selected')).toBe('true'));
  });
});
