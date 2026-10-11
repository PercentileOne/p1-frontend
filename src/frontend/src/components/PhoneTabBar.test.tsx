import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { PhoneTabBar } from './PhoneTabBar';
import LearnAlertsPage from '../pages/LearnAlertsPage';

const Icon = () => <svg />;

describe('PhoneTabBar', () => {
  afterEach(() => cleanup());

  const props = () => ({
    main: [
      { label: 'Dashboard', short: 'Home', Icon },
      { label: 'Learn Alerts', short: 'Alerts', Icon },
      { label: 'Messages', short: 'Messages', Icon },
      { label: 'Job Interviews', short: 'Interviews', Icon },
    ],
    more: [{ label: 'My Profile', Icon }, { label: 'Settings', Icon }],
    active: 'Dashboard',
    onNavigate: vi.fn(),
    userName: 'Francis Cobbinah',
    needsPlan: false,
    onAccount: vi.fn(),
    onSignOut: vi.fn(),
  });

  it('shows the four everyday places and opens the rest from More', () => {
    const p = props();
    render(<PhoneTabBar {...p} />);
    for (const name of ['Home', 'Alerts', 'Messages', 'Interviews', 'More']) expect(screen.getByText(name)).toBeTruthy();
    fireEvent.click(screen.getByText('Alerts'));
    expect(p.onNavigate).toHaveBeenCalledWith('Learn Alerts');

    fireEvent.click(screen.getByText('More'));
    fireEvent.click(screen.getByText('My Profile'));
    expect(p.onNavigate).toHaveBeenCalledWith('My Profile');
    expect(screen.queryByRole('dialog')).toBeNull(); // the sheet closes after choosing
  });

  it('offers account and sign out in the sheet', () => {
    const p = props();
    render(<PhoneTabBar {...p} />);
    fireEvent.click(screen.getByText('More'));
    fireEvent.click(screen.getByLabelText('Sign out'));
    expect(p.onSignOut).toHaveBeenCalledTimes(1);
  });
});

vi.mock('../api/learnAlertsApi', () => ({
  listLearnAlerts: vi.fn(async () => [{
    id: 'a1', candidateId: 'c', candidateEmail: 'x@y.z', candidateName: 'X', jobTitle: 'Head of Prime Brokerage Technology', difficulty: 'Pro', specialFocus: ['Agentic AI Patterns'],
    intervalHours: 24, durationMonths: 1, visibility: 'hidden', status: 'active', createdAt: '', nextSendAt: '', sentCount: 4, correctCount: 3, currentStreak: 2, longestStreak: 3,
  }]),
  fetchLearnAlertsSummary: vi.fn(async () => ({ totalSent: 4, totalCorrect: 3, bestCurrentStreak: 2, bestLongestStreak: 3 })),
  createLearnAlert: vi.fn(), updateLearnAlert: vi.fn(), deleteLearnAlert: vi.fn(), resetLearnAlert: vi.fn(),
}));
vi.mock('../api/aiScoring', () => ({ generateHotTopics: vi.fn(async () => []) }));

describe('Learn Alerts on a phone', () => {
  afterEach(() => cleanup());

  function setWidth(phone: boolean) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true, writable: true,
      value: () => ({ matches: phone, addEventListener: () => {}, removeEventListener: () => {} }),
    });
  }

  it('shows each alert as a card with thumb-sized actions, not the wide table', async () => {
    setWidth(true);
    const { container } = render(<LearnAlertsPage />);
    await waitFor(() => expect(screen.getByText('Head of Prime Brokerage Technology')).toBeTruthy());
    expect(container.querySelector('table')).toBeNull();
    expect(screen.getByText('Pause')).toBeTruthy();
    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('3/4 correct')).toBeTruthy();
  });

  it('keeps the table on a laptop', async () => {
    setWidth(false);
    const { container } = render(<LearnAlertsPage />);
    await waitFor(() => expect(screen.getByText('Head of Prime Brokerage Technology')).toBeTruthy());
    expect(container.querySelector('table')).not.toBeNull();
  });
});
