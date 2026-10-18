import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { NotesSearch, searchTerms } from './NotesSearch';
import type { SearchResult } from '../api/planningApi';

const hits: SearchResult[] = [
  { kind: 'day', date: '2026-10-17', endDate: '', cadence: '', id: '', title: 'Notes for this day', snippet: 'Met Mukesh in London. I must study more on Marketing.', field: 'Notes for this day' },
  { kind: 'review', date: '2026-10-12', endDate: '2026-10-18', cadence: 'weekly', id: '', title: 'Review', snippet: 'Study marketing every day', field: 'Priorities' },
  { kind: 'goal', date: '2026-10-10', endDate: '', cadence: '', id: 'g1', title: 'Learn marketing basics', snippet: 'Finish the course', field: 'Goal' },
];
const urls: string[] = [];
let reply: SearchResult[] = hits;

beforeEach(() => {
  urls.length = 0; reply = hits;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => { urls.push(url); return new Response(JSON.stringify(reply), { status: 200 }); }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function Harness({ onOpen }: { onOpen: (r: SearchResult) => void }) {
  const [q, setQ] = useState('');
  return <NotesSearch query={q} onQueryChange={setQ} onOpen={onOpen} />;
}

describe('searchTerms', () => {
  it('lower-cases, drops repeats and caps at six', () => {
    expect(searchTerms('  Marketing  STUDY marketing ')).toEqual(['marketing', 'study']);
    expect(searchTerms('a b c d e f g h')).toHaveLength(6);
  });
});

describe('NotesSearch', () => {
  it('waits for two characters before searching', async () => {
    render(<Harness onOpen={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Search your notes, reviews and goals'), { target: { value: 'm' } });
    await new Promise(r => setTimeout(r, 500));
    expect(urls).toHaveLength(0);
  });

  it('shows what was found, with each searched word picked out', async () => {
    render(<Harness onOpen={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Search your notes, reviews and goals'), { target: { value: 'marketing' } });
    await screen.findByText('3 results, newest first');
    expect(urls[0]).toContain('/api/notes-search?q=marketing');
    expect(screen.getAllByText('Marketing', { selector: 'mark' }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Weekly review · 12 Oct 2026 · Priorities/)).toBeTruthy();
    expect(screen.getByText(/Day note · 17 Oct 2026/)).toBeTruthy();
  });

  it('opens the result you click', async () => {
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    fireEvent.change(screen.getByLabelText('Search your notes, reviews and goals'), { target: { value: 'marketing' } });
    fireEvent.click(await screen.findByText(/Met Mukesh in London/));
    expect(onOpen).toHaveBeenCalledWith(hits[0]);
  });

  it('says so when nothing matches, and clears with the X', async () => {
    reply = [];
    render(<Harness onOpen={vi.fn()} />);
    const box = screen.getByLabelText('Search your notes, reviews and goals') as HTMLInputElement;
    fireEvent.change(box, { target: { value: 'zebra' } });
    await screen.findByText(/Nothing found for “zebra”/);
    fireEvent.click(screen.getByLabelText('Clear search'));
    await waitFor(() => expect(box.value).toBe(''));
    expect(screen.queryByText(/Nothing found/)).toBeNull();
  });
});
