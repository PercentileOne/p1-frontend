import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { BookStrip } from './BookStrip';
import { fetchFeedBooks, fetchBookMarks, setBookSaved, searchBooks } from '../api/feedBooksApi';
import type { FeedBook } from '../api/feedBooksApi';

vi.mock('../api/feedBooksApi', async () => {
  const actual = await vi.importActual<typeof import('../api/feedBooksApi')>('../api/feedBooksApi');
  return { ...actual, fetchFeedBooks: vi.fn(), fetchBookMarks: vi.fn(), setBookSaved: vi.fn(), searchBooks: vi.fn() };
});
vi.mock('../api/flowLogger', () => ({ logEvent: vi.fn() }));
const fetchBooks = vi.mocked(fetchFeedBooks);
const fetchMarks = vi.mocked(fetchBookMarks);
const setSaved = vi.mocked(setBookSaved);
const search = vi.mocked(searchBooks);

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

  const typeAndSearch = (text: string) => {
    fireEvent.change(screen.getByLabelText('Search for a book'), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  };

  it('searches Open Library for a book that is not in our list and offers Amazon UK, but no bookmark', async () => {
    fetchBooks.mockResolvedValue([book(A)]);
    search.mockResolvedValue([{ id: '9780000000999', title: 'Marketing Made Simple', authors: 'Donald Miller', coverUrl: 'https://covers.openlibrary.org/b/id/9-L.jpg', url: 'https://openlibrary.org/works/OL9W', theme: '', why: '' }]);
    render(<BookStrip />);
    await screen.findByText('Worth a read');
    typeAndSearch('marketing');
    expect(await screen.findByText(/Results for “marketing”/)).toBeTruthy();
    expect(search).toHaveBeenCalledWith('marketing');
    expect(screen.getByText('Marketing Made Simple')).toBeTruthy();
    expect(screen.queryByLabelText(new RegExp(`^Book ${A}`))).toBeNull();   // our own book does not match, so it is not shown
    expect(screen.getByLabelText('Buy Marketing Made Simple on Amazon UK (affiliate link, opens in a new tab)').getAttribute('href')).toContain('tag=theinterviewc-21');
    expect(screen.queryByLabelText(/Add Marketing Made Simple to your reading list/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(await screen.findByLabelText(new RegExp(`^Book ${A}`))).toBeTruthy();
  });

  it('puts our own matches first, with their bookmark, and does not repeat them from Open Library', async () => {
    fetchBooks.mockResolvedValue([book(A, { title: 'Marketing Mine', authors: 'Me' })]);
    search.mockResolvedValue([
      { id: A, title: 'Marketing Mine', authors: 'Me', coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg', url: 'https://openlibrary.org/works/OL1W', theme: '', why: '' },
      { id: '9780000000999', title: 'Marketing Other', authors: 'You', coverUrl: 'https://covers.openlibrary.org/b/id/2-L.jpg', url: 'https://openlibrary.org/works/OL2W', theme: '', why: '' },
    ]);
    render(<BookStrip />);
    await screen.findByText('Worth a read');
    typeAndSearch('marketing');
    await screen.findByText('Marketing Other');
    expect(screen.getAllByText('Marketing Mine').length).toBe(1);
    expect(screen.getByLabelText(`Add Marketing Mine to your reading list`)).toBeTruthy();
    expect(screen.getAllByText('Amazon UK').length).toBe(2);
  });

  it('says so when nothing is found or the search fails, and ignores a search shorter than two letters', async () => {
    fetchBooks.mockResolvedValue([book(A)]);
    search.mockResolvedValueOnce([]);
    render(<BookStrip />);
    await screen.findByText('Worth a read');
    fireEvent.change(screen.getByLabelText('Search for a book'), { target: { value: 'x' } });
    expect((screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement).disabled).toBe(true);
    typeAndSearch('zzzz qqqq');
    expect(await screen.findByText(/No books found for “zzzz qqqq”/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    search.mockRejectedValueOnce(new Error('The book search did not answer just now. Try again in a minute.'));
    typeAndSearch('marketing');
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
