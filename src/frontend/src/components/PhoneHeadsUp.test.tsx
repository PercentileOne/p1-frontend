import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PhoneHeadsUp } from './PhoneHeadsUp';

const auth = { token: 'abc' as string | null };
vi.mock('../auth/authStore', () => ({ useAuthStore: (sel: (s: { token: string | null }) => unknown) => sel(auth) }));

function setDevice(phone: boolean) {
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: () => ({ matches: phone }) });
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: phone ? 5 : 0 });
}
const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><PhoneHeadsUp /></MemoryRouter>);

describe('PhoneHeadsUp', () => {
  beforeEach(() => { auth.token = 'abc'; localStorage.clear(); });
  afterEach(() => cleanup());

  it('shows on a phone for a signed-in person in the portal', () => {
    setDevice(true);
    at('/dashboard');
    expect(screen.getByText(/Best on a laptop or tablet for now/)).toBeTruthy();
  });

  it('stays away on a laptop, when signed out, on the public demo and inside a live room', () => {
    setDevice(false); at('/dashboard'); expect(screen.queryByText(/Best on a laptop/)).toBeNull(); cleanup();
    setDevice(true); auth.token = null; at('/dashboard'); expect(screen.queryByText(/Best on a laptop/)).toBeNull(); cleanup();
    auth.token = 'abc'; at('/try'); expect(screen.queryByText(/Best on a laptop/)).toBeNull(); cleanup();
    at('/interview/abc123'); expect(screen.queryByText(/Best on a laptop/)).toBeNull();
  });

  it('can be dismissed and then stays away on this device', () => {
    setDevice(true);
    at('/dashboard');
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText(/Best on a laptop/)).toBeNull();
    cleanup();
    at('/dashboard');
    expect(screen.queryByText(/Best on a laptop/)).toBeNull();
  });
});
