import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MoodChart } from './MoodChart';
import type { Review } from '../api/planningApi';

const review = (periodStart: string, rating: number): Review => ({
  cadence: 'weekly', periodStart, periodEnd: periodStart, rating, wentWell: '', didntGoWell: '', learned: '', notes: '', priorities: [], updatedAt: 'x',
});
const weeks = (ratings: number[]): Review[] => ratings.map((r, i) => {
  const d = new Date(2026, 0, 5 + i * 7);   // Mondays from 5 Jan 2026
  return review(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, r);
});
afterEach(() => cleanup());

describe('MoodChart', () => {
  it('asks for a first rating when there are none', () => {
    render(<MoodChart reviews={[review('2026-10-12', 0)]} cadence="weekly" currentStart="2026-10-12" onOpen={vi.fn()} />);
    expect(screen.getByText(/Rate how a week felt in your review/)).toBeTruthy();
  });

  it('asks for one more when only one is rated', () => {
    render(<MoodChart reviews={[review('2026-10-12', 4)]} cadence="weekly" currentStart="2026-10-12" onOpen={vi.fn()} />);
    expect(screen.getByText(/One week rated so far/)).toBeTruthy();
  });

  it('shows the average, the best and the hardest, leaving unrated reviews out', () => {
    render(<MoodChart reviews={[...weeks([2, 4, 5, 3]), review('2026-03-02', 0)]} cadence="weekly" currentStart="2026-01-05" onOpen={vi.fn()} />);
    expect(screen.getByText('3.5 of 5')).toBeTruthy();                       // (2+4+5+3)/4
    expect(screen.getByText('average over 4 weeks')).toBeTruthy();
    expect(screen.getByText(/best: week of 19 Jan 2026/)).toBeTruthy();
    expect(screen.getByText(/hardest: week of 5 Jan 2026/)).toBeTruthy();
  });

  it('colours the points green, amber and red', () => {
    const { container } = render(<MoodChart reviews={weeks([1, 2, 3, 4, 5, 5])} cadence="weekly" currentStart="2026-01-05" onOpen={vi.fn()} />);
    expect(container.querySelectorAll('circle[fill="#34D399"]').length).toBe(3);   // 4, 5, 5
    expect(container.querySelectorAll('circle[fill="#F5B942"]').length).toBe(1);   // 3
    expect(container.querySelectorAll('circle[fill="#F87171"]').length).toBe(2);   // 1, 2
  });

  it('opens a review when its point is clicked or chosen from the keyboard', () => {
    const onOpen = vi.fn();
    render(<MoodChart reviews={weeks([3, 4, 2])} cadence="weekly" currentStart="2026-01-05" onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /week of 12 Jan 2026: Good/ }));
    expect(onOpen).toHaveBeenCalledWith('2026-01-12');
    fireEvent.keyDown(screen.getByRole('button', { name: /week of 19 Jan 2026: Hard/ }), { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledWith('2026-01-19');
  });

  it('shows the last 26 until asked for all of them', () => {
    const many = weeks(Array.from({ length: 40 }, (_, i) => (i % 5) + 1));
    render(<MoodChart reviews={many} cadence="weekly" currentStart={many[39].periodStart} onOpen={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /Open this review/ })).toHaveLength(26);
    fireEvent.click(screen.getByText('Show all 40'));
    expect(screen.getAllByRole('button', { name: /Open this review/ })).toHaveLength(40);
    expect(screen.getByText('Show the last 26')).toBeTruthy();
  });

  it('words months and years in their own terms', () => {
    const months: Review[] = [{ ...review('2026-08-01', 2), cadence: 'monthly' }, { ...review('2026-09-01', 4), cadence: 'monthly' }];
    render(<MoodChart reviews={months} cadence="monthly" currentStart="2026-09-01" onOpen={vi.fn()} />);
    expect(screen.getByText('average over 2 months')).toBeTruthy();
    expect(screen.getByText(/best: September 2026/)).toBeTruthy();
  });
});
