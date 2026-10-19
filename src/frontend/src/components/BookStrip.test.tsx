import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { BookStrip } from './BookStrip';
import { fetchFeedBooks, fetchBookMarks, setBookSaved } from '../api/feedBooksApi';
import type { FeedBook } from '../api/feedBooksApi';

vi.mock('../api/feedBooksApi', async () => {
  const actual = await vi.importActual<typeof import('../api/feedBooksApi')>('../api/feedBooksApi');
  return { ...actual, fetchFeedBooks: vi.fn(), fetchBookMarks: vi.fn(), setBookSaved: vi.fn() };
});
vi.mock('../api/flowLogger', () => ({ logEvent: vi.fn() }));
const fetchBooks = vi.mocked(fetchFeedBooks);
const fetchMarks = vi.mocked(fetchBookMarks);
const setSaved = vi.mocked(setBookSaved);

const book = (id: string, over: Partial<FeedBook> = {}): FeedBook => ({
  id, title: `Book ${id}`, authors: 'An Author', coverUrl: `https://covers.openlibrary.org/b/id/${id}-L.jpg`, url: `https://openlibrary.org/books/${id}`,
  theme: 'habits', why: `Why ${id}`, ...over,
});
const A = '9780000000001', B = '9780000000002';

beforeEach(() => {
  vi.clearAllMocks();
  fetchMarks.mockResolvedValue({ saved: [] });
  try { localStorage.clear(); } catch { /* fine */ }
});
afterEach(() => cleanup());

describe('BookStrip', () => {
  it('shows nothing when there are no books, or they could not load', async () => {
    fetchBooks.mockResolvedValue([]);
    const { container } = render(<BookStrip />);
    await waitFor(() => expect(fetchBooks).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('shows a cover card for each book that opens its Open Library page in a new tab, with our note under it', async () => {
    fetchBooks.mockResolvedValue([book(A), book(B, { authors: '' })]);
    render(<BookStrip />);
    expect(await screen.findByText('Worth a read')).toBeTruthy();
    const link = screen.getByLabelText(`Book ${A}, by An Author. Opens on Open Library in a new tab`);
    expect(link.getAttribute('href')).toBe(`https://openlibrary.org/books/${A}`);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.getByLabelText(`Book ${B}. Opens on Open Library in a new tab`)).toBeTruthy();
    expect(screen.getByText(`Why ${A}`)).toBeTruthy();
  });

  it('says the note is ours and discloses the Amazon affiliate links', async () => {
    fetchBooks.mockResolvedValue([book(A)]);
    render(<BookStrip />);
    await screen.findByText('Worth a read');
    expect(screen.getByText(/The note under each one is ours/)).toBeTruthy();
    expect(screen.getByText(/As an Amazon Associate we earn from qualifying purchases/)).toBeTruthy();
  });

  it('links each book to Amazon UK with the Associates tag, marked sponsored, and only Open Library and Amazon UK are linked', async () => {
    fetchBooks.mockResolvedValue([book('9781449373320'), book('9798664653403')]);
    render(<BookStrip />);
    await screen.findByText('Worth a read');
    const amazon = screen.getAllByText('Amazon UK') as HTMLAnchorElement[];
    expect(amazon.map(a => a.getAttribute('href'))).toEqual([
      'https://www.amazon.co.uk/dp/1449373321?tag=theinterviewc-21',
      'https://www.amazon.co.uk/s?k=9798664653403&tag=theinterviewc-21',
    ]);
    amazon.forEach(a => { expect(a.getAttribute('rel')).toContain('sponsored'); expect(a.getAttribute('target')).toBe('_blank'); });
    const hosts = new Set(screen.getAllByRole('link').map(a => new URL(a.getAttribute('href')!).host));
    expect([...hosts].sort()).toEqual(['openlibrary.org', 'www.amazon.co.uk']);
  });

  it('filters by theme and starts the row again', async () => {
    fetchBooks.mockResolvedValue([book(A), book(B, { theme: 'learning' })]);
    render(<BookStrip />);
    await screen.findByText('Worth a read');
    fireEvent.click(screen.getByRole('button', { name: /^Learning/ }));
    expect(screen.queryByLabelText(new RegExp(`^Book ${A}.*Opens on Open Library`))).toBeNull();
    expect(screen.getByLabelText(new RegExp(`^Book ${B}.*Opens on Open Library`))).toBeTruthy();
  });

  it('adds a book to the reading list at once, lists it under Reading list, and puts it back if the save fails', async () => {
    fetchBooks.mockResolvedValue([book(A), book(B)]);
    setSaved.mockResolvedValueOnce({ saved: [A] });
    render(<BookStrip />);
    fireEvent.click(await screen.findByLabelText(`Add Book ${A} to your reading list`));
    await screen.findByLabelText(`Remove Book ${A} from your reading list`);
    expect(setSaved).toHaveBeenCalledWith(A, true);
    expect(screen.getByRole('tab', { name: 'Reading list (1)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Reading list (1)' }));
    expect(screen.queryByLabelText(new RegExp(`^Book ${B}.*Opens on Open Library`))).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'All' }));

    setSaved.mockRejectedValueOnce(new Error('That did not save. Try again.'));
    fireEvent.click(screen.getByLabelText(`Add Book ${B} to your reading list`));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByLabelText(`Add Book ${B} to your reading list`)).toBeTruthy();
  });

  it('says the reading list is empty and private', async () => {
    fetchBooks.mockResolvedValue([book(A)]);
    render(<BookStrip />);
    await screen.findByText('Worth a read');
    fireEvent.click(screen.getByRole('tab', { name: 'Reading list (0)' }));
    expect(screen.getByText(/Only you can see this list/)).toBeTruthy();
  });

  it('folds away for the rest of the day, keeps the reading list reachable, and opens again', async () => {
    fetchBooks.mockResolvedValue([book(A), book(B)]);
    fetchMarks.mockResolvedValue({ saved: [B] });
    const { unmount } = render(<BookStrip />);
    fireEvent.click(await screen.findByLabelText('Hide books until tomorrow'));
    expect(screen.queryByLabelText(new RegExp(`^Book ${A}.*Opens on Open Library`))).toBeNull();
    expect(screen.getByRole('button', { name: 'Reading list (1)' })).toBeTruthy();
    unmount();

    render(<BookStrip />);   // a reload on the same day stays folded
    fireEvent.click(await screen.findByRole('button', { name: 'Show books' }));
    expect(await screen.findByLabelText(new RegExp(`^Book ${A}.*Opens on Open Library`))).toBeTruthy();
  });
});
