import { useCallback, useEffect, useState } from 'react';
import { fetchBookMarks, setBookSaved } from '../api/feedBooksApi';
import type { FeedBook } from '../api/feedBooksApi';
import { logEvent } from '../api/flowLogger';

// A person's private "Want to read" list for the books strip. Optimistic: the bookmark changes at once and goes back with a short message if the save fails.
export function useBookMarks() {
  const [saved, setSaved] = useState<string[]>([]);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    let alive = true;
    void fetchBookMarks().then(m => { if (alive) setSaved(m.saved); });
    return () => { alive = false; };
  }, []);

  const toggle = useCallback(async (b: FeedBook) => {
    let was = false;
    setProblem('');
    setSaved(s => { was = s.includes(b.id); return was ? s.filter(id => id !== b.id) : [b.id, ...s]; });
    if (!was) logEvent('feed_book_save', { metadata: { id: b.id, theme: b.theme } });
    try { setSaved((await setBookSaved(b.id, !was)).saved); }
    catch (e) {
      setSaved(s => was ? [b.id, ...s.filter(id => id !== b.id)] : s.filter(id => id !== b.id));
      setProblem((e as Error).message);
    }
  }, []);

  return { saved, problem, toggle };
}
