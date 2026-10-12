import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import LearnAlertsPage from './LearnAlertsPage';

// People typed a Special Focus topic ("Violence reduction") and never pressed Enter, so it was silently ignored (Francis, 2026-10-12). A typed topic must now be kept
// when the person taps "+ Add" or simply moves on to another field.
vi.mock('../api/learnAlertsApi', () => ({
  listLearnAlerts: vi.fn(async () => []),
  fetchLearnAlertsSummary: vi.fn(async () => ({ totalSent: 0, totalCorrect: 0, bestCurrentStreak: 0, bestLongestStreak: 0 })),
  createLearnAlert: vi.fn(), updateLearnAlert: vi.fn(), deleteLearnAlert: vi.fn(), resetLearnAlert: vi.fn(),
}));
vi.mock('../api/aiScoring', () => ({ generateHotTopics: vi.fn(async () => []) }));

async function openForm() {
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) });
  render(<LearnAlertsPage />);
  fireEvent.click(await screen.findByText(/New Alert/));
  return screen.getByPlaceholderText(/type it, then press Enter or tap Add/i) as HTMLInputElement;
}

describe('Special Focus topic entry', () => {
  afterEach(() => cleanup());

  it('offers a + Add button once something is typed, and keeps the topic when it is tapped', async () => {
    const input = await openForm();
    expect(screen.queryByText('+ Add')).toBeNull();
    fireEvent.change(input, { target: { value: 'Violence reduction' } });
    fireEvent.click(screen.getByText('+ Add'));
    await waitFor(() => expect(screen.getByLabelText('Remove Violence reduction')).toBeTruthy());
    expect(input.value).toBe('');
  });

  it('keeps a typed topic when the person moves on without pressing Enter', async () => {
    const input = await openForm();
    fireEvent.change(input, { target: { value: 'Socratic method' } });
    fireEvent.blur(input);
    await waitFor(() => expect(screen.getByLabelText('Remove Socratic method')).toBeTruthy());
  });
});
