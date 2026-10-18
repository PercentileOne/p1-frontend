import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { DailyMoodChart } from './DailyMoodChart';
import { localDate } from '../api/routinesApi';
import { addDays } from '../utils/dateRange';

const today = localDate();
const ago = (n: number) => addDays(today, -n);
const moodUrls: string[] = [];
let moods: { date: string; rating: number }[] = [];
let summaries: { date: string; essentialsDone: number; essentialsTotal: number; done: number; total: number }[] = [];

beforeEach(() => {
  moodUrls.length = 0; moods = []; summaries = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/api/moods')) { moodUrls.push(url); return new Response(JSON.stringify(moods), { status: 200 }); }
    if (url.includes('/api/routines/month/')) return new Response(JSON.stringify(summaries), { status: 200 });
    return new Response('{}', { status: 200 });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('DailyMoodChart', () => {
  it('says how to start when no moods are recorded', async () => {
    render(<DailyMoodChart onOpenDay={vi.fn()} />);
    await screen.findByText(/No daily moods yet/);
  });

  it('shows the average of recorded days only, and how many days have a mood', async () => {
    moods = [{ date: ago(2), rating: 5 }, { date: ago(1), rating: 3 }, { date: today, rating: 4 }];
    render(<DailyMoodChart onOpenDay={vi.fn()} />);
    await screen.findByText('4.0 of 5');
    expect(screen.getByText('3 of 30')).toBeTruthy();
    expect(screen.getByText('average over 3 recorded days')).toBeTruthy();
  });

  it('compares essentials on good days and rough days when there are enough of each', async () => {
    moods = [
      { date: ago(6), rating: 5 }, { date: ago(5), rating: 4 }, { date: ago(4), rating: 1 }, { date: ago(3), rating: 2 },
    ];
    summaries = [
      { date: ago(6), essentialsDone: 4, essentialsTotal: 4, done: 4, total: 5 },
      { date: ago(5), essentialsDone: 3, essentialsTotal: 4, done: 3, total: 5 },
      { date: ago(4), essentialsDone: 1, essentialsTotal: 4, done: 1, total: 5 },
      { date: ago(3), essentialsDone: 0, essentialsTotal: 4, done: 0, total: 5 },
    ];
    render(<DailyMoodChart onOpenDay={vi.fn()} />);
    await screen.findByText(/On Good or Great days you did 88% of your essentials\. On Hard or Rough days, 13%\./);
  });

  it('opens the day when a point is clicked', async () => {
    moods = [{ date: ago(1), rating: 4 }];
    const onOpenDay = vi.fn();
    render(<DailyMoodChart onOpenDay={onOpenDay} />);
    const point = await screen.findByRole('button', { name: /Good\. Open this day\./ });
    fireEvent.click(point);
    expect(onOpenDay).toHaveBeenCalledWith(ago(1));
  });

  it('can show unrecorded days as faint Okay dots, without counting them', async () => {
    moods = [{ date: ago(1), rating: 5 }];
    const { container } = render(<DailyMoodChart onOpenDay={vi.fn()} />);
    await screen.findByText('5.0 of 5');
    expect(container.querySelectorAll('circle[fill="none"]').length).toBe(0);
    fireEvent.click(screen.getByLabelText(/Show unrecorded days as Okay/));
    expect(container.querySelectorAll('circle[fill="none"]').length).toBe(29);      // the 29 days with no mood
    expect(screen.getByText('5.0 of 5')).toBeTruthy();                              // the average is unchanged
  });

  it('asks for a longer stretch when a longer range is chosen', async () => {
    moods = [{ date: ago(1), rating: 4 }];
    render(<DailyMoodChart onOpenDay={vi.fn()} />);
    await screen.findByText('4.0 of 5');
    fireEvent.click(screen.getByText('Last 90 days'));
    await waitFor(() => expect(moodUrls.some(u => u.includes(`from=${ago(89)}`))).toBe(true));
  });
});
