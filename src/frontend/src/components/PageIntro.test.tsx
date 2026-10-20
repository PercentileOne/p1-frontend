import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PageIntro, showAllPageIntros, PAGE_INTRO_PREFIX } from './PageIntro';
import { PAGE_INTROS } from '../help/pageIntros';

beforeEach(() => { try { localStorage.clear(); } catch { /* fine */ } });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('PageIntro', () => {
  it('shows the description with an accessible name', () => {
    render(<PageIntro label="My Talks" text="Practice a talk out loud." />);
    expect(screen.getByLabelText('About My Talks')).toBeTruthy();
    expect(screen.getByText('Practice a talk out loud.')).toBeTruthy();
  });

  it('offers the help article only when there is one, and opens it', () => {
    const open = vi.fn();
    const { rerender } = render(<PageIntro label="Learn" text="Type any topic." />);
    expect(screen.queryByText(/See how it works/)).toBeNull();
    rerender(<PageIntro label="Learn" text="Type any topic." article={{ id: 'learn-course' }} onOpen={open} />);
    fireEvent.click(screen.getByText(/See how it works/));
    expect(open).toHaveBeenCalledWith('learn-course');
  });

  it('hides when dismissed, stays hidden for that page, and does not hide other pages', () => {
    const { unmount } = render(<PageIntro label="Feed" text="Your daily feed." />);
    fireEvent.click(screen.getByLabelText('Hide this description'));
    expect(screen.queryByText('Your daily feed.')).toBeNull();
    unmount();
    render(<PageIntro label="Feed" text="Your daily feed." />);
    expect(screen.queryByText('Your daily feed.')).toBeNull();
    render(<PageIntro label="Job Interviews" text="Practice interviews." />);
    expect(screen.getByText('Practice interviews.')).toBeTruthy();
  });

  it('brings every description back and says how many were hidden', () => {
    const a = render(<PageIntro label="Feed" text="A" />); fireEvent.click(screen.getByLabelText('Hide this description')); a.unmount();
    const b = render(<PageIntro label="Certifications & Exams" text="B" />); fireEvent.click(screen.getByLabelText('Hide this description')); b.unmount();
    localStorage.setItem('tic.other', 'keep');
    expect(showAllPageIntros()).toBe(2);
    expect(localStorage.getItem('tic.other')).toBe('keep');
    render(<PageIntro label="Feed" text="A again" />);
    expect(screen.getByText('A again')).toBeTruthy();
    expect(Object.keys(localStorage).filter(k => k.startsWith(PAGE_INTRO_PREFIX))).toEqual([]);
  });

  it('still shows (and does not crash) when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<PageIntro label="Feed" text="Your daily feed." />);
    expect(screen.getByText('Your daily feed.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Hide this description'));
    expect(screen.queryByText('Your daily feed.')).toBeNull();   // hides for this visit even though it cannot be remembered
  });
});

describe('the page descriptions', () => {
  const pages = ['Dashboard', 'Feed', 'Job Interviews', 'My Talks', 'Interview Preps', 'My Career Coach', 'Careers Explorer', 'CV Analysis', 'Certifications & Exams', 'Jobs', 'Messages',
    'My Routines', 'My Profile', 'Learn', 'Learn Alerts', 'Question Bank', 'Interview Gifts', 'Settings'];

  it('covers every menu page except Demo and Help', () => {
    expect(Object.keys(PAGE_INTROS).sort()).toEqual([...pages].sort());
  });

  it('keeps each one short, plain and in house style', () => {
    for (const [label, text] of Object.entries(PAGE_INTROS)) {
      expect(text.length, label).toBeGreaterThan(40);
      expect(text.length, label).toBeLessThanOrEqual(320);
      expect(text, label).not.toMatch(/—|–/);                 // no dashes used as pauses
      expect(text, label).not.toMatch(/\bpractise/i);          // house spelling is "practice"
      expect(text.trim(), label).toMatch(/[.?]$/);
    }
  });

  it('says plainly that Jobs and Messages are examples for now', () => {
    expect(PAGE_INTROS['Jobs']).toMatch(/coming soon/i);
    expect(PAGE_INTROS['Jobs']).toMatch(/examples/i);
    expect(PAGE_INTROS['Messages']).toMatch(/coming soon/i);
    expect(PAGE_INTROS['Messages']).toMatch(/examples/i);
  });
});
