import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { FeedLeftPanels, FeedRightPanels, initialsOf } from './FeedSidePanels';
import WorkFeedPage from '../pages/WorkFeedPage';
import { timeAgo } from '../api/feedNewsApi';
import { fetchIndustryNews } from '../api/feedNewsApi';
import { nextInterviewApi } from '../api/nextInterviewApi';
import { questionOfTheDayApi } from '../api/questionOfTheDayApi';
import type { QuestionOfTheDay } from '../api/questionOfTheDayApi';
import type { NextInterview } from '../api/nextInterviewApi';
import { localDate } from '../api/routinesApi';
import { useAuthStore } from '../auth/authStore';

vi.mock('../api/feedNewsApi', async () => {
  const actual = await vi.importActual<typeof import('../api/feedNewsApi')>('../api/feedNewsApi');
  return { ...actual, fetchIndustryNews: vi.fn() };
});
vi.mock('../api/nextInterviewApi', async () => {
  const actual = await vi.importActual<typeof import('../api/nextInterviewApi')>('../api/nextInterviewApi');
  return { ...actual, nextInterviewApi: { ...actual.nextInterviewApi, all: vi.fn() } };
});
vi.mock('../api/questionOfTheDayApi', async () => {
  const actual = await vi.importActual<typeof import('../api/questionOfTheDayApi')>('../api/questionOfTheDayApi');
  return { ...actual, questionOfTheDayApi: { today: vi.fn(), answer: vi.fn(), setTopic: vi.fn(), swapToday: vi.fn() } };
});
vi.mock('../api/feedVideosApi', async () => {
  const actual = await vi.importActual<typeof import('../api/feedVideosApi')>('../api/feedVideosApi');
  return { ...actual, fetchFeedVideos: vi.fn(async () => []), fetchVideoMarks: vi.fn(async () => ({ saved: [], liked: [], shareLikes: false })) };
});
vi.mock('../api/flowLogger', () => ({ logEvent: vi.fn() }));

const news = vi.mocked(fetchIndustryNews);
const allInterviews = vi.mocked(nextInterviewApi.all);
const today = vi.mocked(questionOfTheDayApi.today);

const plus = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localDate(d); };
const interview = (over: Partial<NextInterview> = {}): NextInterview => ({ id: 'i1', date: plus(3), role: 'Software Architect', company: 'Acme', source: 'self', ...over });
const qotd = (over: Partial<QuestionOfTheDay> = {}): QuestionOfTheDay => ({
  needsTopic: false, date: localDate(), topic: 'Software and Cloud', question: 'What is idempotency?', options: ['A', 'B', 'C', 'D'],
  answered: false, selectedIndex: null, correctIndex: null, isCorrect: null, streak: 4, answeredTotal: 11, correctTotal: 8, ...over,
});
const headline = (n: number) => ({ tag: 'Startups', headline: `Headline ${n}`, source: 'Example News', url: `https://example.com/${n}`, publishedAt: new Date(Date.now() - n * 3600_000).toISOString() });

function stubMatchMedia(wide: boolean) {
  vi.stubGlobal('matchMedia', vi.fn((q: string) => ({ matches: wide && q.includes('min-width'), media: q, addEventListener: () => {}, removeEventListener: () => {} })));
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: 'tok', user: { id: 'u1', name: 'Francis Cobbinah', email: 'f@example.com' } as never });
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/summary')
    ? new Response(JSON.stringify({ exists: true, summary: { essentialsDone: 2, essentialsTotal: 4, done: 3, total: 9 } }), { status: 200 })
    : new Response('{}', { status: 200 }))));
  news.mockResolvedValue([headline(1), headline(2), headline(3)]);
  allInterviews.mockResolvedValue([interview()]);
  today.mockResolvedValue(qotd());
  try { localStorage.clear(); } catch { /* fine */ }
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('the Feed side panels', () => {
  it('names you and shows your real streak, count and next interview', () => {
    render(<FeedLeftPanels qotd={qotd()} nextInterview={interview()} routine={null} onNavigate={() => {}} />);
    expect(screen.getByText('Francis Cobbinah')).toBeTruthy();
    expect(screen.getByText('FC')).toBeTruthy();
    expect(screen.getByText('Aiming for: Software and Cloud')).toBeTruthy();
    expect(screen.getByText('4 days')).toBeTruthy();
    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.getByText('in 3 days')).toBeTruthy();
  });

  it('says "None yet" for no interview and holds its place while the question loads', () => {
    render(<FeedLeftPanels qotd={null} nextInterview={null} routine={null} />);
    expect(screen.getByText('None yet')).toBeTruthy();
    expect(screen.getAllByText('…').length).toBe(2);
  });

  it('shows routine progress with a way into My Routines, or invites you to set one up', () => {
    const go = vi.fn();
    const { rerender } = render(<FeedLeftPanels qotd={qotd()} nextInterview={null} routine={{ essentialsDone: 2, essentialsTotal: 4, done: 3, total: 9 }} onNavigate={go} />);
    expect(screen.getByText('2 of 4 essentials done today')).toBeTruthy();
    fireEvent.click(screen.getByText(/Open My Routines/));
    expect(go).toHaveBeenCalledWith('My Routines');
    rerender(<FeedLeftPanels qotd={qotd()} nextInterview={null} routine={null} onNavigate={go} />);
    expect(screen.getByText(/Set up your routine/)).toBeTruthy();
  });

  it('uses all items when a day has no essentials', () => {
    render(<FeedLeftPanels qotd={null} nextInterview={null} routine={{ essentialsDone: 0, essentialsTotal: 0, done: 3, total: 9 }} />);
    expect(screen.getByText('3 of 9 items done today')).toBeTruthy();
  });

  it('opens your profile from the profile card', () => {
    const go = vi.fn();
    render(<FeedLeftPanels qotd={null} nextInterview={null} routine={null} onNavigate={go} />);
    fireEvent.click(screen.getByText(/My profile/));
    expect(go).toHaveBeenCalledWith('My Profile');
  });

  it('shows what is coming up on the right: the next interview and today\'s routine', async () => {
    render(<FeedRightPanels nextInterview={interview({ role: 'Nurse', company: '' })} routine={{ essentialsDone: 1, essentialsTotal: 3, done: 1, total: 5 }} />);
    expect(screen.getByText('Nurse')).toBeTruthy();
    expect(screen.getByText(/Today's routine: 1 of 3 essentials/)).toBeTruthy();
    await screen.findByText('Headline 1');
  });

  it('shows real headlines as links that open in a new tab, with source and age', async () => {
    render(<FeedRightPanels nextInterview={null} routine={null} />);
    const link = (await screen.findByText('Headline 2')).closest('a')!;
    expect(link.getAttribute('href')).toBe('https://example.com/2');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.textContent).toMatch(/Example News · 2 h ago/);
    expect(screen.getAllByRole('link').length).toBe(3);
  });

  it('says so, plainly, when the news cannot be reached', async () => {
    news.mockResolvedValue([]);
    render(<FeedRightPanels nextInterview={null} routine={null} />);
    expect(await screen.findByText(/could not be reached just now/)).toBeTruthy();
  });

  it('with no interview, points to the Dashboard to add one', async () => {
    const go = vi.fn();
    render(<FeedRightPanels nextInterview={null} routine={null} onNavigate={go} />);
    await screen.findByText('Headline 1');
    fireEvent.click(screen.getByText(/Go to Dashboard/));
    expect(go).toHaveBeenCalledWith('Dashboard');
  });

  it('describes how the feed works without claiming anything that is not built', async () => {
    render(<FeedRightPanels nextInterview={null} routine={null} />);
    const note = await screen.findByText(/official channel and is checked when it is added/);
    expect(note.textContent).not.toMatch(/learns|hide/i);
  });
});

describe('initials and times', () => {
  it('takes the first and last initial', () => {
    expect(initialsOf('Francis Cobbinah')).toBe('FC');
    expect(initialsOf('  madonna ')).toBe('M');
    expect(initialsOf('Ana María de la Cruz')).toBe('AC');
    expect(initialsOf('')).toBe('?');
    expect(initialsOf(undefined)).toBe('?');
  });

  it('says how long ago a headline was', () => {
    const now = Date.parse('2026-10-19T12:00:00Z');
    expect(timeAgo('2026-10-19T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-10-19T11:30:00Z', now)).toBe('30 min ago');
    expect(timeAgo('2026-10-19T09:00:00Z', now)).toBe('3 h ago');
    expect(timeAgo('2026-10-17T12:00:00Z', now)).toBe('2 days ago');
    expect(timeAgo('2026-10-18T13:00:00Z', now)).toBe('23 h ago');
    expect(timeAgo('2026-10-18T12:00:00Z', now)).toBe('1 day ago');
    expect(timeAgo('not a date', now)).toBe('');
  });
});

describe('the Feed page layout', () => {
  it('has the feed in the middle with a column on each side on a wide screen', async () => {
    stubMatchMedia(true);
    const { container } = render(<WorkFeedPage onNavigate={() => {}} />);
    await screen.findByText('Aiming for: Software and Cloud');
    const grid = container.querySelector('main')!.parentElement as HTMLElement;
    expect(grid.style.display).toBe('grid');
    expect(grid.style.gridTemplateColumns).toBe('250px minmax(0, 1fr) 270px');
    const order = (label: string) => (container.querySelector(`[aria-label="${label}"]`) as HTMLElement).style.order;
    expect([order('You'), order('Your feed'), order('Coming up and news')]).toEqual(['1', '2', '3']);
  });

  it('puts the feed first and the panels after it on a narrower screen', async () => {
    stubMatchMedia(false);
    const { container } = render(<WorkFeedPage onNavigate={() => {}} />);
    await screen.findByText('Aiming for: Software and Cloud');
    const wrap = container.querySelector('main')!.parentElement as HTMLElement;
    expect(wrap.style.display).toBe('flex');
    const order = (label: string) => (container.querySelector(`[aria-label="${label}"]`) as HTMLElement).style.order;
    expect([order('Your feed'), order('You'), order('Coming up and news')]).toEqual(['1', '2', '3']);
  });

  it('shows your streak from today\'s question in the left panel without asking for it twice', async () => {
    stubMatchMedia(true);
    render(<WorkFeedPage />);
    await screen.findByText('4 days');
    await waitFor(() => expect(today).toHaveBeenCalledTimes(1));
  });

  it('shows your next interview on both sides, and today\'s routine on the right', async () => {
    stubMatchMedia(true);
    render(<WorkFeedPage />);
    await screen.findByText('Software Architect at Acme');
    expect(screen.getAllByText('in 3 days').length).toBe(2);   // the countdown in the left stat and in Coming up
    expect(await screen.findByText(/Today's routine: 2 of 4 essentials/)).toBeTruthy();
  });
});
