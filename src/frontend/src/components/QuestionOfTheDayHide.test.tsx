import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QuestionOfTheDayCard } from './QuestionOfTheDayCard';
import { questionOfTheDayApi } from '../api/questionOfTheDayApi';
import type { QuestionOfTheDay } from '../api/questionOfTheDayApi';
import { localDate } from '../api/routinesApi';

vi.mock('../api/questionOfTheDayApi', async () => {
  const actual = await vi.importActual<typeof import('../api/questionOfTheDayApi')>('../api/questionOfTheDayApi');
  return { ...actual, questionOfTheDayApi: { today: vi.fn(), answer: vi.fn(), setTopic: vi.fn(), swapToday: vi.fn() } };
});
const api = vi.mocked(questionOfTheDayApi);

const asked = (over: Partial<QuestionOfTheDay> = {}): QuestionOfTheDay => ({
  needsTopic: false, date: '2026-10-19', topic: 'Nurse', question: 'What does SBAR stand for?', options: ['A', 'B', 'C', 'D'],
  answered: false, selectedIndex: null, correctIndex: null, isCorrect: null, streak: 0, answeredTotal: 0, correctTotal: 0, ...over,
});
const answeredWrong = () => asked({ answered: true, selectedIndex: 1, correctIndex: 2, isCorrect: false, streak: 3, answeredTotal: 5, correctTotal: 2 });

beforeEach(() => { vi.clearAllMocks(); try { localStorage.clear(); } catch { /* fine */ } });
afterEach(() => cleanup());

describe('Question of the Day: hiding it once answered', () => {
  it('cannot be hidden before it is answered', async () => {
    api.today.mockResolvedValue(asked());
    render(<QuestionOfTheDayCard />);
    await screen.findByText('What does SBAR stand for?');
    expect(screen.queryByText('Hide until tomorrow')).toBeNull();
  });

  it('can be hidden after a wrong answer, and folds to one line with the streak', async () => {
    api.today.mockResolvedValue(answeredWrong());
    render(<QuestionOfTheDayCard />);
    fireEvent.click(await screen.findByText('Hide until tomorrow'));
    expect(screen.queryByText('What does SBAR stand for?')).toBeNull();
    expect(screen.getByText('Question of the Day')).toBeTruthy();
    expect(screen.getByText(/3 days in a row/)).toBeTruthy();
    expect(screen.getByText('Show again')).toBeTruthy();
  });

  it('stays hidden for the rest of the day, and Show again brings it back', async () => {
    api.today.mockResolvedValue(answeredWrong());
    const first = render(<QuestionOfTheDayCard />);
    fireEvent.click(await screen.findByText('Hide until tomorrow'));
    first.unmount();

    render(<QuestionOfTheDayCard />);
    fireEvent.click(await screen.findByText('Show again'));
    expect(await screen.findByText('What does SBAR stand for?')).toBeTruthy();
    expect(screen.getByText('Hide until tomorrow')).toBeTruthy();
  });

  it('is shown again tomorrow, with the new question', async () => {
    try { localStorage.setItem('tic_qotd_hidden', '2000-01-01'); } catch { /* fine */ }
    api.today.mockResolvedValue(answeredWrong());
    render(<QuestionOfTheDayCard />);
    expect(await screen.findByText('What does SBAR stand for?')).toBeTruthy();
    expect(screen.queryByText('Show again')).toBeNull();
  });

  it('is never hidden by a hide remembered for an unanswered question', async () => {
    try { localStorage.setItem('tic_qotd_hidden', localDate()); } catch { /* fine */ }
    api.today.mockResolvedValue(asked());   // today's question has not been answered yet
    render(<QuestionOfTheDayCard />);
    expect(await screen.findByText('What does SBAR stand for?')).toBeTruthy();
  });

  it('on the Dashboard version, goes entirely once answered and hidden', async () => {
    api.today.mockResolvedValue(answeredWrong());
    const { container } = render(<QuestionOfTheDayCard hideWhenDone />);
    fireEvent.click(await screen.findByText('Hide until tomorrow'));
    await waitFor(() => expect(container.textContent).toBe(''));
  });

  it('offers a way into the Feed when given one', async () => {
    api.today.mockResolvedValue(asked());
    const open = vi.fn();
    render(<QuestionOfTheDayCard onOpenFeed={open} />);
    fireEvent.click(await screen.findByText(/More in your Feed/));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('keeps the way into the Feed on an unanswered Dashboard card', async () => {
    api.today.mockResolvedValue(asked());
    render(<QuestionOfTheDayCard hideWhenDone spaced onOpenFeed={() => {}} />);
    expect(await screen.findByText(/More in your Feed/)).toBeTruthy();
  });
});
