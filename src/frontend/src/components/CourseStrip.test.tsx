import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { CourseStrip } from './CourseStrip';
import { fetchFeedCourses, fetchCourseMarks, setCourseSaved } from '../api/feedCoursesApi';
import type { FeedCourse } from '../api/feedCoursesApi';

vi.mock('../api/feedCoursesApi', async () => {
  const actual = await vi.importActual<typeof import('../api/feedCoursesApi')>('../api/feedCoursesApi');
  return { ...actual, fetchFeedCourses: vi.fn(), fetchCourseMarks: vi.fn(), setCourseSaved: vi.fn() };
});
vi.mock('../api/flowLogger', () => ({ logEvent: vi.fn() }));
const fetchCourses = vi.mocked(fetchFeedCourses);
const fetchMarks = vi.mocked(fetchCourseMarks);
const setSaved = vi.mocked(setCourseSaved);

const course = (id: string, over: Partial<FeedCourse> = {}): FeedCourse => ({
  id, title: `Course ${id}`, provider: 'Coursera', imageUrl: `https://img.example/${id}.png`, url: `https://www.coursera.org/learn/${id}`, theme: 'learning', why: `Why ${id}`, cost: 'free-to-audit', ...over,
});
const A = 'aaaaaaaaaaaaaaaaaaaa', B = 'bbbbbbbbbbbbbbbbbbbb';
const cardLink = (id: string) => new RegExp(`^Course ${id}, from .*Opens on the provider's site`);

beforeEach(() => {
  vi.clearAllMocks();
  fetchMarks.mockResolvedValue({ saved: [] });
  try { localStorage.clear(); } catch { /* fine */ }
});
afterEach(() => cleanup());

describe('CourseStrip', () => {
  it('shows nothing when there are no courses, or they could not load', async () => {
    fetchCourses.mockResolvedValue([]);
    const { container } = render(<CourseStrip />);
    await waitFor(() => expect(fetchCourses).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('shows a card per course that opens the provider\'s own page in a new tab, with the cost and our note', async () => {
    fetchCourses.mockResolvedValue([course(A), course(B, { provider: 'Harvard CS50', cost: 'free', url: 'https://cs50.harvard.edu/x/' })]);
    render(<CourseStrip />);
    expect(await screen.findByText('Courses worth taking')).toBeTruthy();
    const link = screen.getByLabelText(cardLink(A));
    expect(link.getAttribute('href')).toBe(`https://www.coursera.org/learn/${A}`);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.getByLabelText(cardLink(B)).getAttribute('href')).toBe('https://cs50.harvard.edu/x/');
    expect(screen.getByText(/Free to audit/)).toBeTruthy();
    expect(screen.getByText(/· Free$/)).toBeTruthy();
    expect(screen.getByText(`Why ${A}`)).toBeTruthy();
    expect(screen.getByText(/The note under each one is ours/)).toBeTruthy();
  });

  it('shows no cost label when an admin has not said, and works without a picture', async () => {
    fetchCourses.mockResolvedValue([course(A, { cost: '', imageUrl: '' })]);
    const { container } = render(<CourseStrip />);
    await screen.findByText('Courses worth taking');
    expect(screen.queryByText(/Free|Paid/)).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByText('Coursera').length).toBeGreaterThan(0);   // the provider's name stands in for the picture
  });

  it('filters by theme', async () => {
    fetchCourses.mockResolvedValue([course(A), course(B, { theme: 'software-and-cloud' })]);
    render(<CourseStrip />);
    await screen.findByText('Courses worth taking');
    fireEvent.click(screen.getByRole('button', { name: /^Software and cloud/ }));
    expect(screen.queryByLabelText(cardLink(A))).toBeNull();
    expect(screen.getByLabelText(cardLink(B))).toBeTruthy();
  });

  it('saves a course at once, lists it under Saved, and puts it back if the save fails', async () => {
    fetchCourses.mockResolvedValue([course(A), course(B)]);
    setSaved.mockResolvedValueOnce({ saved: [A] });
    render(<CourseStrip />);
    fireEvent.click(await screen.findByLabelText(`Save Course ${A} for later`));
    await screen.findByLabelText(`Remove Course ${A} from your saved courses`);
    expect(setSaved).toHaveBeenCalledWith(A, true);
    fireEvent.click(screen.getByRole('tab', { name: 'Saved (1)' }));
    expect(screen.queryByLabelText(cardLink(B))).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'All' }));

    setSaved.mockRejectedValueOnce(new Error('That did not save. Try again.'));
    fireEvent.click(screen.getByLabelText(`Save Course ${B} for later`));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByLabelText(`Save Course ${B} for later`)).toBeTruthy();
  });

  it('says the saved list is empty and private', async () => {
    fetchCourses.mockResolvedValue([course(A)]);
    render(<CourseStrip />);
    await screen.findByText('Courses worth taking');
    fireEvent.click(screen.getByRole('tab', { name: 'Saved (0)' }));
    expect(screen.getByText(/Only you can see this list/)).toBeTruthy();
  });

  it('folds away for the rest of the day, keeps Saved reachable, and opens again', async () => {
    fetchCourses.mockResolvedValue([course(A), course(B)]);
    fetchMarks.mockResolvedValue({ saved: [B] });
    const { unmount } = render(<CourseStrip />);
    fireEvent.click(await screen.findByLabelText('Hide courses until tomorrow'));
    expect(screen.queryByLabelText(cardLink(A))).toBeNull();
    expect(screen.getByRole('button', { name: 'Saved (1)' })).toBeTruthy();
    unmount();

    render(<CourseStrip />);   // a reload on the same day stays folded
    fireEvent.click(await screen.findByRole('button', { name: 'Show courses' }));
    expect(await screen.findByLabelText(cardLink(A))).toBeTruthy();
  });
});
