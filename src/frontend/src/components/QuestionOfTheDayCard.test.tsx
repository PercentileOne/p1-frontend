import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QuestionOfTheDayCard } from './QuestionOfTheDayCard';
import { questionOfTheDayApi } from '../api/questionOfTheDayApi';
import type { QuestionOfTheDay } from '../api/questionOfTheDayApi';

vi.mock('../api/questionOfTheDayApi', async () => {
  const actual = await vi.importActual<typeof import('../api/questionOfTheDayApi')>('../api/questionOfTheDayApi');
  return { ...actual, questionOfTheDayApi: { today: vi.fn(), answer: vi.fn(), setTopic: vi.fn(), swapToday: vi.fn() } };
});
const api = vi.mocked(questionOfTheDayApi);

const asked = (over: Partial<QuestionOfTheDay> = {}): QuestionOfTheDay => ({
  needsTopic: false, date: '2026-10-18', topic: 'Nurse', question: 'What does SBAR stand for?', options: ['A', 'B', 'C', 'D'],
  answered: false, selectedIndex: null, correctIndex: null, isCorrect: null, streak: 0, answeredTotal: 0, correctTotal: 0, ...over,
});

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => cleanup());

describe('QuestionOfTheDayCard', () => {
  it('shows the question, who wrote it and the four answers', async () => {
    api.today.mockResolvedValue(asked());
    render(<QuestionOfTheDayCard />);
    expect(await screen.findByText('What does SBAR stand for?')).toBeTruthy();
    expect(screen.getByText(/Written by TheInterviewChair/)).toBeTruthy();
    expect(screen.getByText('Answer today to start a streak')).toBeTruthy();
    expect(screen.getAllByRole('button').filter(b => ['A', 'B', 'C', 'D'].includes(b.textContent ?? '')).length).toBe(4);
  });

  it('records a tapped answer and then shows the right one and the streak', async () => {
    api.today.mockResolvedValue(asked());
    api.answer.mockResolvedValue(asked({ answered: true, selectedIndex: 1, correctIndex: 2, isCorrect: false, streak: 1, answeredTotal: 1, correctTotal: 0 }));
    render(<QuestionOfTheDayCard />);
    fireEvent.click(await screen.findByText('B'));
    await waitFor(() => expect(api.answer).toHaveBeenCalledWith(1));
    expect(await screen.findByText(/Correct answer/)).toBeTruthy();
    expect(screen.getByText(/Your answer/)).toBeTruthy();
    expect(screen.getByText(/1 day in a row/)).toBeTruthy();
    expect(screen.getByText(/Not this time/)).toBeTruthy();
  });

  it('does not let an answered question be answered again', async () => {
    api.today.mockResolvedValue(asked({ answered: true, selectedIndex: 2, correctIndex: 2, isCorrect: true, streak: 3, answeredTotal: 4, correctTotal: 3 }));
    render(<QuestionOfTheDayCard />);
    const right = await screen.findByText(/Correct answer/);
    expect((right.closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/3 days in a row/)).toBeTruthy();
    expect(screen.getByText(/3 of 4 right/)).toBeTruthy();
    expect(screen.getByText(/Nailed it/)).toBeTruthy();
  });

  it('asks for a topic when nothing could be worked out, then fetches the question', async () => {
    api.today.mockResolvedValueOnce(asked({ needsTopic: true, topic: null, question: null, options: null }));
    api.setTopic.mockResolvedValue({ topic: 'Kubernetes' });
    api.swapToday.mockResolvedValue(undefined);
    api.today.mockResolvedValueOnce(asked({ topic: 'Kubernetes' }));
    render(<QuestionOfTheDayCard />);
    fireEvent.change(await screen.findByLabelText(/question about each day/), { target: { value: ' Kubernetes ' } });
    fireEvent.click(screen.getByText('Get my question'));
    await waitFor(() => expect(api.setTopic).toHaveBeenCalledWith('Kubernetes'));
    expect(await screen.findByText('What does SBAR stand for?')).toBeTruthy();
  });

  it('will not save an empty topic', async () => {
    api.today.mockResolvedValue(asked({ needsTopic: true, topic: null, question: null, options: null }));
    render(<QuestionOfTheDayCard />);
    fireEvent.click(await screen.findByText('Get my question'));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Type a job or subject/);
    expect(api.setTopic).not.toHaveBeenCalled();
  });

  it('after answering, a changed topic applies tomorrow and today stays as it is', async () => {
    api.today.mockResolvedValue(asked({ answered: true, selectedIndex: 2, correctIndex: 2, isCorrect: true, streak: 1, answeredTotal: 1, correctTotal: 1 }));
    api.setTopic.mockResolvedValue({ topic: 'Pilot' });
    render(<QuestionOfTheDayCard />);
    fireEvent.click(await screen.findByText('Change topic'));
    fireEvent.change(screen.getByLabelText(/question about each day/), { target: { value: 'Pilot' } });
    fireEvent.click(screen.getByText('Get my question'));
    expect(await screen.findByText(/Tomorrow's question will be about Pilot/)).toBeTruthy();
    expect(api.swapToday).not.toHaveBeenCalled();
  });

  it('says so, and lets the person try again, when the question could not be made', async () => {
    api.today.mockRejectedValueOnce(new Error('Today\'s question could not be made just now. Try again in a minute.'));
    api.today.mockResolvedValueOnce(asked());
    render(<QuestionOfTheDayCard />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be made/);
    fireEvent.click(screen.getByText('Try again'));
    expect(await screen.findByText('What does SBAR stand for?')).toBeTruthy();
  });
});
