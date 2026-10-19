import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import RoutinesPage from './RoutinesPage';
import type { RoutineDay } from '../api/routinesApi';

vi.mock('../api/ttsApi', () => ({ speak: vi.fn(() => () => {}), unlockTTSAudio: vi.fn() }));

// The self-ticking "answer my Question of the Day" routine item (2026-10-19): it shows the answer as the tick, cannot be ticked by hand, and offers a way to go and answer.

const pad = (n: number) => String(n).padStart(2, '0');
const d0 = new Date();
const today = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`;

let ticked = false;
const posted: { url: string; body: unknown }[] = [];
const dayWith = (answered: boolean): RoutineDay => ({
  id: `day:${today}`, date: today, sections: ['Morning'],
  items: [
    { id: 'q', text: 'Answer my Question of the Day', section: 'Morning', kind: 'qotd', essential: false, source: 'template' },
    { id: 'a', text: 'A few minutes of quiet', section: 'Morning', kind: 'check', essential: true, source: 'template' },
  ],
  checked: answered ? { q: true } : {}, values: {},
});

beforeEach(() => {
  ticked = false; posted.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (new RegExp(`/api/routines/day/${today}$`).test(url)) return new Response(JSON.stringify(dayWith(ticked)), { status: 200 });
    if (/\/api\/routines\/day\/[\d-]+\/items$/.test(url) && init?.method === 'POST') {
      posted.push({ url, body: JSON.parse(init.body as string) });
      return new Response(JSON.stringify(dayWith(false)), { status: 200 });
    }
    if (url.endsWith('/api/routines/months')) return new Response('[]', { status: 200 });
    if (url.includes('/month/')) return new Response('[]', { status: 200 });
    if (url.includes('/api/favourite-days')) return new Response('[]', { status: 200 });
    if (url.includes('/api/day-notes/')) return new Response(JSON.stringify({ date: today, text: '' }), { status: 200 });
    return new Response('{}', { status: 200 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('the self-ticking Question of the Day routine item', () => {
  it('shows an unanswered one as unticked, locked, with a way to go and answer it', async () => {
    render(<RoutinesPage />);
    await screen.findByText('Answer my Question of the Day');
    const box = screen.getByLabelText('Answer my Question of the Day') as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(box.disabled).toBe(true);
    expect(box.title).toMatch(/ticks itself/);
    const link = screen.getByText('Answer it →');
    expect(link.getAttribute('href')).toBe('/dashboard?tab=feed');
  });

  it('shows an answered one as ticked and says Answered, with no link', async () => {
    ticked = true;
    render(<RoutinesPage />);
    await screen.findByText('Answer my Question of the Day');
    expect((screen.getByLabelText('Answer my Question of the Day') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText('Answered')).toBeTruthy();
    expect(screen.queryByText('Answer it →')).toBeNull();
  });

  it('leaves ordinary items tickable', async () => {
    render(<RoutinesPage />);
    await screen.findByText('A few minutes of quiet');
    expect((screen.getByLabelText('A few minutes of quiet') as HTMLInputElement).disabled).toBe(false);
  });

  it('adds one from the Add an item form, filling in the wording', async () => {
    render(<RoutinesPage />);
    await screen.findByText('Answer my Question of the Day');
    fireEvent.click(screen.getByText(/Add an item|Add item|Add/, { selector: 'button' }));
    fireEvent.change(await screen.findByLabelText('Type of item'), { target: { value: 'qotd' } });
    expect((screen.getByLabelText('What is the item') as HTMLInputElement).value).toBe('Answer my Question of the Day');
    fireEvent.click(screen.getByRole('radio', { name: /Every day/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Add$|Add item|Save item/ }));
    await waitFor(() => expect(posted.length).toBe(1));
    expect(posted[0].body).toMatchObject({ kind: 'qotd', text: 'Answer my Question of the Day', scope: 'always' });
  });
});
